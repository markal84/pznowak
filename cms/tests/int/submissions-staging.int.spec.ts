// @vitest-environment node
/**
 * Testy integracyjne na bazie stagingowej (Neon branch `staging`): prawdziwy Payload, Postgres i siteverify
 * Cloudflare z kluczami testowymi. Uruchamianie: `npm run test:int:staging`. Bez bazy stagingowej są pomijane;
 * na bazie produkcyjnej przerywają się (bezpiecznik w helpers/submissions.ts).
 * Każdy test ma własny przedrostek liczników, a po testach wiersze i liczniki są usuwane.
 */
import { randomUUID } from 'node:crypto'

import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { SubmissionSettings } from '@/lib/submissions/config'
import { deriveKey, hashIp } from '@/lib/submissions/form-token'
import { handleSubmission, type SubmissionDeps } from '@/lib/submissions/handler'
import { utcHour } from '@/lib/submissions/limits'
import { claimVisualization } from '@/lib/submissions/queue'
import { submissionDeps } from '@/lib/submissions/server'
import { consumeLimits, drizzleOf, insertDraft } from '@/lib/submissions/store'
import { siteverifyReachable, verifyTurnstile } from '@/lib/submissions/turnstile'
import type { Submission } from '@/payload-types'
import {
  APP_SECRET,
  DUMMY_TOKEN,
  TEST_SECRET_FAIL,
  TEST_SECRET_PASS,
  formTokenAged,
  stagingDatabaseOrSkipReason,
  submissionRequest,
  testLimits,
  testSettings,
  validContactData,
  validCreatorData,
} from './helpers/submissions'

const skipReason = stagingDatabaseOrSkipReason()
const RUN = `test-${randomUUID().slice(0, 8)}`
const NOW = Date.now()

let payload: Payload
const createdIds = new Set<number>()

const ns = (name: string) => `${RUN}:${name}:`
const ipHashOf = (ip: string) => hashIp(ip, deriveKey(APP_SECRET, 'ip-hash'))

function deps(settings: SubmissionSettings, overrides: Partial<SubmissionDeps> = {}) {
  const pending: Promise<void>[] = []
  const d = {
    ...submissionDeps(
      async () => payload,
      settings,
      (task) => void pending.push(task()),
    ),
    ...overrides,
  }
  const afterAccepted = d.afterAccepted
  d.afterAccepted = async (submission, context) => {
    createdIds.add(submission.id)
    await afterAccepted(submission, context)
  }
  d.log = () => undefined
  return { deps: d, settle: () => Promise.all(pending) }
}

async function post(
  settings: SubmissionSettings,
  body: Record<string, unknown>,
  ip: string,
  overrides: Partial<SubmissionDeps> = {},
) {
  const { deps: d, settle } = deps(settings, overrides)
  const response = await handleSubmission(submissionRequest(body, { ip }), d)
  await settle()
  return { status: response.status, body: await response.json() }
}

/** Awaria Cloudflare: prawdziwe funkcje weryfikacji, ale sieć do siteverify nie odpowiada. */
const cloudflareDown = (): Partial<SubmissionDeps> => {
  const options = {
    secret: TEST_SECRET_PASS,
    fetchImpl: (async () => {
      throw new TypeError('fetch failed')
    }) as typeof fetch,
    timeoutMs: 50,
    retryDelayMs: 1,
  }
  return {
    verifyTurnstile: (args) => verifyTurnstile({ ...args, ...options, allowTestingKeys: true }),
    siteverifyReachable: () => siteverifyReachable(options),
  }
}

const creatorBody = (overrides: Record<string, unknown> = {}) => ({
  form: 'kreator',
  formToken: formTokenAged('kreator', Date.now(), 30_000),
  turnstileToken: DUMMY_TOKEN,
  honeypot: '',
  data: validCreatorData(),
  ...overrides,
})

const contactBody = (overrides: Record<string, unknown> = {}) => ({
  form: 'kontakt',
  formToken: formTokenAged('kontakt', Date.now(), 30_000),
  turnstileToken: DUMMY_TOKEN,
  honeypot: '',
  data: validContactData(),
  ...overrides,
})

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

async function counter(key: string): Promise<number | null> {
  const result = await drizzleOf(payload).execute(
    sql`SELECT "hits" FROM "cms_limit_counters" WHERE "bucket" = ${key}`,
  )
  return result.rows.length ? Number(result.rows[0].hits) : null
}

/** Zgłoszenie z kreatora zapisane wprost (jak robi to endpoint po wszystkich kontrolach). */
async function creatorDraft(label: string, verification: Submission['verification'] = 'verified') {
  const { id } = await insertDraft(payload, {
    kind: 'creator',
    status: 'draft',
    verification,
    name: 'Test Automatyczny',
    phone: '+48 501 321 347',
    summary: label,
    details: validCreatorData(),
    consentText: 'test',
    consentAt: new Date().toISOString(),
    visualizationStatus: 'waiting',
    notification: 'skipped',
    meta: { ipHash: `${RUN}-${label}` },
  })
  createdIds.add(id)
  return id
}

const statusOf = async (id: number) =>
  (await payload.findByID({
    collection: 'submissions',
    id,
    depth: 0,
    overrideAccess: true,
  })) as Submission

describe.skipIf(skipReason)('zgłoszenia na bazie stagingowej', () => {
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
    await payload.destroy()
  }, 60_000)

  describe('endpoint: odrzucone zgłoszenia nie trafiają do bazy', () => {
    it('brak tokenu Turnstile', async () => {
      const ip = '198.51.100.101'
      const result = await post(
        testSettings({ namespace: ns('brak-tokenu') }),
        creatorBody({ turnstileToken: '' }),
        ip,
      )
      expect(result.status).toBe(403)
      expect(await rowsForIp(ip)).toHaveLength(0)
    })

    it('brak tokenu z flagą „Turnstile niedostępny”, gdy Cloudflare działa (prawdziwe siteverify): 403, bez kwarantanny', async () => {
      const ip = '198.51.100.107'
      const result = await post(
        testSettings({ namespace: ns('flaga-bez-awarii') }),
        creatorBody({ turnstileToken: '', turnstileUnavailable: true }),
        ip,
      )
      expect(result.status).toBe(403)
      expect(result.body.code).toBe('verification_failed')
      expect(await rowsForIp(ip)).toHaveLength(0)
    })

    it('zły token Turnstile (klucz Cloudflare „zawsze odrzuca”)', async () => {
      const ip = '198.51.100.102'
      const settings = testSettings({
        namespace: ns('zly-token'),
        turnstileSecret: TEST_SECRET_FAIL,
      })
      const result = await post(settings, creatorBody(), ip)
      expect(result.status).toBe(403)
      expect(await rowsForIp(ip)).toHaveLength(0)
      expect(
        await counter(
          `${ns('zly-token')}ip:${ipHashOf(ip)}:${new Date().toISOString().slice(0, 13)}`,
        ),
      ).toBeNull()
    })

    it('wypełniony honeypot', async () => {
      const ip = '198.51.100.103'
      const result = await post(
        testSettings({ namespace: ns('honeypot') }),
        contactBody({ honeypot: 'http://spam.example' }),
        ip,
      )
      expect(result.status).toBe(403)
      expect(await rowsForIp(ip)).toHaveLength(0)
    })

    it('za szybka wysyłka', async () => {
      const ip = '198.51.100.104'
      const result = await post(
        testSettings({ namespace: ns('szybko') }),
        creatorBody({ formToken: formTokenAged('kreator', Date.now(), 1_500) }),
        ip,
      )
      expect(result.status).toBe(403)
      expect(result.body.code).toBe('too_fast')
      expect(await rowsForIp(ip)).toHaveLength(0)
    })

    it('złe wartości pól', async () => {
      const ip = '198.51.100.105'
      const result = await post(
        testSettings({ namespace: ns('pola') }),
        creatorBody({
          data: validCreatorData({ metal: 'platyna', engraving: '<a href=x>', phone: '0 800' }),
        }),
        ip,
      )
      expect(result.status).toBe(400)
      expect(Object.keys(result.body.fields).sort()).toEqual(['engraving', 'metal', 'phone'])
      expect(await rowsForIp(ip)).toHaveLength(0)
    })

    it('przekroczony limit IP: trzecie zgłoszenie w godzinie odrzucone, w bazie dwa', async () => {
      const ip = '198.51.100.106'
      const settings = testSettings({
        namespace: ns('limit-ip'),
        limits: testLimits({ perIpHour: 2 }),
      })
      expect((await post(settings, creatorBody(), ip)).status).toBe(201)
      expect((await post(settings, contactBody(), ip)).status).toBe(201)
      const third = await post(settings, creatorBody(), ip)
      expect(third.status).toBe(429)
      expect(third.body.code).toBe('rate_limited')
      expect(await rowsForIp(ip)).toHaveLength(2)
    })

    it('przekroczony sufit dzienny: czwarte zgłoszenie z innego IP odrzucone', async () => {
      const settings = testSettings({
        namespace: ns('sufit'),
        limits: testLimits({ perDay: 3 }),
      })
      const ips = ['198.51.100.111', '198.51.100.112', '198.51.100.113', '198.51.100.114']
      for (const ip of ips.slice(0, 3))
        expect((await post(settings, creatorBody(), ip)).status).toBe(201)
      const fourth = await post(settings, contactBody(), ips[3])
      expect(fourth.status).toBe(429)
      expect(fourth.body.code).toBe('daily_limit')
      expect(await rowsForIp(ips[3])).toHaveLength(0)
    })
  })

  it('endpoint: poprawne zgłoszenie zapisuje szkic (bez surowego IP), wizualizacja czeka, powiadomienie pominięte', async () => {
    const ip = '198.51.100.120'
    const result = await post(testSettings({ namespace: ns('poprawne') }), creatorBody(), ip)
    expect(result.status).toBe(201)
    const [row] = await rowsForIp(ip)
    expect(row).toMatchObject({
      kind: 'creator',
      status: 'draft',
      visualizationStatus: 'waiting',
      visualizationStartedAt: null,
      notification: 'skipped',
      name: 'Test Automatyczny',
      phone: '+48 501 321 347',
    })
    expect(row.consentText).toMatch(/Zgadzam się na kontakt/)
    expect(row.verification).toBe('verified')
    expect(row.meta?.verifiedWithTestKeys).toBe(true)
    expect(JSON.stringify(row)).not.toContain(ip)

    const contact = await post(
      testSettings({ namespace: ns('poprawne-kontakt') }),
      contactBody(),
      '198.51.100.121',
    )
    expect(contact.status).toBe(201)
    const [contactRow] = await rowsForIp('198.51.100.121')
    expect(contactRow).toMatchObject({
      kind: 'contact',
      status: 'draft',
      visualizationStatus: 'not_applicable',
    })
  })

  it('endpoint: zamówienie z grawerem i rozmiarem zapisuje nowe kolumny (migracja 20261021)', async () => {
    const ip = '198.51.100.125'
    const result = await post(
      testSettings({ namespace: ns('zamowienie') }),
      contactBody({
        data: validContactData({
          topic: 'nowy',
          message: 'Jak na zdjęciu https://pinterest.com/pin/1',
          engraving: 'Na zawsze ♥',
          ringSizeKnown: 'known',
          ringSize: '14',
        }),
      }),
      ip,
    )
    expect(result.status).toBe(201)
    const [row] = await rowsForIp(ip)
    expect(row).toMatchObject({
      kind: 'contact',
      topic: 'nowy',
      engraving: 'Na zawsze ♥',
      ringSizeKnown: 'known',
      ringSize: '14',
    })
    expect(row.summary).toContain('Rozmiar: 14 (polska skala)')

    const unknownIp = '198.51.100.126'
    expect(
      (
        await post(
          testSettings({ namespace: ns('zamowienie-bez-rozmiaru') }),
          contactBody({ data: validContactData({ topic: 'kolekcja', project: 'Phoebe' }) }),
          unknownIp,
        )
      ).status,
    ).toBe(201)
    const [unknownRow] = await rowsForIp(unknownIp)
    expect(unknownRow).toMatchObject({ engraving: null, ringSizeKnown: 'unknown', ringSize: null })
  })

  it('kwarantanna: awaria Cloudflare zapisuje szkic oznaczony „kwarantanna”, drugie z tego IP w godzinie odrzucone', async () => {
    const namespace = ns('kwarantanna')
    const settings = testSettings({ namespace })
    const ip = '198.51.100.150'
    const first = await post(settings, creatorBody(), ip, cloudflareDown())
    expect(first.status).toBe(201)
    const [row] = await rowsForIp(ip)
    expect(row).toMatchObject({
      kind: 'creator',
      status: 'draft',
      verification: 'quarantine',
      visualizationStatus: 'waiting',
      visualizationStartedAt: null,
      notification: 'skipped',
    })
    expect(row.meta?.verifiedWithTestKeys).toBe(false)

    const second = await post(settings, contactBody(), ip, cloudflareDown())
    expect(second.status).toBe(503)
    expect(second.body.code).toBe('verification_unavailable')
    expect(await rowsForIp(ip)).toHaveLength(1)

    const hour = utcHour(new Date())
    expect(await counter(`${namespace}kwarantanna-ip:${ipHashOf(ip)}:${hour}`)).toBe(1)
    // odrzucone drugie zgłoszenie nie zużyło zwykłego limitu IP (wszystko albo nic)
    expect(await counter(`${namespace}ip:${ipHashOf(ip)}:${hour}`)).toBe(1)

    // przeglądarka bez tokenu + Cloudflare nie odpowiada serwerowi: też kwarantanna
    const noToken = await post(
      settings,
      contactBody({ turnstileToken: '', turnstileUnavailable: true }),
      '198.51.100.151',
      cloudflareDown(),
    )
    expect(noToken.status).toBe(201)
    const [contactRow] = await rowsForIp('198.51.100.151')
    expect(contactRow).toMatchObject({ kind: 'contact', verification: 'quarantine' })
  })

  it('liczniki: 20 równoległych prób przy limicie 5 przepuszcza dokładnie 5', async () => {
    const bucket = {
      key: `${ns('rownolegle')}ip:x:${Date.now()}`,
      limit: 5,
      ttlSeconds: 600,
      scope: 'ip' as const,
    }
    const results = await Promise.all(
      Array.from({ length: 20 }, () => consumeLimits(payload, [bucket])),
    )
    expect(results.filter((r) => r.ok)).toHaveLength(5)
    expect(await counter(bucket.key)).toBe(5)
  })

  it('liczniki: przy pełnym sufcie dziennym limit IP nie jest zużywany (wszystko albo nic)', async () => {
    const day = { key: `${ns('atomowo')}dzien`, limit: 1, ttlSeconds: 600, scope: 'day' as const }
    const ip = { key: `${ns('atomowo')}ip`, limit: 5, ttlSeconds: 600, scope: 'ip' as const }
    expect((await consumeLimits(payload, [ip, day])).ok).toBe(true)
    const blocked = await consumeLimits(payload, [ip, day])
    expect(blocked).toMatchObject({ ok: false, bucket: { scope: 'day' } })
    expect(await counter(ip.key)).toBe(1)
  })

  describe('kolejka wizualizacji', () => {
    it('zgłoszenia przez endpoint nie uruchamiają wizualizacji, a pomocnik nie przekroczy limitu', async () => {
      const namespace = ns('wizualizacje')
      const settings = testSettings({ namespace })
      const ips = [
        '198.51.100.131',
        '198.51.100.132',
        '198.51.100.133',
        '198.51.100.134',
        '198.51.100.135',
      ]
      for (const ip of ips) expect((await post(settings, creatorBody(), ip)).status).toBe(201)
      const ids = (await Promise.all(ips.map(rowsForIp))).flat().map((r) => r.id)
      expect(ids).toHaveLength(5)

      // 1. Po zgłoszeniu: wszystkie czekają, żadna wizualizacja nie wystartowała.
      for (const id of ids) expect((await statusOf(id)).visualizationStatus).toBe('waiting')

      const manual = { limit: 3, mode: 'manual' as const, namespace }
      // 2. Tryb ręczny: bez akceptacji pracowni pomocnik nie dostaje nic.
      expect(await claimVisualization(payload, manual, { ids })).toEqual({
        claimed: false,
        reason: 'empty',
      })

      // 3. Pracownia zatwierdza wszystkie pięć; twardy limit 3 na dobę.
      for (const id of ids) {
        await payload.update({
          collection: 'submissions',
          id,
          data: { visualizationStatus: 'approved' },
          overrideAccess: true,
        })
      }
      const claims = []
      for (let i = 0; i < 5; i++) claims.push(await claimVisualization(payload, manual, { ids }))
      expect(claims.filter((c) => c.claimed)).toHaveLength(3)
      expect(claims.slice(3)).toEqual([
        { claimed: false, reason: 'limit' },
        { claimed: false, reason: 'limit' },
      ])
      // najstarsze najpierw
      expect(claims.slice(0, 3).map((c) => (c.claimed ? c.id : 0))).toEqual(ids.slice(0, 3))

      const statuses = await Promise.all(ids.map(statusOf))
      expect(statuses.filter((s) => s.visualizationStatus === 'in_progress')).toHaveLength(3)
      expect(statuses.filter((s) => s.visualizationStatus === 'approved')).toHaveLength(2)
      expect(statuses.filter((s) => s.visualizationStartedAt)).toHaveLength(3)

      // 4. Ręczne przestawienie w panelu/API też respektuje limit (hook kolekcji czyta env).
      process.env.LIMITS_NAMESPACE = namespace
      process.env.VISUALIZATIONS_LIMIT_PER_DAY = '3'
      try {
        await expect(
          payload.update({
            collection: 'submissions',
            id: ids[3],
            data: { visualizationStatus: 'in_progress' },
            overrideAccess: true,
          }),
        ).rejects.toThrow(/Dzienny limit wizualizacji \(3\)/)
        expect((await statusOf(ids[3])).visualizationStatus).toBe('approved')

        // zakończyć można tylko wizualizację w toku
        await expect(
          payload.update({
            collection: 'submissions',
            id: ids[4],
            data: { visualizationStatus: 'done' },
            overrideAccess: true,
          }),
        ).rejects.toThrow(/dopiero, gdy jest w toku/)
        const finished = await payload.update({
          collection: 'submissions',
          id: ids[0],
          data: { visualizationStatus: 'done' },
          overrideAccess: true,
        })
        expect(finished.visualizationFinishedAt).toBeTruthy()
      } finally {
        delete process.env.LIMITS_NAMESPACE
        delete process.env.VISUALIZATIONS_LIMIT_PER_DAY
      }

      // 5. Następnego dnia (czas polski) limit się odnawia, kolejka rusza dalej.
      const tomorrow = new Date(NOW + 24 * 3600 * 1000)
      expect(await claimVisualization(payload, manual, { ids, now: tomorrow })).toEqual({
        claimed: true,
        id: ids[3],
      })
    })

    it('tryb automatyczny bierze czekające po kolei, ale też tylko do limitu; kontakt nigdy', async () => {
      const namespace = ns('auto')
      const first = await creatorDraft('auto-1')
      const second = await creatorDraft('auto-2')
      const contactIp = '198.51.100.140'
      expect((await post(testSettings({ namespace }), contactBody(), contactIp)).status).toBe(201)
      const [contactRow] = await rowsForIp(contactIp)

      const auto = { limit: 1, mode: 'auto' as const, namespace }
      expect(await claimVisualization(payload, auto, { ids: [] })).toEqual({
        claimed: false,
        reason: 'empty',
      })
      expect(await claimVisualization(payload, auto, { ids: [contactRow.id] })).toEqual({
        claimed: false,
        reason: 'empty',
      })
      expect(
        await claimVisualization(payload, auto, { ids: [first, second, contactRow.id] }),
      ).toEqual({ claimed: true, id: first })
      expect(
        await claimVisualization(payload, auto, { ids: [first, second, contactRow.id] }),
      ).toEqual({ claimed: false, reason: 'limit' })
      expect((await statusOf(second)).visualizationStatus).toBe('waiting')
      expect((await statusOf(contactRow.id)).visualizationStatus).toBe('not_applicable')

      // kontakt nie może dostać wizualizacji nawet ręcznie
      await expect(
        payload.update({
          collection: 'submissions',
          id: contactRow.id,
          data: { visualizationStatus: 'approved' },
          overrideAccess: true,
        }),
      ).rejects.toThrow(/nie ma wizualizacji/)
    })

    it('kwarantanna: tryb automatyczny jej nie bierze, po ręcznym zatwierdzeniu już tak', async () => {
      const namespace = ns('auto-kwarantanna')
      const quarantined = await creatorDraft('kw-1', 'quarantine')
      const verified = await creatorDraft('kw-2')
      const auto = { limit: 5, mode: 'auto' as const, namespace }
      const ids = [quarantined, verified]

      // starsze zgłoszenie z kwarantanny jest pomijane, bierze się zweryfikowane
      expect(await claimVisualization(payload, auto, { ids })).toEqual({
        claimed: true,
        id: verified,
      })
      expect(await claimVisualization(payload, auto, { ids })).toEqual({
        claimed: false,
        reason: 'empty',
      })
      expect((await statusOf(quarantined)).visualizationStatus).toBe('waiting')

      await payload.update({
        collection: 'submissions',
        id: quarantined,
        data: { visualizationStatus: 'approved' },
        overrideAccess: true,
      })
      expect(await claimVisualization(payload, auto, { ids })).toEqual({
        claimed: true,
        id: quarantined,
      })
    })

    it('równoległe pobieranie przez kilku pomocników: dokładnie limit, bez dubli', async () => {
      const namespace = ns('rownolegla-kolejka')
      const ids: number[] = []
      for (let i = 0; i < 5; i++) {
        const id = await creatorDraft(`rownolegle-${i}`)
        await payload.update({
          collection: 'submissions',
          id,
          data: { visualizationStatus: 'approved' },
          overrideAccess: true,
        })
        ids.push(id)
      }
      const claims = await Promise.all(
        Array.from({ length: 8 }, () =>
          claimVisualization(payload, { limit: 3, mode: 'manual', namespace }, { ids }),
        ),
      )
      const claimed = claims.filter((c) => c.claimed).map((c) => (c.claimed ? c.id : 0))
      expect(claimed).toHaveLength(3)
      expect(new Set(claimed).size).toBe(3)
      const statuses = await Promise.all(ids.map(statusOf))
      expect(statuses.filter((s) => s.visualizationStatus === 'in_progress')).toHaveLength(3)
    })

    it('nowe zgłoszenie nie może powstać z uruchomioną wizualizacją', async () => {
      await expect(
        insertDraft(payload, {
          kind: 'creator',
          status: 'draft',
          verification: 'verified',
          name: 'Test Automatyczny',
          phone: '+48 501 321 347',
          consentText: 'test',
          consentAt: new Date().toISOString(),
          visualizationStatus: 'in_progress',
          meta: { ipHash: `${RUN}-in-progress` },
        }),
      ).rejects.toThrow(/nie może mieć uruchomionej wizualizacji/)
    })
  })
})
