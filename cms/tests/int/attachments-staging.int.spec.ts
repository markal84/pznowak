// @vitest-environment node
/**
 * Zdjęcia od klientów na bazie stagingowej (Neon branch `staging`): prawdziwy Payload, Postgres, migracja
 * zlecenia B i siteverify Cloudflare z kluczami testowymi; pliki w katalogu na dysku (`ATTACHMENTS_STORAGE=local`,
 * osobny przedrostek na każde uruchomienie). Uruchamianie: `npm run test:int:staging`. Po testach zgłoszenia,
 * liczniki i pliki są usuwane.
 */
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { rm, utimes } from 'node:fs/promises'
import path from 'node:path'

import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { handleUpload, handleView, type UploadDeps } from '@/lib/attachments/handler'
import {
  expireOldAttachments,
  finalizeStaleUploads,
  removeOrphanFiles,
  uploadDeps,
  viewDeps,
} from '@/lib/attachments/server'
import { localDiskStorage } from '@/lib/attachments/storage'
import { listAttachments } from '@/lib/attachments/store'
import type { SubmissionSettings } from '@/lib/submissions/config'
import { deriveKey, hashIp } from '@/lib/submissions/form-token'
import { handleSubmission, type SubmissionResponse } from '@/lib/submissions/handler'
import { submissionDeps } from '@/lib/submissions/server'
import { drizzleOf } from '@/lib/submissions/store'
import type { Submission } from '@/payload-types'
import { heicFixture, jpeg, jpegWithGps } from './helpers/images'
import {
  APP_SECRET,
  DUMMY_TOKEN,
  formTokenAged,
  stagingDatabaseOrSkipReason,
  submissionRequest,
  testLimits,
  testSettings,
  validContactData,
} from './helpers/submissions'

// Ten sam magazyn dla endpointów i hooka usuwania zgłoszeń (hook czyta go ze zmiennych środowiskowych).
process.env.ATTACHMENTS_STORAGE = 'local'

const skipReason = stagingDatabaseOrSkipReason()
const RUN = `test-${randomUUID().slice(0, 8)}`
const PREFIX = `zgloszenia-${RUN}/`
const ROOT = path.resolve(process.cwd(), '.zalaczniki-lokalne')
const storage = localDiskStorage(ROOT)

let payload: Payload
const createdIds = new Set<number>()

const ns = (name: string) => `${RUN}:${name}:`
const ipHashOf = (ip: string) => hashIp(ip, deriveKey(APP_SECRET, 'ip-hash'))
const settingsFor = (name: string, limits: Parameters<typeof testLimits>[0] = {}) =>
  testSettings({
    attachmentsEnabled: true,
    namespace: ns(name),
    limits: testLimits({ perIpHour: 100, perDay: 1000, ...limits }),
  })

async function submit(settings: SubmissionSettings, ip: string, sizes: number[], overrides = {}) {
  const pending: Promise<void>[] = []
  const deps = submissionDeps(
    async () => payload,
    settings,
    (task) => void pending.push(task()),
    storage,
  )
  deps.log = () => undefined
  const response = await handleSubmission(
    submissionRequest(
      {
        form: 'kontakt',
        formToken: formTokenAged('kontakt', Date.now(), 30_000),
        turnstileToken: DUMMY_TOKEN,
        honeypot: '',
        data: validContactData({
          topic: 'nowy',
          occasionText: 'zaręczyny',
          message: `${RUN} zdjęcia`,
        }),
        ...(sizes.length ? { attachments: sizes.map((size) => ({ size })) } : {}),
        ...overrides,
      },
      { ip },
    ),
    deps,
  )
  await Promise.all(pending)
  const body = (await response.json()) as SubmissionResponse
  return {
    status: response.status,
    body,
    tokens:
      body.attachments?.status === 'upload' ? body.attachments.uploads.map((u) => u.token) : [],
  }
}

function deps(settings: SubmissionSettings) {
  const pending: Promise<void>[] = []
  const notified: number[] = []
  const base = uploadDeps(
    async () => payload,
    settings,
    (task) => void pending.push(task()),
    storage,
  )
  const d: UploadDeps = {
    ...base,
    prefix: PREFIX,
    afterCompletion: async (id, context) => {
      notified.push(id)
      await base.afterCompletion(id, context)
    },
    log: () => undefined,
  }
  return { deps: d, settle: () => Promise.all(pending), notified }
}

async function upload(d: UploadDeps, token: string, bytes: Buffer, name = 'IMG_0001.HEIC') {
  const response = await handleUpload(
    new Request('http://localhost:3000/api/zgloszenia/zalaczniki', {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        host: 'localhost:3000',
        'x-upload-token': token,
        'x-file-name': encodeURIComponent(name),
        'content-length': String(bytes.length),
      },
      body: new Uint8Array(bytes),
    }),
    d,
  )
  return { status: response.status, body: (await response.json()) as { code: string } }
}

async function rowsForIp(ip: string): Promise<Submission[]> {
  const result = await payload.find({
    collection: 'submissions',
    where: { 'meta.ipHash': { equals: ipHashOf(ip) } },
    sort: 'createdAt',
    depth: 0,
    limit: 100,
    overrideAccess: true,
  })
  result.docs.forEach((doc) => createdIds.add(doc.id))
  return result.docs
}

const submission = async (id: number) =>
  (await payload.findByID({
    collection: 'submissions',
    id,
    depth: 0,
    overrideAccess: true,
  })) as Submission

const onDisk = (pathname: string) => existsSync(path.join(ROOT, pathname))

const shiftCreatedAt = (id: number, interval: string) =>
  drizzleOf(payload).execute(
    sql`UPDATE "cms_submissions" SET "created_at" = now() - ${interval}::interval WHERE "id" = ${id}`,
  )

describe.skipIf(skipReason)('zdjęcia od klientów na bazie stagingowej', () => {
  beforeAll(async () => {
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    payload = await getPayload({ config })
  }, 120_000)

  afterAll(async () => {
    if (!payload) return
    if (createdIds.size) {
      await payload.delete({
        collection: 'submissions',
        where: { id: { in: [...createdIds] } },
        overrideAccess: true,
      })
    }
    await drizzleOf(payload).execute(
      sql`DELETE FROM "cms_limit_counters" WHERE "bucket" LIKE ${`${RUN}:%`}`,
    )
    await rm(path.join(ROOT, PREFIX), { recursive: true, force: true })
    await payload.destroy()
  }, 60_000)

  it('pełna ścieżka: zgłoszenie z 2 zdjęciami (JPEG z GPS i HEIC) → komplet, pliki bez EXIF, jedno powiadomienie', async () => {
    const ip = '198.51.100.201'
    const settings = settingsFor('pelna')
    const gps = await jpegWithGps()
    const heic = heicFixture()
    const sent = await submit(settings, ip, [gps.length, heic.length])
    expect(sent.status).toBe(201)
    expect(sent.tokens).toHaveLength(2)
    const [row] = await rowsForIp(ip)
    expect(row).toMatchObject({
      attachmentsState: 'uploading',
      attachmentsDeclared: 2,
      notification: 'pending',
    })

    const { deps: d, settle, notified } = deps(settings)
    expect((await upload(d, sent.tokens[0], gps, 'pierscionek.jpg')).status).toBe(201)
    expect((await submission(row.id)).attachmentsState).toBe('uploading')
    expect((await upload(d, sent.tokens[1], heic)).status).toBe(201)
    await settle()

    const after = await submission(row.id)
    expect(after).toMatchObject({
      attachmentsState: 'complete',
      attachmentsCount: 2,
      notification: 'skipped',
    })
    expect(notified).toEqual([row.id])
    const files = await listAttachments(payload, row.id)
    expect(files.map((f) => [f.slot, f.state, f.detectedType, f.originalName])).toEqual([
      [1, 'stored', 'jpeg', 'pierscionek.jpg'],
      [2, 'stored', 'heic', 'IMG_0001.HEIC'],
    ])
    for (const file of files) {
      expect(file.path!.startsWith(`${PREFIX}${row.id}/`)).toBe(true)
      expect(onDisk(file.path!) && onDisk(file.thumbPath!)).toBe(true)
      const object = await storage.get(file.path!)
      const bytes = Buffer.from(await new Response(object!.body).arrayBuffer())
      expect((await sharp(bytes).metadata()).exif).toBeUndefined()
    }
    // Bilet zużyty: ponowne użycie na prawdziwej bazie.
    expect((await upload(d, sent.tokens[0], gps)).status).toBe(409)
  })

  it('równoległe żądania z tym samym biletem: dokładnie jeden plik w bazie i na dysku', async () => {
    const ip = '198.51.100.202'
    const settings = settingsFor('wyscig')
    const bytes = await jpeg(400, 300)
    const sent = await submit(settings, ip, [bytes.length])
    const { deps: d, settle, notified } = deps(settings)
    const results = await Promise.all(
      Array.from({ length: 6 }, () => upload(d, sent.tokens[0], bytes)),
    )
    await settle()
    expect(results.filter((r) => r.status === 201)).toHaveLength(1)
    expect(results.filter((r) => r.status === 409)).toHaveLength(5)
    const [row] = await rowsForIp(ip)
    expect((await submission(row.id)).attachmentsCount).toBe(1)
    const files: string[] = []
    for await (const object of storage.list(`${PREFIX}${row.id}/`)) files.push(object.pathname)
    expect(files).toHaveLength(2) // zdjęcie i miniatura
    expect(notified).toEqual([row.id])
  })

  it('limit plików z IP na dobę przy równoległych zgłoszeniach: dokładnie tyle zgłoszeń ze zdjęciami, ile mieści limit', async () => {
    const ip = '198.51.100.203'
    const settings = settingsFor('limit-ip', { attachmentFilesPerIpDay: 4 })
    const results = await Promise.all(
      Array.from({ length: 8 }, () => submit(settings, ip, [1000, 1000])),
    )
    expect(results.every((r) => r.status === 201)).toBe(true)
    expect(results.filter((r) => r.body.attachments?.status === 'upload')).toHaveLength(2)
    expect(results.filter((r) => r.body.attachments?.status === 'refused_limit')).toHaveLength(6)
    const rows = await rowsForIp(ip)
    expect(rows).toHaveLength(8)
    expect(rows.filter((r) => r.attachmentsState === 'uploading')).toHaveLength(2)
    const counter = await drizzleOf(payload).execute(
      sql`SELECT "hits" FROM "cms_limit_counters" WHERE "bucket" LIKE ${`${ns('limit-ip')}zalaczniki-ip:%`}`,
    )
    expect(Number(counter.rows[0].hits)).toBe(4)
  })

  it('limit rozmiaru z IP na dobę (1 MB): drugie zgłoszenie z 600 KB idzie bez zdjęć', async () => {
    const ip = '198.51.100.204'
    const settings = settingsFor('limit-kb', { attachmentMbPerIpDay: 1 })
    expect((await submit(settings, ip, [600 * 1024])).body.attachments?.status).toBe('upload')
    expect((await submit(settings, ip, [600 * 1024])).body.attachments?.status).toBe(
      'refused_limit',
    )
    await rowsForIp(ip)
  })

  it('bez Turnstile: 403, w bazie nic (ani zgłoszenia, ani miejsc na pliki)', async () => {
    const ip = '198.51.100.205'
    const sent = await submit(settingsFor('bez-turnstile'), ip, [1000], { turnstileToken: '' })
    expect(sent.status).toBe(403)
    expect(sent.tokens).toHaveLength(0)
    expect(await rowsForIp(ip)).toHaveLength(0)
  })

  it('porzucone przesyłanie: po czasie brakujący plik „nie dotarł”, zgłoszenie niepełne, powiadomienie wychodzi', async () => {
    const ip = '198.51.100.206'
    const settings = settingsFor('porzucone')
    const bytes = await jpeg()
    const sent = await submit(settings, ip, [bytes.length, bytes.length])
    const { deps: d, settle } = deps(settings)
    expect((await upload(d, sent.tokens[0], bytes)).status).toBe(201)
    await settle()
    const [row] = await rowsForIp(ip)
    expect((await submission(row.id)).notification).toBe('pending')

    // Świeże przesyłanie nie jest ruszane.
    await finalizeStaleUploads(payload, {
      now: new Date(),
      settings,
      origin: 'http://localhost:3000',
    })
    expect((await submission(row.id)).attachmentsState).toBe('uploading')
    await shiftCreatedAt(row.id, '30 minutes')
    await finalizeStaleUploads(payload, {
      now: new Date(),
      settings,
      origin: 'http://localhost:3000',
    })
    expect(await submission(row.id)).toMatchObject({
      attachmentsState: 'incomplete',
      attachmentsCount: 1,
      notification: 'skipped',
    })
    expect((await listAttachments(payload, row.id)).map((f) => f.state)).toEqual([
      'stored',
      'missing',
    ])
    // Bilet do brakującego pliku już nic nie zapisze.
    expect((await upload(d, sent.tokens[1], bytes)).status).toBe(409)
  })

  it('retencja: zdjęcia zgłoszenia sprzed 7 miesięcy usunięte z magazynu; z „Zachowaj zdjęcia” zostają', async () => {
    const settings = settingsFor('retencja')
    const bytes = await jpeg()
    const ids: number[] = []
    for (const ip of ['198.51.100.207', '198.51.100.208']) {
      const sent = await submit(settings, ip, [bytes.length])
      const { deps: d, settle } = deps(settings)
      expect((await upload(d, sent.tokens[0], bytes)).status).toBe(201)
      await settle()
      const [row] = await rowsForIp(ip)
      await shiftCreatedAt(row.id, '7 months')
      ids.push(row.id)
    }
    const [expiring, kept] = ids
    await payload.update({
      collection: 'submissions',
      id: kept,
      data: { attachmentsKeep: true },
      overrideAccess: true,
    })
    const [expiringFile] = await listAttachments(payload, expiring)
    const [keptFile] = await listAttachments(payload, kept)

    expect(await expireOldAttachments(payload, storage, new Date())).toBeGreaterThanOrEqual(1)
    expect(onDisk(expiringFile.path!) || onDisk(expiringFile.thumbPath!)).toBe(false)
    expect(await submission(expiring)).toMatchObject({
      attachmentsState: 'expired',
      attachmentsCount: 0,
    })
    expect((await listAttachments(payload, expiring))[0]).toMatchObject({
      state: 'expired',
      path: null,
    })
    expect(onDisk(keptFile.path!)).toBe(true)
    expect((await submission(kept)).attachmentsState).toBe('complete')
  })

  it('osierocone pliki: stare bez wiersza w bazie usunięte; świeże, przypisane i z innego przedrostka zostają', async () => {
    const ip = '198.51.100.209'
    const settings = settingsFor('sieroty')
    const bytes = await jpeg()
    const sent = await submit(settings, ip, [bytes.length])
    const { deps: d, settle } = deps(settings)
    await upload(d, sent.tokens[0], bytes)
    await settle()
    const [row] = await rowsForIp(ip)
    const [kept] = await listAttachments(payload, row.id)

    const oldOrphan = `${PREFIX}sierota/stary.jpg`
    const freshOrphan = `${PREFIX}sierota/swiezy.jpg`
    const otherPrefix = `zgloszenia-inne-${RUN}/stary.jpg`
    for (const pathname of [oldOrphan, freshOrphan, otherPrefix])
      await storage.put(pathname, bytes, 'image/jpeg')
    const twoHoursAgo = new Date(Date.now() - 2 * 3600_000)
    for (const pathname of [oldOrphan, otherPrefix, kept.path!])
      await utimes(path.join(ROOT, pathname), twoHoursAgo, twoHoursAgo)

    expect(await removeOrphanFiles(payload, storage, { now: new Date(), prefix: PREFIX })).toBe(1)
    expect(onDisk(oldOrphan)).toBe(false)
    expect(onDisk(freshOrphan)).toBe(true)
    expect(onDisk(otherPrefix)).toBe(true)
    expect(onDisk(kept.path!)).toBe(true)
    await rm(path.join(ROOT, `zgloszenia-inne-${RUN}`), { recursive: true, force: true })
  })

  it('usunięcie zgłoszenia w panelu usuwa wiersze i pliki (RODO)', async () => {
    const ip = '198.51.100.210'
    const settings = settingsFor('usuniecie')
    const bytes = await jpeg()
    const sent = await submit(settings, ip, [bytes.length])
    const { deps: d, settle } = deps(settings)
    await upload(d, sent.tokens[0], bytes)
    await settle()
    const [row] = await rowsForIp(ip)
    const [file] = await listAttachments(payload, row.id)
    expect(onDisk(file.path!)).toBe(true)

    await payload.delete({ collection: 'submissions', id: row.id, overrideAccess: true })
    createdIds.delete(row.id)
    expect(await listAttachments(payload, row.id)).toHaveLength(0)
    expect(onDisk(file.path!) || onDisk(file.thumbPath!)).toBe(false)
  })

  it('podgląd bez sesji panelu (prawdziwe sprawdzenie logowania Payloada): 404', async () => {
    const ip = '198.51.100.211'
    const settings = settingsFor('podglad')
    const bytes = await jpeg()
    const sent = await submit(settings, ip, [bytes.length])
    const { deps: d, settle } = deps(settings)
    await upload(d, sent.tokens[0], bytes)
    await settle()
    const [row] = await rowsForIp(ip)
    const [file] = await listAttachments(payload, row.id)
    const view = viewDeps(async () => payload, storage)
    const attempts: Array<Record<string, string>> = [
      {},
      { cookie: 'payload-token=podrobiony.jwt.token' },
      { authorization: 'JWT podrobiony' },
    ]
    for (const headers of attempts) {
      const response = await handleView(
        new Request(`http://localhost:3000/api/zgloszenia/zalaczniki/${file.id}`, { headers }),
        file.id,
        view,
      )
      expect(response.status).toBe(404)
    }
  })
})
