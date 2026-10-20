import { resolveCmsEnvironment } from '../environment'
import { DEFAULT_LIMITS, type LimitSettings } from './limits'

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
  /** Klucze testowe Cloudflare są dozwolone wszędzie poza produkcją Vercela. */
  allowTestingKeys: boolean
  /** Sekret aplikacji (PAYLOAD_SECRET), z którego wyprowadzane są klucze HMAC. */
  appSecret: string
  limits: LimitSettings
  visualizations: VisualizationSettings
  notifyTo: string | undefined
  namespace: string
}

type Env = Record<string, string | undefined>

function positiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100_000 ? parsed : fallback
}

const clean = (value: string | undefined) => value?.trim() || undefined

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
    allowTestingKeys: env.VERCEL_ENV !== 'production',
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
    },
    visualizations,
    notifyTo: clean(env.SUBMISSIONS_NOTIFY_TO),
    namespace: visualizations.namespace,
  }
}
