/**
 * Okna limitów. Liczniki są w tabeli `cms_limit_counters` (migracja etapu 2); klucz zawiera okno czasowe,
 * więc stary licznik nigdy nie jest używany ponownie, a sprzątanie usuwa wiersze po `expires_at`.
 */

export type LimitScope = 'ip' | 'day' | 'visualizations'

export type LimitBucket = {
  key: string
  limit: number
  ttlSeconds: number
  scope: LimitScope
}

export type LimitSettings = {
  /** Zgłoszeń z jednego adresu IP w ciągu godziny zegarowej (oba formularze razem). */
  perIpHour: number
  /** Globalny sufit przyjętych zgłoszeń na dobę (czas polski). */
  perDay: number
  /** Twardy dzienny limit uruchomionych wizualizacji (czas polski). */
  visualizationsPerDay: number
}

export const DEFAULT_LIMITS: LimitSettings = {
  perIpHour: 5,
  perDay: 40,
  visualizationsPerDay: 10,
}

const warsawDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Warsaw',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Data kalendarzowa w Polsce, np. „2026-10-20”. Doba zmienia się o północy czasu polskiego. */
export function warsawDay(date: Date): string {
  return warsawDate.format(date)
}

/** Godzina zegarowa UTC, np. „2026-10-20T17”. */
export function utcHour(date: Date): string {
  return date.toISOString().slice(0, 13)
}

export function submissionBuckets(
  namespace: string,
  ipHash: string,
  now: Date,
  limits: LimitSettings,
): LimitBucket[] {
  return [
    {
      key: `${namespace}ip:${ipHash}:${utcHour(now)}`,
      limit: limits.perIpHour,
      ttlSeconds: 2 * 3600,
      scope: 'ip',
    },
    {
      key: `${namespace}dzien:${warsawDay(now)}`,
      limit: limits.perDay,
      ttlSeconds: 3 * 86400,
      scope: 'day',
    },
  ]
}

export function visualizationBucket(namespace: string, now: Date, limit: number): LimitBucket {
  return {
    key: `${namespace}wizualizacje:${warsawDay(now)}`,
    limit,
    ttlSeconds: 3 * 86400,
    scope: 'visualizations',
  }
}

/** Sekundy do końca bieżącej godziny UTC (nagłówek Retry-After przy limicie IP). */
export function secondsToNextHour(now: Date): number {
  const next = new Date(now)
  next.setUTCMinutes(60, 0, 0)
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000))
}
