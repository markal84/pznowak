import { describe, expect, it, vi } from 'vitest'

import { FORM_TIMING, deriveKey, hashIp } from '@/lib/submissions/form-token'
import {
  handleFormTokenRequest,
  handleSubmission,
  type AcceptedSubmission,
  type SubmissionDeps,
} from '@/lib/submissions/handler'
import type { LimitBucket } from '@/lib/submissions/limits'
import { CONSENT_TEXT } from '@/lib/submissions/options'
import type { SubmissionDraft } from '@/lib/submissions/store'
import { verifyTurnstile } from '@/lib/submissions/turnstile'
import {
  APP_SECRET,
  DUMMY_TOKEN,
  formTokenAged,
  submissionRequest,
  testSettings,
  validContactData,
  validCreatorData,
} from './helpers/submissions'

const NOW = Date.parse('2026-10-20T17:20:00Z')

/** Liczniki w pamięci o tej samej semantyce co Postgres: wszystkie albo żaden. */
function memoryLimits() {
  const hits = new Map<string, number>()
  const consume = vi.fn(async (buckets: LimitBucket[]) => {
    const blocked = buckets.find((b) => (hits.get(b.key) ?? 0) >= b.limit)
    if (blocked) return { ok: false as const, bucket: blocked }
    for (const b of buckets) hits.set(b.key, (hits.get(b.key) ?? 0) + 1)
    return { ok: true as const }
  })
  return { hits, consume }
}

function setup(overrides: Partial<SubmissionDeps> = {}) {
  const limits = memoryLimits()
  const inserted: SubmissionDraft[] = []
  const accepted: Array<{ submission: AcceptedSubmission; origin: string }> = []
  const deferred: Promise<void>[] = []
  const turnstile = vi.fn(async (_args: Parameters<SubmissionDeps['verifyTurnstile']>[0]) => ({
    ok: true as const,
    testing: true,
  }))
  const deps: SubmissionDeps = {
    settings: testSettings(),
    now: () => NOW,
    verifyTurnstile: turnstile,
    consumeLimits: limits.consume,
    insertDraft: vi.fn(async (draft: SubmissionDraft) => {
      inserted.push(draft)
      return { id: inserted.length }
    }),
    afterAccepted: vi.fn(async (submission, context) => {
      accepted.push({ submission, origin: context.origin })
    }),
    defer: (task) => {
      deferred.push(task())
    },
    log: () => undefined,
    ...overrides,
  }
  return { deps, limits, inserted, accepted, deferred, turnstile }
}

const creatorBody = (overrides: Record<string, unknown> = {}) => ({
  form: 'kreator',
  formToken: formTokenAged('kreator', NOW, 30_000),
  turnstileToken: DUMMY_TOKEN,
  honeypot: '',
  data: validCreatorData(),
  ...overrides,
})

const contactBody = (overrides: Record<string, unknown> = {}) => ({
  form: 'kontakt',
  formToken: formTokenAged('kontakt', NOW, 30_000),
  turnstileToken: DUMMY_TOKEN,
  honeypot: '',
  data: validContactData(),
  ...overrides,
})

async function send(
  deps: SubmissionDeps,
  body: Record<string, unknown> | string,
  options?: Parameters<typeof submissionRequest>[1],
) {
  const response = await handleSubmission(submissionRequest(body, options), deps)
  return { status: response.status, headers: response.headers, body: await response.json() }
}

describe('token otwarcia formularza (GET)', () => {
  it('wydaje token z minimalnym czasem wypełnienia, bez cache', async () => {
    const response = handleFormTokenRequest(
      new Request('http://localhost/api/zgloszenia?form=kreator'),
      { settings: testSettings(), now: () => NOW },
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = await response.json()
    expect(body.minMs).toBe(FORM_TIMING.kreator.minMs)
    expect(body.token).toMatch(/^v1\.kreator\.\d{13}\./)
  })

  it('odrzuca nieznany formularz, a bez sekretu Turnstile odpowiada 503', async () => {
    expect(
      handleFormTokenRequest(new Request('http://localhost/api/zgloszenia?form=inny'), {
        settings: testSettings(),
        now: () => NOW,
      }).status,
    ).toBe(400)
    expect(
      handleFormTokenRequest(new Request('http://localhost/api/zgloszenia?form=kontakt'), {
        settings: testSettings({ turnstileSecret: undefined }),
        now: () => NOW,
      }).status,
    ).toBe(503)
  })
})

describe('POST /api/zgloszenia: odrzucenia', () => {
  it('bez sekretu Turnstile wysyłka jest wyłączona (503), nic się nie zapisuje', async () => {
    const t = setup({ settings: testSettings({ turnstileSecret: undefined }) })
    const result = await send(t.deps, creatorBody())
    expect(result.status).toBe(503)
    expect(result.body.code).toBe('disabled')
    expect(t.inserted).toHaveLength(0)
  })

  it('zły typ treści, za duże ciało, zły JSON, nieznany formularz', async () => {
    const t = setup()
    const wrongType = await handleSubmission(
      new Request('http://localhost/api/zgloszenia', {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body: 'x',
      }),
      t.deps,
    )
    expect(wrongType.status).toBe(415)
    expect(
      (await send(t.deps, creatorBody({ data: validCreatorData({ notes: 'x'.repeat(20_000) }) })))
        .status,
    ).toBe(413)
    expect((await send(t.deps, '{"form": "kreator",')).status).toBe(400)
    expect((await send(t.deps, '[1,2]')).status).toBe(400)
    expect((await send(t.deps, creatorBody({ form: 'zamowienie' }))).status).toBe(400)
    expect(t.inserted).toHaveLength(0)
    expect(t.turnstile).not.toHaveBeenCalled()
  })

  it('wypełniony honeypot: 403, bez Turnstile, limitów i zapisu', async () => {
    const t = setup()
    for (const honeypot of ['https://spam.example', ' ', 0, null]) {
      const result = await send(t.deps, creatorBody({ honeypot }))
      expect(result.status, String(honeypot)).toBe(403)
      expect(result.body.code).toBe('rejected')
    }
    expect(t.turnstile).not.toHaveBeenCalled()
    expect(t.limits.consume).not.toHaveBeenCalled()
    expect(t.inserted).toHaveLength(0)
  })

  it('za szybka wysyłka (1 s od otwarcia kreatora): 403 too_fast', async () => {
    const t = setup()
    const result = await send(
      t.deps,
      creatorBody({ formToken: formTokenAged('kreator', NOW, 1_000) }),
    )
    expect(result.status).toBe(403)
    expect(result.body.code).toBe('too_fast')
    // granica: dokładnie minimalny czas przechodzi
    expect(
      (
        await send(
          t.deps,
          creatorBody({ formToken: formTokenAged('kreator', NOW, FORM_TIMING.kreator.minMs) }),
        )
      ).status,
    ).toBe(201)
    expect(
      (
        await send(
          t.deps,
          contactBody({ formToken: formTokenAged('kontakt', NOW, FORM_TIMING.kontakt.minMs - 1) }),
        )
      ).body.code,
    ).toBe('too_fast')
  })

  it('podrobiony, cudzy, przeterminowany albo brakujący token formularza: odrzucenie', async () => {
    const t = setup()
    const forged = formTokenAged('kreator', NOW, 30_000, 'inny-sekret')
    expect((await send(t.deps, creatorBody({ formToken: forged }))).body.code).toBe('rejected')
    // token kontaktu nie otwiera kreatora
    expect(
      (await send(t.deps, creatorBody({ formToken: formTokenAged('kontakt', NOW, 30_000) }))).body
        .code,
    ).toBe('rejected')
    // zmieniony znacznik czasu psuje podpis
    const [v, form, , nonce, sig] = formTokenAged('kreator', NOW, 1_000).split('.')
    expect(
      (
        await send(
          t.deps,
          creatorBody({ formToken: [v, form, NOW - 60_000, nonce, sig].join('.') }),
        )
      ).body.code,
    ).toBe('rejected')
    expect(
      (
        await send(
          t.deps,
          creatorBody({ formToken: formTokenAged('kreator', NOW, FORM_TIMING.maxAgeMs + 1) }),
        )
      ).body.code,
    ).toBe('expired')
    expect((await send(t.deps, creatorBody({ formToken: undefined }))).body.code).toBe('rejected')
    expect(t.inserted).toHaveLength(0)
    expect(t.turnstile).not.toHaveBeenCalled()
  })

  it('złe wartości pól: 400 z błędami pól, bez zużycia tokenu Turnstile i limitów', async () => {
    const t = setup()
    const result = await send(
      t.deps,
      creatorBody({
        data: validCreatorData({
          gem: 'plastik',
          phone: '123',
          engraving: 'www.spam.pl',
          consent: false,
        }),
      }),
    )
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('invalid')
    expect(Object.keys(result.body.fields).sort()).toEqual(['consent', 'engraving', 'gem', 'phone'])
    expect(t.turnstile).not.toHaveBeenCalled()
    expect(t.limits.consume).not.toHaveBeenCalled()
    expect(t.inserted).toHaveLength(0)
  })

  it('brak i zły token Turnstile (prawdziwa funkcja weryfikacji, atrapa sieci): 403, bez limitów i zapisu', async () => {
    const siteverify = vi.fn(async () =>
      Response.json({ success: false, 'error-codes': ['invalid-input-response'] }, { status: 200 }),
    )
    const t = setup({
      verifyTurnstile: (args) =>
        verifyTurnstile({
          ...args,
          secret: 'sekret',
          allowTestingKeys: false,
          fetchImpl: siteverify as unknown as typeof fetch,
        }),
    })
    const missing = await send(t.deps, creatorBody({ turnstileToken: undefined }))
    expect(missing.status).toBe(403)
    expect(siteverify).not.toHaveBeenCalled()
    const bad = await send(t.deps, creatorBody({ turnstileToken: 'podrobiony' }))
    expect(bad.status).toBe(403)
    expect(bad.body.code).toBe('rejected')
    expect(siteverify).toHaveBeenCalledTimes(1)
    expect(t.limits.consume).not.toHaveBeenCalled()
    expect(t.inserted).toHaveLength(0)
  })

  it('Turnstile nieosiągalny: 503 z prośbą o telefon (fail-closed); klucz testowy na produkcji: 503', async () => {
    const down = setup({ verifyTurnstile: async () => ({ ok: false, reason: 'unavailable' }) })
    const result = await send(down.deps, creatorBody())
    expect(result.status).toBe(503)
    expect(result.body.code).toBe('verification_unavailable')
    expect(result.body.message).toMatch(/Zadzwoń lub napisz/)
    expect(down.inserted).toHaveLength(0)

    const testingKey = setup({
      verifyTurnstile: async () => ({ ok: false, reason: 'testing_key_in_production' }),
    })
    expect((await send(testingKey.deps, creatorBody())).status).toBe(503)
    expect(testingKey.inserted).toHaveLength(0)
  })

  it('przekroczony limit IP: 429 z Retry-After, inne IP dalej przechodzi', async () => {
    const t = setup({
      settings: testSettings({ limits: { perIpHour: 2, perDay: 40, visualizationsPerDay: 10 } }),
    })
    expect((await send(t.deps, creatorBody(), { ip: '198.51.100.1' })).status).toBe(201)
    expect((await send(t.deps, contactBody(), { ip: '198.51.100.1' })).status).toBe(201)
    const third = await send(t.deps, creatorBody(), { ip: '198.51.100.1' })
    expect(third.status).toBe(429)
    expect(third.body.code).toBe('rate_limited')
    expect(Number(third.headers.get('retry-after'))).toBeGreaterThan(0)
    expect((await send(t.deps, creatorBody(), { ip: '198.51.100.2' })).status).toBe(201)
    expect(t.inserted).toHaveLength(3)
  })

  it('przekroczony sufit dzienny: 429 daily_limit niezależnie od IP', async () => {
    const t = setup({
      settings: testSettings({ limits: { perIpHour: 5, perDay: 3, visualizationsPerDay: 10 } }),
    })
    for (const ip of ['198.51.100.11', '198.51.100.12', '198.51.100.13']) {
      expect((await send(t.deps, creatorBody(), { ip })).status).toBe(201)
    }
    const fourth = await send(t.deps, contactBody(), { ip: '198.51.100.14' })
    expect(fourth.status).toBe(429)
    expect(fourth.body.code).toBe('daily_limit')
    expect(t.inserted).toHaveLength(3)
  })

  it('nieudany Turnstile nie zużywa limitów (śmieci nie blokują klientów)', async () => {
    const t = setup({
      settings: testSettings({ limits: { perIpHour: 1, perDay: 1, visualizationsPerDay: 10 } }),
      verifyTurnstile: async () => ({ ok: false, reason: 'invalid' }),
    })
    for (let i = 0; i < 5; i++) expect((await send(t.deps, creatorBody())).status).toBe(403)
    expect(t.limits.consume).not.toHaveBeenCalled()
  })
})

describe('POST /api/zgloszenia: przyjęcie', () => {
  it('kreator: 201, szkic z kolejką wizualizacji „czeka”, zgoda i skrót IP, powiadomienie po odpowiedzi', async () => {
    const t = setup()
    const result = await send(t.deps, creatorBody(), {
      ip: '203.0.113.9',
      host: 'preview.example.vercel.app',
    })
    expect(result.status).toBe(201)
    expect(result.body).toMatchObject({ ok: true, code: 'accepted' })

    const [args] = t.turnstile.mock.calls[0]
    expect(args).toMatchObject({
      expectedAction: 'kreator',
      expectedHostname: 'preview.example.vercel.app',
      remoteip: '203.0.113.9',
    })

    expect(t.inserted).toHaveLength(1)
    const draft = t.inserted[0]
    expect(draft).toMatchObject({
      kind: 'creator',
      status: 'draft',
      visualizationStatus: 'waiting',
      notification: 'pending',
      name: 'Test Automatyczny',
      phone: '+48 501 321 347',
      consentText: CONSENT_TEXT.kreator,
      message: 'Zgłoszenie z testów integracyjnych.',
    })
    expect(draft.summary).toContain('Kamień: Szmaragd')
    expect(draft.summary).toContain('Grawer: „A & M 14.06.2027”')
    expect(draft.details).toEqual({
      occasion: 'rocznica',
      when: 'czerwiec 2027',
      gem: 'szmaragd',
      cut: 'serce',
      setting: 'trylogia',
      metal: 'ag',
      width: 'klasyczna',
      pave: 'tak',
      engraving: 'A & M 14.06.2027',
    })
    expect(draft.meta?.ipHash).toBe(hashIp('203.0.113.9', deriveKey(APP_SECRET, 'ip-hash')))
    expect(JSON.stringify(draft)).not.toContain('203.0.113.9')
    expect(draft.meta?.verifiedWithTestKeys).toBe(true)
    expect(draft.meta?.fillSeconds).toBe(30)

    await Promise.all(t.deferred)
    expect(t.accepted).toHaveLength(1)
    expect(t.accepted[0].submission.id).toBe(1)
    expect(t.accepted[0].origin).toBe('http://preview.example.vercel.app')
  })

  it('kontakt: 201, szkic bez wizualizacji, pola innych tematów pominięte', async () => {
    const t = setup()
    const result = await send(
      t.deps,
      contactBody({ data: validContactData({ project: 'Phoebe', email: 'Ania@Example.pl' }) }),
    )
    expect(result.status).toBe(201)
    expect(t.inserted[0]).toMatchObject({
      kind: 'contact',
      topic: 'naprawa',
      visualizationStatus: 'not_applicable',
      email: 'ania@example.pl',
      consentText: CONSENT_TEXT.kontakt,
    })
    expect(t.inserted[0].summary).toBe('Temat: Naprawa lub przeróbka')
  })

  it('błąd bazy przy zapisie: 500 z prośbą o kontakt telefoniczny', async () => {
    const t = setup({
      insertDraft: async () => {
        throw new Error('connection refused')
      },
    })
    const result = await send(t.deps, creatorBody())
    expect(result.status).toBe(500)
    expect(result.body.message).toMatch(/Zadzwoń lub napisz/)
  })
})
