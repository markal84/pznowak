// @vitest-environment node
/**
 * Zdjęcia od klientów na atrapach (bez bazy i bez magazynu w chmurze): zapowiedź plików w zgłoszeniu i bilety,
 * przesyłanie plików (bilety, typy, rozmiary, wyścigi), podgląd tylko z sesją panelu, sprzątanie i treść maila.
 * Te same ścieżki na prawdziwej bazie: attachments-staging.int.spec.ts.
 */
import { randomUUID } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

import {
  cleanFileName,
  handleCleanup,
  handleUpload,
  handleView,
  type UploadDeps,
} from '@/lib/attachments/handler'
import { processImage } from '@/lib/attachments/image'
import { ATTACHMENT_RULES, sniffImageType } from '@/lib/attachments/rules'
import { memoryStorage } from '@/lib/attachments/storage'
import type {
  AttachmentRow,
  AttachmentState,
  CompletionState,
  StoredData,
} from '@/lib/attachments/store'
import { issueUploadToken } from '@/lib/attachments/token'
import { deriveKey } from '@/lib/submissions/form-token'
import {
  handleSubmission,
  type AcceptedSubmission,
  type SubmissionDeps,
  type SubmissionResponse,
} from '@/lib/submissions/handler'
import type { LimitBucket } from '@/lib/submissions/limits'
import { buildStudioMail, type NotifiedSubmission } from '@/lib/submissions/notify'
import type { SubmissionDraft } from '@/lib/submissions/store'
import { siteverifyReachable, verifyTurnstile } from '@/lib/submissions/turnstile'
import { HTML_PAYLOAD, disguised, jpeg, jpegWithGps, pngBomb, polyglot } from './helpers/images'
import {
  APP_SECRET,
  DUMMY_TOKEN,
  formTokenAged,
  submissionRequest,
  testLimits,
  testSettings,
  validContactData,
  validCreatorData,
} from './helpers/submissions'

const NOW = Date.parse('2026-10-21T18:00:00Z')
const UPLOAD_KEY = deriveKey(APP_SECRET, 'upload-token')

/** Liczniki w pamięci o semantyce Postgresa: wszystkie albo żaden, licznik zwiększany o `amount`. */
function memoryLimits() {
  const hits = new Map<string, number>()
  const consume = vi.fn(async (buckets: LimitBucket[]) => {
    const blocked = buckets.find((b) => (hits.get(b.key) ?? 0) + (b.amount ?? 1) > b.limit)
    if (blocked) return { ok: false as const, bucket: blocked }
    for (const b of buckets) hits.set(b.key, (hits.get(b.key) ?? 0) + (b.amount ?? 1))
    return { ok: true as const }
  })
  return { hits, consume }
}

const contactBody = (overrides: Record<string, unknown> = {}) => ({
  form: 'kontakt',
  formToken: formTokenAged('kontakt', NOW, 30_000),
  turnstileToken: DUMMY_TOKEN,
  honeypot: '',
  data: validContactData({ topic: 'nowy', occasionText: 'zaręczyny', message: 'Taki jak na zdjęciu.' }),
  ...overrides,
})

function submissionSetup(
  overrides: Partial<SubmissionDeps> = {},
  settings = testSettings({ attachmentsEnabled: true }),
) {
  const limits = memoryLimits()
  const inserted: SubmissionDraft[] = []
  const accepted: AcceptedSubmission[] = []
  const createSlots = vi.fn(async (_id: number, sizes: number[]) =>
    sizes.map(() => ({ id: randomUUID() })),
  )
  const markUnavailable = vi.fn(async () => undefined)
  const turnstile = vi.fn(async () => ({ ok: true as const, testing: true }))
  const deps: SubmissionDeps = {
    settings,
    now: () => NOW,
    verifyTurnstile: turnstile,
    siteverifyReachable: vi.fn(async () => true),
    consumeLimits: limits.consume,
    insertDraft: vi.fn(async (draft: SubmissionDraft) => {
      inserted.push(draft)
      return { id: inserted.length }
    }),
    afterAccepted: vi.fn(async (submission) => {
      accepted.push(submission)
    }),
    attachments: { createSlots, markUnavailable },
    defer: (task) => void task(),
    log: () => undefined,
    ...overrides,
  }
  return { deps, limits, inserted, accepted, createSlots, markUnavailable, turnstile }
}

async function submit(deps: SubmissionDeps, body: Record<string, unknown>, ip = '203.0.113.7') {
  const response = await handleSubmission(submissionRequest(body, { ip }), deps)
  return { status: response.status, body: (await response.json()) as SubmissionResponse }
}

const files = (...sizes: number[]) => sizes.map((size) => ({ size }))

describe('zgłoszenie z zapowiedzią zdjęć', () => {
  it('przełącznik wyłączony: pole pominięte, zgłoszenie jak przed zmianą (bez biletów)', async () => {
    const { deps, inserted, createSlots, limits } = submissionSetup({}, testSettings())
    const { status, body } = await submit(deps, contactBody({ attachments: files(1000, 2000) }))
    expect(status).toBe(201)
    expect(body.attachments).toBeUndefined()
    expect(inserted[0].attachmentsState).toBe('none')
    expect(inserted[0].attachmentsDeclared).toBe(0)
    expect(createSlots).not.toHaveBeenCalled()
    expect(limits.consume.mock.calls[0][0].every((b) => b.scope !== 'attachments')).toBe(true)
  })

  it('kreator: pole pominięte (zdjęcia tylko w formularzu kontaktowym)', async () => {
    const { deps, inserted, createSlots } = submissionSetup()
    const { status, body } = await submit(deps, {
      form: 'kreator',
      formToken: formTokenAged('kreator', NOW, 30_000),
      turnstileToken: DUMMY_TOKEN,
      honeypot: '',
      data: validCreatorData(),
      attachments: files(1000),
    })
    expect(status).toBe(201)
    expect(body.attachments).toBeUndefined()
    expect(inserted[0].attachmentsState).toBe('none')
    expect(createSlots).not.toHaveBeenCalled()
  })

  it('dwa zdjęcia: 201, dwa bilety, szkic „przesyłanie”, liczniki plików i kilobajtów zużyte', async () => {
    const { deps, inserted, accepted, createSlots, limits } = submissionSetup()
    const { status, body } = await submit(deps, contactBody({ attachments: files(500_000, 1_200_000) }))
    expect(status).toBe(201)
    expect(body.attachments).toMatchObject({ status: 'upload' })
    const uploads = body.attachments?.status === 'upload' ? body.attachments.uploads : []
    expect(uploads).toHaveLength(2)
    expect(createSlots).toHaveBeenCalledWith(1, [500_000, 1_200_000])
    expect(inserted[0]).toMatchObject({ attachmentsState: 'uploading', attachmentsDeclared: 2 })
    expect(accepted[0].attachmentsState).toBe('uploading')
    const buckets = limits.consume.mock.calls[0][0]
    const attachmentBuckets = buckets.filter((b) => b.scope === 'attachments')
    expect(attachmentBuckets.map((b) => b.amount)).toEqual([2, 489 + 1172, 2, 489 + 1172])
    // Bilet: podpisany, z terminem 15 minut.
    const [, , expiresAt] = uploads[0].token.split('.')
    expect(Number(expiresAt)).toBe(NOW + ATTACHMENT_RULES.uploadTokenTtlMs)
  })

  it.each([
    ['6 plików', files(1, 2, 3, 4, 5, 6)],
    ['plik ponad 4 MB', files(4 * 1024 * 1024 + 1)],
    ['zła lista', 'zdjecia'],
  ])('%s: 400 przy polu, bez Turnstile, limitów i zapisu', async (_name, attachments) => {
    const { deps, inserted, turnstile, limits } = submissionSetup()
    const { status, body } = await submit(deps, contactBody({ attachments }))
    expect(status).toBe(400)
    expect(body.code).toBe('invalid')
    expect(body.fields?.attachments).toBeTruthy()
    expect(turnstile).not.toHaveBeenCalled()
    expect(limits.consume).not.toHaveBeenCalled()
    expect(inserted).toHaveLength(0)
  })

  it('bez tokenu Turnstile: odrzucone, żadnych biletów (upload bez Turnstile niemożliwy)', async () => {
    const { deps, createSlots, inserted } = submissionSetup({
      verifyTurnstile: (args) =>
        verifyTurnstile({ ...args, secret: 'sekret', allowTestingKeys: true }),
    })
    const { status, body } = await submit(
      deps,
      contactBody({ turnstileToken: '', attachments: files(1000) }),
    )
    expect(status).toBe(403)
    expect(body.attachments).toBeUndefined()
    expect(createSlots).not.toHaveBeenCalled()
    expect(inserted).toHaveLength(0)
  })

  it('kwarantanna (Cloudflare nie odpowiada): zgłoszenie przyjęte bez zdjęć, bez biletów i liczników plików', async () => {
    const network = vi.fn(async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch
    const options = { secret: 'sekret', fetchImpl: network, timeoutMs: 20, retryDelayMs: 1 }
    const { deps, inserted, createSlots, limits } = submissionSetup({
      verifyTurnstile: (args) => verifyTurnstile({ ...args, ...options, allowTestingKeys: true }),
      siteverifyReachable: () => siteverifyReachable(options),
    })
    const { status, body } = await submit(deps, contactBody({ attachments: files(1000, 2000) }))
    expect(status).toBe(201)
    expect(body.attachments).toEqual({ status: 'refused_quarantine' })
    expect(inserted[0]).toMatchObject({
      verification: 'quarantine',
      attachmentsState: 'refused_quarantine',
      attachmentsDeclared: 2,
    })
    expect(createSlots).not.toHaveBeenCalled()
    expect(limits.consume.mock.calls.flat(2).some((b) => b.scope === 'attachments')).toBe(false)
  })

  it('bez magazynu plików: zgłoszenie przyjęte bez zdjęć („magazyn niedostępny”)', async () => {
    const { deps, inserted } = submissionSetup({ attachments: undefined })
    const { status, body } = await submit(deps, contactBody({ attachments: files(1000) }))
    expect(status).toBe(201)
    expect(body.attachments).toEqual({ status: 'refused_unavailable' })
    expect(inserted[0].attachmentsState).toBe('refused_unavailable')
  })

  it('limit plików z IP na dobę: kolejne zgłoszenie przechodzi, ale bez zdjęć; limit zgłoszeń liczony raz', async () => {
    const { deps, inserted, limits } = submissionSetup(
      {},
      testSettings({ attachmentsEnabled: true, limits: testLimits({ attachmentFilesPerIpDay: 3 }) }),
    )
    expect((await submit(deps, contactBody({ attachments: files(1000, 1000) }))).body.attachments)
      .toMatchObject({ status: 'upload' })
    const second = await submit(deps, contactBody({ attachments: files(1000, 1000) }))
    expect(second.status).toBe(201)
    expect(second.body.attachments).toEqual({ status: 'refused_limit' })
    expect(inserted[1].attachmentsState).toBe('refused_limit')
    // Zgłoszenia z tego IP w tej godzinie: dokładnie 2 (drugie nie zużyło limitu dwa razy).
    const ipKey = [...limits.hits.keys()].find((k) => k.startsWith('ip:'))!
    expect(limits.hits.get(ipKey)).toBe(2)
    // Inne IP nadal może dołączyć zdjęcia.
    const other = await submit(deps, contactBody({ attachments: files(1000) }), '198.51.100.20')
    expect(other.body.attachments).toMatchObject({ status: 'upload' })
  })

  it('limit kilobajtów z IP na dobę: 2 × 600 KB przy limicie 1 MB → drugie bez zdjęć', async () => {
    const { deps } = submissionSetup(
      {},
      testSettings({ attachmentsEnabled: true, limits: testLimits({ attachmentMbPerIpDay: 1 }) }),
    )
    expect((await submit(deps, contactBody({ attachments: files(600 * 1024) }))).body.attachments)
      .toMatchObject({ status: 'upload' })
    expect((await submit(deps, contactBody({ attachments: files(600 * 1024) }))).body.attachments)
      .toEqual({ status: 'refused_limit' })
  })

  it('wyczerpany limit zgłoszeń: 429 jak dotąd, mimo wolnego limitu plików', async () => {
    const { deps } = submissionSetup(
      {},
      testSettings({ attachmentsEnabled: true, limits: testLimits({ perIpHour: 1 }) }),
    )
    await submit(deps, contactBody({ attachments: files(1000) }))
    const { status, body } = await submit(deps, contactBody({ attachments: files(1000) }))
    expect(status).toBe(429)
    expect(body.code).toBe('rate_limited')
  })

  it('błąd przy zakładaniu miejsc na pliki: zgłoszenie zostaje, klient dostaje prośbę o e-mail', async () => {
    const { deps, markUnavailable, accepted } = submissionSetup()
    deps.attachments!.createSlots = vi.fn(async () => {
      throw new Error('baza')
    })
    const { status, body } = await submit(deps, contactBody({ attachments: files(1000) }))
    expect(status).toBe(201)
    expect(body.attachments).toEqual({ status: 'refused_unavailable' })
    expect(markUnavailable).toHaveBeenCalledWith(1)
    expect(accepted[0].attachmentsState).toBe('refused_unavailable')
  })
})

/** Baza miejsc na pliki w pamięci, z tą samą jednorazowością co SQL (`WHERE state = 'pending'`). */
function memoryUploads() {
  const slots = new Map<string, AttachmentRow>()
  const submissions = new Map<number, { state: string; declared: number }>()
  const completions: Array<{ id: number; state: CompletionState }> = []
  let nextSubmission = 1

  const addSubmission = (sizes: number[]) => {
    const submissionId = nextSubmission++
    submissions.set(submissionId, { state: 'uploading', declared: sizes.length })
    const ids = sizes.map((size, index) => {
      const id = randomUUID()
      slots.set(id, {
        id,
        submissionId,
        slot: index + 1,
        state: 'pending',
        declaredBytes: size,
        originalName: null,
        detectedType: null,
        bytes: null,
        width: null,
        height: null,
        path: null,
        thumbPath: null,
        rejectReason: null,
        createdAt: new Date(NOW).toISOString(),
      })
      return id
    })
    return { submissionId, ids, tokens: ids.map((id) => token(id)) }
  }
  const token = (id: string, expiresAt = NOW + ATTACHMENT_RULES.uploadTokenTtlMs, key = UPLOAD_KEY) =>
    issueUploadToken(id, expiresAt, key)

  const settle = (id: string, state: AttachmentState, values: Partial<AttachmentRow> = {}) => {
    const slot = slots.get(id)
    if (!slot || slot.state !== 'pending') return false
    slots.set(id, { ...slot, ...values, state })
    return true
  }

  return { slots, submissions, completions, addSubmission, token, settle }
}

function uploadSetup(overrides: Partial<UploadDeps> = {}) {
  const db = memoryUploads()
  const storage = memoryStorage()
  const deferred: Promise<void>[] = []
  const afterCompletion = vi.fn(async () => undefined)
  const deps: UploadDeps = {
    appSecret: APP_SECRET,
    storage,
    enabled: true,
    prefix: 'zgloszenia-test/',
    now: () => NOW,
    findSlot: async (id) => db.slots.get(id) ?? null,
    processImage,
    markStored: async (id, data: StoredData) => db.settle(id, 'stored', data),
    markRejected: async (id, data) =>
      db.settle(id, 'rejected', { rejectReason: data.reason, originalName: data.originalName }),
    markSkipped: async (id) => db.settle(id, 'skipped'),
    claimCompletion: async (submissionId) => {
      const submission = db.submissions.get(submissionId)!
      const own = [...db.slots.values()].filter((s) => s.submissionId === submissionId)
      if (submission.state !== 'uploading' || own.some((s) => s.state === 'pending')) return null
      const state: CompletionState =
        own.filter((s) => s.state === 'stored').length >= submission.declared ? 'complete' : 'incomplete'
      submission.state = state
      db.completions.push({ id: submissionId, state })
      return state
    },
    afterCompletion,
    defer: (task) => void deferred.push(task()),
    log: () => undefined,
    ...overrides,
  }
  return { deps, db, storage, deferred, afterCompletion }
}

function uploadRequest(
  body: Buffer | ReadableStream<Uint8Array> | null,
  headers: Record<string, string> = {},
) {
  return new Request('http://localhost:3000/api/zgloszenia/zalaczniki', {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream', host: 'localhost:3000', ...headers },
    body: body as BodyInit | null,
    ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
  } as RequestInit)
}

async function upload(deps: UploadDeps, token: string | null, bytes: Buffer, name = 'IMG_0001.jpg') {
  const response = await handleUpload(
    uploadRequest(bytes, {
      ...(token ? { 'x-upload-token': token } : {}),
      'content-length': String(bytes.length),
      'x-file-name': encodeURIComponent(name),
    }),
    deps,
  )
  return { status: response.status, body: (await response.json()) as { ok: boolean; code: string } }
}

describe('przesyłanie pliku z biletem', () => {
  it('poprawne zdjęcie: 201, zapis pod losową nazwą w przedrostku środowiska, miniatura, jeden zapis', async () => {
    const { deps, db, storage, deferred, afterCompletion } = uploadSetup()
    const { ids, tokens, submissionId } = db.addSubmission([200_000])
    const bytes = await jpegWithGps()
    const { status, body } = await upload(deps, tokens[0], bytes, 'Pierścionek babci.jpg')
    expect(status).toBe(201)
    expect(body).toMatchObject({ ok: true, code: 'stored' })
    const slot = db.slots.get(ids[0])!
    expect(slot.state).toBe('stored')
    expect(slot.originalName).toBe('Pierścionek babci.jpg')
    expect(slot.path).toMatch(new RegExp(`^zgloszenia-test/${submissionId}/[0-9a-f-]{36}\\.jpg$`))
    expect(slot.thumbPath).toBe(slot.path!.replace(/\.jpg$/, '-min.jpg'))
    expect(slot.path).not.toContain('babci')
    expect([...storage.objects.keys()].sort()).toEqual([slot.path, slot.thumbPath].sort())
    const stored = storage.objects.get(slot.path!)!
    expect(sniffImageType(stored.body)).toBe('jpeg')
    expect(stored.contentType).toBe('image/jpeg')
    // Ostatni plik zgłoszenia: komplet i powiadomienie pracowni (po odpowiedzi).
    expect(db.completions).toEqual([{ id: submissionId, state: 'complete' }])
    await Promise.all(deferred)
    expect(afterCompletion).toHaveBeenCalledTimes(1)
  })

  it('bilet zużyty: drugi plik na ten sam bilet → 409, magazyn bez zmian', async () => {
    const { deps, db, storage } = uploadSetup()
    const { tokens } = db.addSubmission([200_000])
    expect((await upload(deps, tokens[0], await jpeg())).status).toBe(201)
    const second = await upload(deps, tokens[0], await jpeg())
    expect(second.status).toBe(409)
    expect(second.body.code).toBe('used_token')
    expect(storage.objects.size).toBe(2)
  })

  it('równoległe żądania z tym samym biletem: dokładnie jeden zapis, nadmiarowe pliki usunięte', async () => {
    const { deps, db, storage } = uploadSetup()
    const { tokens } = db.addSubmission([200_000])
    const bytes = await jpeg()
    const results = await Promise.all(Array.from({ length: 5 }, () => upload(deps, tokens[0], bytes)))
    expect(results.filter((r) => r.status === 201)).toHaveLength(1)
    expect(results.filter((r) => r.status === 409)).toHaveLength(4)
    expect(storage.objects.size).toBe(2)
  })

  it.each([
    ['brak biletu', null],
    ['bilet podpisany innym kluczem (obcy)', 'obcy'],
    ['podmieniony identyfikator miejsca', 'podmieniony'],
    ['śmieci zamiast biletu', 'u1.abc.def.ghi'],
  ])('%s: 403, bez dekodowania i zapisu', async (_name, kind) => {
    const process = vi.fn(processImage)
    const { deps, db, storage } = uploadSetup({ processImage: process })
    const { ids, tokens } = db.addSubmission([200_000])
    const token =
      kind === null
        ? null
        : kind === 'obcy'
          ? db.token(ids[0], NOW + 60_000, deriveKey('inny-sekret', 'upload-token'))
          : kind === 'podmieniony'
            ? tokens[0].replace(ids[0], randomUUID())
            : kind
    const { status, body } = await upload(deps, token, await jpeg())
    expect(status).toBe(403)
    expect(body.code).toBe('invalid_token')
    expect(process).not.toHaveBeenCalled()
    expect(storage.objects.size).toBe(0)
    expect(db.slots.get(ids[0])!.state).toBe('pending')
  })

  it('bilet przeterminowany: 403 „minął czas”', async () => {
    const { deps, db, storage } = uploadSetup()
    const { ids } = db.addSubmission([200_000])
    const { status, body } = await upload(deps, db.token(ids[0], NOW - 1), await jpeg())
    expect(status).toBe(403)
    expect(body.code).toBe('expired_token')
    expect(storage.objects.size).toBe(0)
  })

  it('bilet z formularza (token otwarcia) nie jest biletem na plik', async () => {
    const { deps, db } = uploadSetup()
    db.addSubmission([200_000])
    const { status } = await upload(deps, formTokenAged('kontakt', NOW, 30_000), await jpeg())
    expect(status).toBe(403)
  })

  it.each([
    ['program .exe', disguised.exe],
    ['strona HTML', disguised.html],
    ['SVG ze skryptem', disguised.svg],
    ['PDF', disguised.pdf],
  ])('%s przemianowany na .jpg: 415, miejsce „odrzucony”, nic w magazynie', async (_name, bytes) => {
    const { deps, db, storage } = uploadSetup()
    const { ids } = db.addSubmission([200_000])
    const { status, body } = await upload(deps, db.token(ids[0]), bytes, 'zdjecie.jpg')
    expect(status).toBe(415)
    expect(body.code).toBe('unsupported_type')
    expect(db.slots.get(ids[0])).toMatchObject({ state: 'rejected', rejectReason: 'unsupported_type' })
    expect(storage.objects.size).toBe(0)
  })

  it('poliglota JPG+HTML: przyjęty jako zdjęcie, ale w magazynie nie ma HTML-a', async () => {
    const { deps, db, storage } = uploadSetup()
    const { ids } = db.addSubmission([200_000])
    expect((await upload(deps, db.token(ids[0]), await polyglot())).status).toBe(201)
    for (const { body } of storage.objects.values()) {
      expect(body.includes(Buffer.from('<script'))).toBe(false)
      expect(body.toString('latin1')).not.toContain(HTML_PAYLOAD)
    }
  })

  it('bomba dekompresyjna: 422, nic w magazynie', async () => {
    const { deps, db, storage } = uploadSetup()
    const { ids } = db.addSubmission([200_000])
    const { status, body } = await upload(deps, db.token(ids[0]), pngBomb())
    expect(status).toBe(422)
    expect(body.code).toBe('too_large_dimensions')
    expect(storage.objects.size).toBe(0)
  })

  it('plik większy niż zapowiedziany (nagłówek Content-Length): 413 bez czytania treści', async () => {
    const process = vi.fn(processImage)
    const { deps, db } = uploadSetup({ processImage: process })
    const bytes = await jpeg()
    const { ids } = db.addSubmission([bytes.length - 1])
    const { status, body } = await upload(deps, db.token(ids[0]), bytes)
    expect(status).toBe(413)
    expect(body.code).toBe('too_large')
    expect(process).not.toHaveBeenCalled()
    expect(db.slots.get(ids[0])!.state).toBe('rejected')
  })

  it('plik większy niż zapowiedziany bez Content-Length (strumień): przerwany po limicie, 413', async () => {
    const { deps, db } = uploadSetup()
    const { ids } = db.addSubmission([10_000])
    let sent = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent > 1_000_000) return controller.close()
        sent += 64 * 1024
        controller.enqueue(new Uint8Array(64 * 1024))
      },
    })
    const response = await handleUpload(
      uploadRequest(stream, { 'x-upload-token': db.token(ids[0]) }),
      deps,
    )
    expect(response.status).toBe(413)
    // Czytanie przerwane tuż po przekroczeniu 10 KB, a nie po całym megabajcie.
    expect(sent).toBeLessThan(200_000)
  })

  it('plik ponad 4 MB nawet przy większej zapowiedzi (zapowiedź jest i tak ograniczona do 4 MB)', async () => {
    const { deps, db } = uploadSetup()
    const { ids } = db.addSubmission([ATTACHMENT_RULES.maxUploadBytes])
    const big = Buffer.alloc(ATTACHMENT_RULES.maxUploadBytes + 1, 1)
    expect((await upload(deps, db.token(ids[0]), big)).status).toBe(413)
  })

  it('pominięcie pliku (klient nie zdołał wysłać): miejsce zwolnione, zgłoszenie domknięte jako niepełne', async () => {
    const { deps, db, deferred, afterCompletion } = uploadSetup()
    const { ids, submissionId } = db.addSubmission([200_000, 200_000])
    expect((await upload(deps, db.token(ids[0]), await jpeg())).status).toBe(201)
    expect(db.completions).toHaveLength(0)
    const response = await handleUpload(
      uploadRequest(null, { 'x-upload-token': db.token(ids[1]), 'x-upload-skip': '1' }),
      deps,
    )
    expect(response.status).toBe(200)
    expect(db.slots.get(ids[1])!.state).toBe('skipped')
    expect(db.completions).toEqual([{ id: submissionId, state: 'incomplete' }])
    await Promise.all(deferred)
    expect(afterCompletion).toHaveBeenCalledTimes(1)
  })

  it('przełącznik wyłączony albo brak magazynu: 503', async () => {
    const off = uploadSetup({ enabled: false })
    const { tokens } = off.db.addSubmission([200_000])
    expect((await upload(off.deps, tokens[0], await jpeg())).status).toBe(503)
    const noStorage = uploadSetup({ storage: null })
    const second = noStorage.db.addSubmission([200_000])
    expect((await upload(noStorage.deps, second.tokens[0], await jpeg())).status).toBe(503)
  })

  it('oryginalna nazwa pliku tylko jako bezpieczny tekst', () => {
    expect(cleanFileName(encodeURIComponent('../../etc/passwd'))).toBe('passwd')
    expect(cleanFileName('C:\\Users\\Ania\\IMG 1.HEIC')).toBe('IMG 1.HEIC')
    expect(cleanFileName(encodeURIComponent('zdj\u202Egpj.exe'))).toBe('zdjgpj.exe')
    expect(cleanFileName(encodeURIComponent('a\u0000b\nc.jpg'))).toBe('abc.jpg')
    expect(cleanFileName('%E0%A4%A')).toBe('%E0%A4%A')
    expect(cleanFileName(encodeURIComponent('ż'.repeat(300)))).toHaveLength(120)
    expect(cleanFileName(null)).toBeNull()
  })
})

describe('podgląd w panelu (bez publicznego dostępu)', () => {
  async function storedAttachment() {
    const storage = memoryStorage()
    await storage.put('zgloszenia/1/a.jpg', await jpeg(), 'image/jpeg')
    await storage.put('zgloszenia/1/a-min.jpg', await jpeg(40, 30), 'image/jpeg')
    const row: AttachmentRow = {
      id: randomUUID(),
      submissionId: 1,
      slot: 1,
      state: 'stored',
      declaredBytes: 1,
      originalName: 'a.jpg',
      detectedType: 'jpeg',
      bytes: 1,
      width: 320,
      height: 240,
      path: 'zgloszenia/1/a.jpg',
      thumbPath: 'zgloszenia/1/a-min.jpg',
      rejectReason: null,
      createdAt: new Date(NOW).toISOString(),
    }
    return { storage, row }
  }
  const viewRequest = (id: string, query = '') =>
    new Request(`http://localhost:3000/api/zgloszenia/zalaczniki/${id}${query}`)

  it('bez sesji panelu: 404 (bez zdradzania, czy plik istnieje)', async () => {
    const { storage, row } = await storedAttachment()
    const response = await handleView(viewRequest(row.id), row.id, {
      storage,
      authorize: async () => false,
      findAttachment: async () => row,
    })
    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('text/plain')
  })

  it('zalogowany pracownik: zdjęcie z nagłówkami, które nie pozwolą go wykonać ani osadzić gdzie indziej', async () => {
    const { storage, row } = await storedAttachment()
    const response = await handleView(viewRequest(row.id), row.id, {
      storage,
      authorize: async () => true,
      findAttachment: async () => row,
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/jpeg')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('content-security-policy')).toContain('sandbox')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(response.headers.get('cross-origin-resource-policy')).toBe('same-origin')
    expect(response.headers.get('content-disposition')).toBe('inline; filename="zgloszenie-1-1.jpg"')
    expect(sniffImageType(Buffer.from(await response.arrayBuffer()))).toBe('jpeg')
  })

  it('miniatura: `?rozmiar=miniatura`', async () => {
    const { storage, row } = await storedAttachment()
    const response = await handleView(viewRequest(row.id, '?rozmiar=miniatura'), row.id, {
      storage,
      authorize: async () => true,
      findAttachment: async () => row,
    })
    expect(Number(response.headers.get('content-length'))).toBe(
      storage.objects.get('zgloszenia/1/a-min.jpg')!.body.length,
    )
  })

  it.each([
    ['zły identyfikator', 'nie-uuid', 'stored'],
    ['plik odrzucony', 'ok', 'rejected'],
    ['plik usunięty po okresie przechowywania', 'ok', 'expired'],
  ])('%s: 404 także dla zalogowanego', async (_name, kind, state) => {
    const { storage, row } = await storedAttachment()
    const id = kind === 'ok' ? row.id : kind
    const response = await handleView(viewRequest(id), id, {
      storage,
      authorize: async () => true,
      findAttachment: async () => ({ ...row, state: state as AttachmentState }),
    })
    expect(response.status).toBe(404)
  })

  it('autoryzacja sprawdzana przed zajrzeniem do bazy', async () => {
    const { storage, row } = await storedAttachment()
    const find = vi.fn(async () => row)
    await handleView(viewRequest(row.id), row.id, {
      storage,
      authorize: async () => false,
      findAttachment: find,
    })
    expect(find).not.toHaveBeenCalled()
  })
})

describe('sprzątanie (zadanie cykliczne)', () => {
  const cron = (authorization?: string) =>
    new Request('http://localhost:3000/api/zgloszenia/zalaczniki/sprzatanie', {
      headers: authorization ? { authorization } : {},
    })

  it('bez CRON_SECRET: 503, nic nie rusza', async () => {
    const run = vi.fn(async () => ({}))
    expect((await handleCleanup(cron('Bearer x'), { cronSecret: undefined, run })).status).toBe(503)
    expect(run).not.toHaveBeenCalled()
  })

  it.each([undefined, 'Bearer zly', 'sekret-cron', 'Bearer sekret-cro', 'bearer sekret-cron'])(
    'zły nagłówek (%s): 401',
    async (authorization) => {
      const run = vi.fn(async () => ({}))
      const response = await handleCleanup(cron(authorization), { cronSecret: 'sekret-cron', run })
      expect(response.status).toBe(401)
      expect(run).not.toHaveBeenCalled()
    },
  )

  it('poprawny nagłówek: uruchamia sprzątanie i zwraca podsumowanie', async () => {
    const run = vi.fn(async () => ({ finalized: 1, expired: 2, orphans: 3 }))
    const response = await handleCleanup(cron('Bearer sekret-cron'), { cronSecret: 'sekret-cron', run })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, finalized: 1, expired: 2, orphans: 3 })
  })
})

describe('powiadomienie pracowni o zdjęciach', () => {
  const base: NotifiedSubmission = {
    id: 7,
    kind: 'contact',
    name: 'Anna',
    phone: '+48 600 100 200',
    message: 'Taki jak na zdjęciu.',
    verification: 'verified',
    createdAt: new Date(NOW).toISOString(),
  }
  const mail = (overrides: Partial<NotifiedSubmission>) =>
    buildStudioMail({ ...base, ...overrides }, { to: 'pracownia@example.com', adminUrl: 'https://x/admin/collections/submissions/7' })

  it('komplet: liczba zdjęć i link do panelu; bez plików, adresów magazynu i nazw plików', () => {
    const { text, subject } = mail({ attachmentsState: 'complete', attachmentsDeclared: 2, attachmentsCount: 2 })
    expect(text).toContain('Załączniki: 2 zdjęcia do obejrzenia w panelu')
    expect(text).toContain('https://x/admin/collections/submissions/7')
    expect(text).not.toMatch(/blob|zgloszenia\/|\.jpg/i)
    expect(subject).not.toContain('Anna')
  })

  it('niepełne: ile dotarło', () => {
    expect(mail({ attachmentsState: 'incomplete', attachmentsDeclared: 3, attachmentsCount: 1 }).text).toContain(
      'dotarło 1 z 3',
    )
  })

  it.each([
    ['refused_quarantine', 'weryfikacja Cloudflare była niedostępna'],
    ['refused_limit', 'dzienny limit zdjęć'],
    ['refused_unavailable', 'chwilowo niedostępne'],
  ] as const)('%s: zgłoszenie bez zdjęć i informacja, że klient dostał prośbę o e-mail', (state, reason) => {
    const { text } = mail({ attachmentsState: state, attachmentsDeclared: 2, attachmentsCount: 0 })
    expect(text).toContain(reason)
    expect(text).toContain('e-mailem')
  })

  it('bez zdjęć: mail jak przed zmianą', () => {
    expect(mail({ attachmentsState: 'none' }).text).not.toContain('Załączniki')
    expect(mail({}).text).not.toContain('Załączniki')
  })
})
