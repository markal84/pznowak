import { isIP } from 'node:net'

/**
 * Dane z żądania HTTP, którym można ufać tylko tyle, ile ufa się serwerowi przed aplikacją (Vercel, Cloudflare,
 * nginx MyDevil). Wspólne dla zgłoszeń i zdjęć.
 */

/**
 * Skąd brać adres klienta (zmienne `CLIENT_IP_HEADER` i `CLIENT_IP_PROXY_HOPS`, `src/lib/submissions/config.ts`).
 * - `legacy` (bez zmiennej): `x-real-ip`, a bez niego pierwszy wpis `x-forwarded-for`. Bezpieczne tylko tam,
 *   gdzie te nagłówki nadpisuje platforma (Vercel); za zwykłym proxy klient może je podać sam.
 * - `header`: jeden nagłówek ustawiany przez zaufane proxy, np. `cf-connecting-ip` (Cloudflare) albo `x-real-ip`.
 * - `x-forwarded-for` z `hops`: wpis dopisany przez N-te zaufane proxy licząc od końca listy (1 = ostatni wpis,
 *   czyli adres, z którego połączyło się najbliższe proxy). Wpisów z początku listy klient może dopisać dowolnie.
 */
export type ClientIpSource =
  { kind: 'legacy' } | { kind: 'header'; header: string } | { kind: 'forwarded-for'; hops: number }

/** Sam adres IP (bez portu i nawiasów) albo null, gdy wartość nie jest adresem. */
export function cleanIp(raw: string | null | undefined): string | null {
  let value = raw?.trim()
  if (!value || value.length > 64) return null
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(value)
  if (bracketed) value = bracketed[1]
  else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(value)) value = value.replace(/:\d+$/, '')
  return isIP(value) ? value : null
}

/** Adres klienta według skonfigurowanego źródła; null, gdy nagłówka nie ma albo nie zawiera adresu IP. */
export function clientIp(
  headers: Headers,
  source: ClientIpSource = { kind: 'legacy' },
): string | null {
  if (source.kind === 'header') return cleanIp(headers.get(source.header))
  const forwarded = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (source.kind === 'forwarded-for') return cleanIp(forwarded[forwarded.length - source.hops])
  return cleanIp(headers.get('x-real-ip')) ?? cleanIp(forwarded[0])
}

const IP_HEADERS = [
  'cf-connecting-ip',
  'true-client-ip',
  'x-real-ip',
  'x-forwarded-for',
  'forwarded',
] as const

/**
 * Opis nagłówków z adresem klienta do jednorazowego wpisu w logu: same nazwy i liczba wpisów w `x-forwarded-for`,
 * nigdy wartości. Pozwala po wdrożeniu na nowym hostingu dobrać `CLIENT_IP_HEADER` bez zgadywania.
 */
export function describeIpHeaders(headers: Headers, resolved: boolean): string {
  const entries = (name: string) =>
    (headers.get(name) ?? '').split(',').filter((part) => part.trim()).length
  const present = IP_HEADERS.filter((name) => headers.get(name)).map((name) =>
    name === 'x-forwarded-for' ? `${name} (wpisów: ${entries(name)})` : name,
  )
  const result = resolved
    ? 'odczytany'
    : 'NIEODCZYTANY (wspólny limit dla wszystkich – sprawdź CLIENT_IP_HEADER)'
  return `nagłówki adresu klienta: ${present.join(', ') || 'brak'}; adres ${result}`
}

/** Host, na który przyszło zgłoszenie; Turnstile musi być rozwiązany na tym samym hoście. */
export function requestHostname(request: Request): string {
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    new URL(request.url).host
  return host.split(',')[0].trim().replace(/:\d+$/, '').toLowerCase()
}

/**
 * Adres strony według nagłówków żądania. Do linków w mailach tylko poza produkcją: za zwykłym proxy klient może
 * podać własny `X-Forwarded-Host`, dlatego produkcja bierze adres z konfiguracji (`SubmissionSettings.publicOrigin`).
 */
export function requestOrigin(request: Request): string {
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    new URL(request.url).protocol.replace(':', '')
  return `${proto}://${request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host}`
}

/** Adres do linków w mailach: z konfiguracji, gdy jest, a w przeciwnym razie z żądania. */
export const linkOrigin = (request: Request, publicOrigin: string | null) =>
  publicOrigin ?? requestOrigin(request)

/**
 * Treść żądania, najwyżej `limit` bajtów; `null`, gdy klient przysłał więcej. Czyta strumień kawałkami i przerywa
 * po przekroczeniu limitu, więc także żądanie bez `Content-Length` (chunked) nie zajmie więcej pamięci.
 */
export async function readLimited(request: Request, limit: number): Promise<Buffer | null> {
  if (!request.body) return Buffer.alloc(0)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel().catch(() => undefined)
      return null
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks, total)
}

/**
 * Komunikat błędu do logu bez danych klienta: tylko pierwsza linijka i najwyżej 200 znaków. Błąd zapytania
 * (drizzle) ma w drugiej linijce parametry, czyli imię, telefon i treść wiadomości.
 */
export function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return Array.from(message.split('\n')[0]).slice(0, 200).join('')
}
