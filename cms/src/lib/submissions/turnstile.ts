import { randomUUID } from 'node:crypto'

/**
 * Weryfikacja tokenu Cloudflare Turnstile po stronie serwera (siteverify).
 *
 * - limit czasu na próbę i jedna ponowna próba z tym samym `idempotency_key` (łącznie najwyżej kilka sekund),
 * - kontrola `hostname` (host, na którym rozwiązano wyzwanie, musi być hostem, na który przyszło zgłoszenie)
 *   i `action` (kreator / kontakt),
 * - fail-closed: gdy siteverify jest nieosiągalny, zgłoszenie jest odrzucane (decyzja do potwierdzenia przez Marcina).
 *
 * Klucze testowe Cloudflare przepuszczają każdy token i zwracają `hostname: "example.com"` bez `action`
 * (sprawdzone na żywo), więc dla nich kontrola hosta i akcji jest pomijana, a na produkcji są odrzucane.
 */

export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export type TurnstileFailure =
  | 'not_configured'
  | 'missing'
  | 'invalid'
  | 'hostname'
  | 'action'
  | 'testing_key_in_production'
  | 'unavailable'

export type TurnstileResult =
  { ok: true; testing: boolean } | { ok: false; reason: TurnstileFailure; codes?: string[] }

export type TurnstileOptions = {
  token: unknown
  secret: string | undefined
  remoteip?: string
  expectedAction: string
  expectedHostname: string
  /** Fałsz na produkcji Vercela: klucze testowe są tam błędem konfiguracji. */
  allowTestingKeys: boolean
  fetchImpl?: typeof fetch
  timeoutMs?: number
  retryDelayMs?: number
}

type SiteverifyResponse = {
  success?: boolean
  'error-codes'?: string[]
  hostname?: string
  action?: string
  metadata?: { result_with_testing_key?: boolean }
}

const MAX_TOKEN_LENGTH = 2048
const ATTEMPTS = 2

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function verifyTurnstile({
  token,
  secret,
  remoteip,
  expectedAction,
  expectedHostname,
  allowTestingKeys,
  fetchImpl = fetch,
  timeoutMs = 2_500,
  retryDelayMs = 400,
}: TurnstileOptions): Promise<TurnstileResult> {
  if (!secret) return { ok: false, reason: 'not_configured' }
  if (typeof token !== 'string' || !token.trim()) return { ok: false, reason: 'missing' }
  if (token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: 'invalid' }

  const body = JSON.stringify({
    secret,
    response: token,
    ...(remoteip ? { remoteip } : {}),
    idempotency_key: randomUUID(),
  })

  let result: SiteverifyResponse | null = null
  for (let attempt = 1; attempt <= ATTEMPTS && !result; attempt++) {
    if (attempt > 1) await sleep(retryDelayMs)
    try {
      const response = await fetchImpl(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(timeoutMs),
        cache: 'no-store',
      })
      if (!response.ok) continue
      const parsed = (await response.json()) as SiteverifyResponse
      // Cloudflare zaleca ponowić próbę przy `internal-error`.
      if (!parsed.success && parsed['error-codes']?.includes('internal-error')) continue
      result = parsed
    } catch {
      // przekroczony czas, błąd sieci lub odpowiedź nie-JSON: kolejna próba albo fail-closed
    }
  }

  if (!result) return { ok: false, reason: 'unavailable' }
  if (!result.success) return { ok: false, reason: 'invalid', codes: result['error-codes'] ?? [] }

  if (result.metadata?.result_with_testing_key) {
    return allowTestingKeys
      ? { ok: true, testing: true }
      : { ok: false, reason: 'testing_key_in_production' }
  }
  if (!expectedHostname || result.hostname?.toLowerCase() !== expectedHostname.toLowerCase()) {
    return { ok: false, reason: 'hostname' }
  }
  if (result.action !== expectedAction) return { ok: false, reason: 'action' }
  return { ok: true, testing: false }
}
