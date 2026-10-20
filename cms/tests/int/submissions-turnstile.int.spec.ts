import { describe, expect, it, vi } from 'vitest'

import {
  SITEVERIFY_URL,
  siteverifyReachable,
  verifyTurnstile,
  type TurnstileOptions,
} from '@/lib/submissions/turnstile'
import {
  DUMMY_TOKEN,
  TEST_SECRET_FAIL,
  TEST_SECRET_PASS,
  TEST_SECRET_SPENT,
} from './helpers/submissions'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const base = (
  fetchImpl: typeof fetch,
  overrides: Partial<TurnstileOptions> = {},
): TurnstileOptions => ({
  token: 'prawdziwy-token',
  secret: 'sekret-produkcyjny',
  remoteip: '203.0.113.7',
  expectedAction: 'kreator',
  expectedHostname: 'pznowak.pl',
  allowTestingKeys: false,
  fetchImpl,
  timeoutMs: 200,
  retryDelayMs: 10,
  ...overrides,
})

describe('weryfikacja Turnstile (atrapa siteverify)', () => {
  it('przyjmuje token z właściwym hostem i akcją, wysyła sekret, IP i klucz idempotencji', async () => {
    const fetchImpl = vi.fn(async () =>
      json({ success: true, hostname: 'pznowak.pl', action: 'kreator' }),
    )
    await expect(verifyTurnstile(base(fetchImpl))).resolves.toEqual({ ok: true, testing: false })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(SITEVERIFY_URL)
    const body = JSON.parse(String(init.body))
    expect(body).toMatchObject({
      secret: 'sekret-produkcyjny',
      response: 'prawdziwy-token',
      remoteip: '203.0.113.7',
    })
    expect(body.idempotency_key).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('brak tokenu lub za długi token: odrzucenie bez zapytania do Cloudflare', async () => {
    const fetchImpl = vi.fn()
    for (const token of [undefined, '', '   ', 42]) {
      await expect(
        verifyTurnstile(base(fetchImpl as unknown as typeof fetch, { token })),
      ).resolves.toEqual({ ok: false, reason: 'missing' })
    }
    await expect(
      verifyTurnstile(base(fetchImpl as unknown as typeof fetch, { token: 'x'.repeat(2049) })),
    ).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('brak sekretu: wysyłka wyłączona (fail-closed)', async () => {
    const fetchImpl = vi.fn()
    await expect(
      verifyTurnstile(base(fetchImpl as unknown as typeof fetch, { secret: undefined })),
    ).resolves.toEqual({
      ok: false,
      reason: 'not_configured',
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('zły token: odrzucenie z kodami błędu Cloudflare', async () => {
    const fetchImpl = vi.fn(async () =>
      json({ success: false, 'error-codes': ['invalid-input-response'] }),
    )
    await expect(verifyTurnstile(base(fetchImpl))).resolves.toEqual({
      ok: false,
      reason: 'invalid',
      codes: ['invalid-input-response'],
    })
  })

  it('token rozwiązany na innym hoście albo z inną akcją: odrzucenie', async () => {
    const otherHost = vi.fn(async () =>
      json({ success: true, hostname: 'oszust.example', action: 'kreator' }),
    )
    await expect(verifyTurnstile(base(otherHost))).resolves.toEqual({
      ok: false,
      reason: 'hostname',
    })
    const otherAction = vi.fn(async () =>
      json({ success: true, hostname: 'pznowak.pl', action: 'kontakt' }),
    )
    await expect(verifyTurnstile(base(otherAction))).resolves.toEqual({
      ok: false,
      reason: 'action',
    })
  })

  it('klucze testowe: przechodzą poza produkcją, na produkcji są odrzucane', async () => {
    const testing = vi.fn(async () =>
      json({ success: true, hostname: 'example.com', metadata: { result_with_testing_key: true } }),
    )
    await expect(verifyTurnstile(base(testing, { allowTestingKeys: true }))).resolves.toEqual({
      ok: true,
      testing: true,
    })
    await expect(verifyTurnstile(base(testing, { allowTestingKeys: false }))).resolves.toEqual({
      ok: false,
      reason: 'testing_key_in_production',
    })
  })

  it('awaria Cloudflare (5xx, internal-error) potem sukces: jedna ponowna próba z tym samym kluczem idempotencji', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({ success: false, 'error-codes': ['internal-error'] }))
      .mockResolvedValueOnce(json({ success: true, hostname: 'pznowak.pl', action: 'kreator' }))
    await expect(verifyTurnstile(base(fetchImpl as unknown as typeof fetch))).resolves.toEqual({
      ok: true,
      testing: false,
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const keys = fetchImpl.mock.calls.map(
      ([, init]) => JSON.parse(String((init as RequestInit).body)).idempotency_key,
    )
    expect(keys[0]).toBe(keys[1])

    const serverError = vi
      .fn()
      .mockResolvedValueOnce(json({}, 502))
      .mockResolvedValueOnce(json({ success: true, hostname: 'pznowak.pl', action: 'kreator' }))
    await expect(verifyTurnstile(base(serverError as unknown as typeof fetch))).resolves.toEqual({
      ok: true,
      testing: false,
    })
  })

  it('zły sekret (HTTP 400 z JSON-em od Cloudflare) to odpowiedź, nie awaria: odrzucenie bez kwarantanny', async () => {
    const badSecret = vi.fn(async () =>
      json({ success: false, 'error-codes': ['invalid-input-secret'] }, 400),
    )
    await expect(verifyTurnstile(base(badSecret))).resolves.toEqual({
      ok: false,
      reason: 'invalid',
      codes: ['invalid-input-secret'],
    })
    expect(badSecret).toHaveBeenCalledTimes(1)
  })

  it('siteverify przeciążony (429) dwa razy: wynik unavailable', async () => {
    const busy = vi.fn(async () => json({}, 429))
    await expect(verifyTurnstile(base(busy))).resolves.toEqual({ ok: false, reason: 'unavailable' })
    expect(busy).toHaveBeenCalledTimes(2)
  })

  it('siteverify nieosiągalny lub milczy: wynik unavailable (kwarantanna) po dwóch próbach, w granicach kilku sekund', async () => {
    const down = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    await expect(verifyTurnstile(base(down))).resolves.toEqual({ ok: false, reason: 'unavailable' })
    expect(down).toHaveBeenCalledTimes(2)

    // zawieszone połączenie: każda próba przerwana po timeoutMs (AbortSignal.timeout)
    const hanging = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('timeout', 'TimeoutError')),
          )
        }),
    )
    const started = Date.now()
    await expect(verifyTurnstile(base(hanging as unknown as typeof fetch))).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    })
    expect(hanging).toHaveBeenCalledTimes(2)
    expect(Date.now() - started).toBeLessThan(2_000)

    const notJson = vi.fn(async () => new Response('<html>błąd</html>', { status: 200 }))
    await expect(verifyTurnstile(base(notJson))).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })
})

describe('czy Cloudflare odpowiada serwerowi (zgłoszenie bez tokenu)', () => {
  const network = { timeoutMs: 200, retryDelayMs: 10 }

  it('pusty token z odpowiedzią Cloudflare (także 400 przy złym sekrecie): osiągalny, więc bez kwarantanny', async () => {
    const working = vi.fn(async () =>
      json({ success: false, 'error-codes': ['missing-input-response'] }),
    )
    await expect(
      siteverifyReachable({ ...network, secret: 'sekret', fetchImpl: working }),
    ).resolves.toBe(true)
    const [, init] = working.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({ secret: 'sekret', response: '' })

    const badSecret = vi.fn(async () =>
      json({ success: false, 'error-codes': ['invalid-input-secret'] }, 400),
    )
    await expect(
      siteverifyReachable({ ...network, secret: 'zly', fetchImpl: badSecret }),
    ).resolves.toBe(true)
  })

  it('bez sekretu: osiągalny bez pytania sieci (brak konfiguracji nigdy nie daje kwarantanny)', async () => {
    const fetchImpl = vi.fn()
    await expect(
      siteverifyReachable({
        ...network,
        secret: undefined,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toBe(true)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('sieć, 5xx albo cisza po dwóch próbach: nieosiągalny', async () => {
    const down = vi.fn(async () => {
      throw new TypeError('fetch failed')
    })
    await expect(siteverifyReachable({ ...network, secret: 's', fetchImpl: down })).resolves.toBe(
      false,
    )
    expect(down).toHaveBeenCalledTimes(2)
    const serverError = vi.fn(async () => json({}, 503))
    await expect(
      siteverifyReachable({ ...network, secret: 's', fetchImpl: serverError }),
    ).resolves.toBe(false)
  })
})

describe('weryfikacja Turnstile na żywo (klucze testowe Cloudflare)', () => {
  const live = {
    remoteip: '203.0.113.7',
    expectedAction: 'kreator',
    expectedHostname: 'localhost',
    allowTestingKeys: true,
  }

  it('klucz „zawsze przechodzi” przyjmuje token testowy', async () => {
    await expect(
      verifyTurnstile({ ...live, token: DUMMY_TOKEN, secret: TEST_SECRET_PASS }),
    ).resolves.toEqual({ ok: true, testing: true })
  })

  it('klucz „zawsze odrzuca” odrzuca token', async () => {
    const result = await verifyTurnstile({ ...live, token: DUMMY_TOKEN, secret: TEST_SECRET_FAIL })
    expect(result).toEqual({ ok: false, reason: 'invalid', codes: ['invalid-input-response'] })
  })

  it('klucz „token zużyty” zwraca timeout-or-duplicate', async () => {
    const result = await verifyTurnstile({ ...live, token: DUMMY_TOKEN, secret: TEST_SECRET_SPENT })
    expect(result).toEqual({ ok: false, reason: 'invalid', codes: ['timeout-or-duplicate'] })
  })

  it('Cloudflare odpowiada na pusty token: osiągalny (zgłoszenie bez tokenu nie trafi do kwarantanny)', async () => {
    await expect(siteverifyReachable({ secret: TEST_SECRET_PASS })).resolves.toBe(true)
  })

  it('token testowy z kluczem produkcyjnym środowiska (allowTestingKeys=false) jest odrzucany', async () => {
    const result = await verifyTurnstile({
      ...live,
      allowTestingKeys: false,
      token: DUMMY_TOKEN,
      secret: TEST_SECRET_PASS,
    })
    expect(result).toEqual({ ok: false, reason: 'testing_key_in_production' })
  })
})
