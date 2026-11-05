import { resolveCmsEnvironment } from '../environment'
import { siteEnvironment } from '../indexing'
import { siteUrl } from '../seo'
import { RING_CREATOR_ENABLED } from '../site'
import { DEFAULT_LIMITS, type LimitSettings } from './limits'
import type { ClientIpSource } from './request'

/**
 * Ustawienia zgłoszeń ze zmiennych środowiskowych. Klucze Turnstile są tylko w env (Vercel: osobno Preview
 * i Production, lokalnie `.env.local`); przejście na produkcję to podmiana kluczy, bez zmian w kodzie.
 *
 * - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` – klucz witryny (publiczny); bez niego formularze nie wysyłają.
 * - `TURNSTILE_SECRET_KEY` – sekret do siteverify; bez niego endpoint odpowiada 503 (fail-closed).
 * - `SUBMISSIONS_LIMIT_PER_IP_HOUR`, `SUBMISSIONS_LIMIT_PER_DAY`, `VISUALIZATIONS_LIMIT_PER_DAY` – limity
 *   (domyślnie 5 / 40 / 10).
 * - `VISUALIZATIONS_MODE` – `manual` (domyślnie: tylko zatwierdzone przez pracownię) albo `auto`.
 * - `SUBMISSIONS_NOTIFY_TO` – adres pracowni dla powiadomień; bez niego powiadomienia są pomijane.
 * - `LIMITS_NAMESPACE` – przedrostek kluczy liczników (domyślnie pusty); testy na wspólnej bazie
 *   stagingowej używają własnego, żeby nie ruszać liczników preview.
 * - `CLIENT_IP_HEADER` – skąd brać adres klienta do limitów (tylko z nagłówka, który ustawia zaufane proxy):
 *   brak = jak na Vercelu (`x-real-ip`, potem pierwszy wpis `x-forwarded-for`); `cf-connecting-ip` – ruch na pewno
 *   przez Cloudflare (rekord DNS „proxied”); `x-forwarded-for` – wpis dopisany przez proxy przed aplikacją,
 *   `CLIENT_IP_PROXY_HOPS` mówi, ile zaufanych proxy dopisuje wpisy (domyślnie 1 = ostatni wpis); każda inna nazwa
 *   (np. `x-real-ip`) – dokładnie ten nagłówek. Szczegóły i wybór dla MyDevil: opis PR zlecenia X.
 * - `SITE_ENV` (albo na Vercelu `VERCEL_ENV`) – `production` wyłącza klucze testowe Turnstile, a linki do panelu
 *   w mailach biorą adres z `SITE_URL` (domyślnie https://pznowak.pl), nie z nagłówków żądania. Bez obu zmiennych
 *   o produkcji decyduje `NODE_ENV=production` (`next start`), żeby pominięta zmienna nie otwierała kluczy testowych.
 * - `ATTACHMENTS_ENABLED` – zdjęcia w formularzu kontaktowym (`1`/`true`; domyślnie wyłączone). Magazyn plików:
 *   `src/lib/attachments/config.ts`. Limity plików na dobę: `ATTACHMENTS_LIMIT_FILES_PER_IP_DAY`,
 *   `ATTACHMENTS_LIMIT_MB_PER_IP_DAY`, `ATTACHMENTS_LIMIT_FILES_PER_DAY`, `ATTACHMENTS_LIMIT_MB_PER_DAY`
 *   (domyślnie 15 / 40 / 100 / 300).
 */

export type VisualizationMode = 'manual' | 'auto'

export type VisualizationSettings = {
  limit: number
  mode: VisualizationMode
  /** Przedrostek kluczy liczników; testy używają własnego, produkcja pustego. */
  namespace: string
}

export type SubmissionSettings = {
  turnstileSecret: string | undefined
  /** Klucze testowe Cloudflare są dozwolone wszędzie poza produkcją (`isProductionRuntime`). */
  allowTestingKeys: boolean
  /** Źródło adresu klienta do limitów (`CLIENT_IP_HEADER`). */
  clientIpSource: ClientIpSource
  /** Adres strony do linków w mailach; `null` = z nagłówków żądania (tylko poza produkcją). */
  publicOrigin: string | null
  /** Sekret aplikacji (PAYLOAD_SECRET), z którego wyprowadzane są klucze HMAC. */
  appSecret: string
  limits: LimitSettings
  visualizations: VisualizationSettings
  notifyTo: string | undefined
  namespace: string
  /** Czy endpoint przyjmuje formularz kreatora (RING_CREATOR_ENABLED w site.ts; ukryty kreator = 404). */
  creatorEnabled: boolean
  /** Przełącznik zdjęć w formularzu kontaktowym; bez magazynu plików zgłoszenia idą bez zdjęć. */
  attachmentsEnabled: boolean
}

type Env = Record<string, string | undefined>

function positiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100_000 ? parsed : fallback
}

const clean = (value: string | undefined) => value?.trim() || undefined

/**
 * Czy to produkcja: `SITE_ENV` (albo `VERCEL_ENV`) = `production`, a gdy żadna z nich nie jest ustawiona,
 * `NODE_ENV=production`. Ta druga reguła zamyka klucze testowe i adres z nagłówków na serwerze, na którym ktoś
 * zapomniał `SITE_ENV`; podgląd na Vercelu ma zawsze `VERCEL_ENV=preview`, a `next dev` ma `NODE_ENV=development`.
 */
export function isProductionRuntime(env: Env = process.env): boolean {
  const site = siteEnvironment(env.SITE_ENV, env.VERCEL_ENV)
  return site ? site === 'production' : env.NODE_ENV === 'production'
}

const HEADER_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/
let warnedIpHeader = false

/** `CLIENT_IP_HEADER` + `CLIENT_IP_PROXY_HOPS`; niepoprawna nazwa nagłówka = domyślne źródło i ostrzeżenie w logu. */
export function clientIpSourceFromEnv(env: Env = process.env): ClientIpSource {
  const header = clean(env.CLIENT_IP_HEADER)?.toLowerCase()
  if (!header) return { kind: 'legacy' }
  if (!HEADER_NAME.test(header)) {
    if (!warnedIpHeader)
      console.warn('[zgloszenia] niepoprawny CLIENT_IP_HEADER, używam domyślnego')
    warnedIpHeader = true
    return { kind: 'legacy' }
  }
  if (header === 'x-forwarded-for') {
    const hops = Number(clean(env.CLIENT_IP_PROXY_HOPS) ?? '1')
    return {
      kind: 'forwarded-for',
      hops: Number.isInteger(hops) && hops >= 1 && hops <= 5 ? hops : 1,
    }
  }
  return { kind: 'header', header }
}

/** `ATTACHMENTS_ENABLED`: tylko `1` albo `true` włącza; wszystko inne (także brak) to wyłączone. */
export function attachmentsFlag(env: Env = process.env): boolean {
  const value = env.ATTACHMENTS_ENABLED?.trim().toLowerCase()
  return value === '1' || value === 'true'
}

export function visualizationSettingsFromEnv(env: Env = process.env): VisualizationSettings {
  return {
    limit: positiveInt(env.VISUALIZATIONS_LIMIT_PER_DAY, DEFAULT_LIMITS.visualizationsPerDay),
    mode: env.VISUALIZATIONS_MODE?.trim() === 'auto' ? 'auto' : 'manual',
    namespace: clean(env.LIMITS_NAMESPACE) ?? '',
  }
}

export function submissionSettingsFromEnv(env: Env = process.env): SubmissionSettings {
  const visualizations = visualizationSettingsFromEnv(env)
  return {
    turnstileSecret: clean(env.TURNSTILE_SECRET_KEY),
    allowTestingKeys: !isProductionRuntime(env),
    clientIpSource: clientIpSourceFromEnv(env),
    publicOrigin: isProductionRuntime(env) ? siteUrl(env.SITE_URL) : null,
    appSecret: resolveCmsEnvironment({
      blobReadWriteToken: env.BLOB_READ_WRITE_TOKEN,
      databaseUrl: env.DATABASE_URL,
      nodeEnv: env.NODE_ENV,
      payloadSecret: env.PAYLOAD_SECRET,
    }).payloadSecret,
    limits: {
      perIpHour: positiveInt(env.SUBMISSIONS_LIMIT_PER_IP_HOUR, DEFAULT_LIMITS.perIpHour),
      perDay: positiveInt(env.SUBMISSIONS_LIMIT_PER_DAY, DEFAULT_LIMITS.perDay),
      visualizationsPerDay: visualizations.limit,
      // Limity kwarantanny są stałe (nie z env): to bezpiecznik na czas awarii, a nie ustawienie do strojenia.
      quarantinePerIpHour: DEFAULT_LIMITS.quarantinePerIpHour,
      quarantinePerDay: DEFAULT_LIMITS.quarantinePerDay,
      attachmentFilesPerIpDay: positiveInt(
        env.ATTACHMENTS_LIMIT_FILES_PER_IP_DAY,
        DEFAULT_LIMITS.attachmentFilesPerIpDay,
      ),
      attachmentMbPerIpDay: positiveInt(
        env.ATTACHMENTS_LIMIT_MB_PER_IP_DAY,
        DEFAULT_LIMITS.attachmentMbPerIpDay,
      ),
      attachmentFilesPerDay: positiveInt(
        env.ATTACHMENTS_LIMIT_FILES_PER_DAY,
        DEFAULT_LIMITS.attachmentFilesPerDay,
      ),
      attachmentMbPerDay: positiveInt(
        env.ATTACHMENTS_LIMIT_MB_PER_DAY,
        DEFAULT_LIMITS.attachmentMbPerDay,
      ),
    },
    visualizations,
    notifyTo: clean(env.SUBMISSIONS_NOTIFY_TO),
    namespace: visualizations.namespace,
    creatorEnabled: RING_CREATOR_ENABLED,
    attachmentsEnabled: attachmentsFlag(env),
  }
}
