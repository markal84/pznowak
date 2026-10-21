import { randomUUID } from 'node:crypto'

/**
 * Weryfikacja tokenu Cloudflare Turnstile po stronie serwera (siteverify).
 *
 * - limit czasu na próbę i jedna ponowna próba z tym samym `idempotency_key` (łącznie najwyżej kilka sekund),
 * - kontrola `hostname` (host, na którym rozwiązano wyzwanie, musi być hostem, na który przyszło zgłoszenie)
 *   i `action` (kreator / kontakt),
 * - gdy siteverify jest nieosiągalny, wynik to `unavailable`; endpoint przyjmuje wtedy zgłoszenie do kwarantanny
 *   (decyzja Marcina z 20.10.2026), a każdy inny błąd weryfikacji odrzuca.
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

type NetworkOptions = {
  fetchImpl?: typeof fetch
  timeoutMs?: number
  retryDelayMs?: number
}

export type TurnstileOptions = NetworkOptions & {
  token: unknown
  secret: string | undefined
  remoteip?: string
  expectedAction: string
  expectedHostname: string
  /** Fałsz na produkcji Vercela: klucze testowe są tam błędem konfiguracji. */
  allowTestingKeys: boolean
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

/**
 * Jedno logiczne wywołanie siteverify: do dwóch prób z tym samym kluczem idempotencji.
 * Zwraca odpowiedź Cloudflare albo null, gdy usługa nie odpowiedziała sensownie (sieć, czas, 429, 5xx,
 * `internal-error`, odpowiedź nie-JSON). Inne 4xx z JSON-em to odpowiedź (np. zły sekret daje HTTP 400
 * z `invalid-input-secret`), a nie awaria, więc błędna konfiguracja nigdy nie kończy się kwarantanną.
 */
async function callSiteverify(
  payload: Record<string, unknown>,
  { fetchImpl = fetch, timeoutMs = 2_500, retryDelayMs = 400 }: NetworkOptions,
): Promise<SiteverifyResponse | null> {
  const body = JSON.stringify({ ...payload, idempotency_key: randomUUID() })
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    if (attempt > 1) await sleep(retryDelayMs)
    try {
      const response = await fetchImpl(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(timeoutMs),
        cache: 'no-store',
      })
      if (response.status === 429 || response.status >= 500) continue
      const parsed = (await response.json()) as SiteverifyResponse
      // Cloudflare zaleca ponowić próbę przy `internal-error`.
      if (!parsed.success && parsed['error-codes']?.includes('internal-error')) continue
      return parsed
    } catch {
      // przekroczony czas, błąd sieci lub odpowiedź nie-JSON: kolejna próba albo brak odpowiedzi
    }
  }
  return null
}

export async function verifyTurnstile({
  token,
  secret,
  remoteip,
  expectedAction,
  expectedHostname,
  allowTestingKeys,
  ...network
}: TurnstileOptions): Promise<TurnstileResult> {
  if (!secret) return { ok: false, reason: 'not_configured' }
  if (typeof token !== 'string' || !token.trim()) return { ok: false, reason: 'missing' }
  if (token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: 'invalid' }

  const result = await callSiteverify(
    { secret, response: token, ...(remoteip ? { remoteip } : {}) },
    network,
  )
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

/**
 * Czy Cloudflare siteverify odpowiada serwerowi. Używane, gdy przeglądarka nie dostała tokenu (widżet lub skrypt
 * Cloudflare nie zadziałał): kwarantanna tylko przy prawdziwej awarii, a nie przy blokadzie po stronie klienta.
 * Pusty token daje przy działającym Cloudflare odpowiedź `missing-input-response`, czyli „osiągalny”.
 */
export async function siteverifyReachable({
  secret,
  ...network
}: NetworkOptions & { secret: string | undefined }): Promise<boolean> {
  // Bez sekretu nie ma czego sprawdzać; endpoint i tak jest wtedy wyłączony, a kwarantanny nie ma.
  if (!secret) return true
  return (await callSiteverify({ secret, response: '' }, network)) !== null
}
