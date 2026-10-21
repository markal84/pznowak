/**
 * Okna limitów. Liczniki są w tabeli `cms_limit_counters` (migracja etapu 2); klucz zawiera okno czasowe,
 * więc stary licznik nigdy nie jest używany ponownie, a sprzątanie usuwa wiersze po `expires_at`.
 */

export type LimitScope = 'ip' | 'day' | 'quarantine' | 'visualizations' | 'attachments'

export type LimitBucket = {
  key: string
  limit: number
  ttlSeconds: number
  scope: LimitScope
  /** O ile zwiększyć licznik (domyślnie 1); liczniki rozmiaru plików liczą kilobajty. */
  amount?: number
}

export type LimitSettings = {
  /** Zgłoszeń z jednego adresu IP w ciągu godziny zegarowej (oba formularze razem). */
  perIpHour: number
  /** Globalny sufit przyjętych zgłoszeń na dobę (czas polski). */
  perDay: number
  /** Twardy dzienny limit uruchomionych wizualizacji (czas polski). */
  visualizationsPerDay: number
  /**
   * Kwarantanna (Turnstile niedostępny): najwyżej tyle zgłoszeń bez weryfikacji z jednego IP na godzinę
   * i łącznie na dobę. Liczone dodatkowo do zwykłych limitów, żeby awaria Cloudflare nie pozwoliła botom
   * wyczerpać dziennego sufitu prawdziwym klientom.
   */
  quarantinePerIpHour: number
  quarantinePerDay: number
  /**
   * Załączniki (zdjęcia w formularzu kontaktowym), na dobę w czasie polskim: liczba plików i łączny rozmiar (MB)
   * z jednego IP oraz łącznie. Liczone razem ze zgłoszeniem, w tej samej transakcji co limity zgłoszeń.
   */
  attachmentFilesPerIpDay: number
  attachmentMbPerIpDay: number
  attachmentFilesPerDay: number
  attachmentMbPerDay: number
}

export const DEFAULT_LIMITS: LimitSettings = {
  perIpHour: 5,
  perDay: 40,
  visualizationsPerDay: 10,
  quarantinePerIpHour: 1,
  quarantinePerDay: 10,
  // Trzy pełne zgłoszenia po 5 zdjęć z jednego połączenia; łącznie tyle, ile realnie przysyła pracownia w tydzień.
  attachmentFilesPerIpDay: 15,
  attachmentMbPerIpDay: 40,
  attachmentFilesPerDay: 100,
  attachmentMbPerDay: 300,
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

/**
 * Tożsamość do limitu IP. IPv6 liczymy po prefiksie /64: jedna sieć domowa lub serwer dostaje cały blok /64,
 * więc zmiana adresu w jego obrębie nie może obchodzić limitu. IPv4 (także zapisany jako ::ffff:a.b.c.d) bez zmian.
 */
export function ipLimitIdentity(ip: string): string {
  const address = ip
    .trim()
    .replace(/^\[|\]$/g, '')
    .replace(/%.*$/, '')
    .toLowerCase()
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(address)
  if (mapped) return mapped[1]
  if (!address.includes(':')) return address
  const [head, tail] = address.split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups =
    tail === undefined
      ? left
      : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right]
  return `${groups
    .slice(0, 4)
    .map((g) => g.padStart(4, '0'))
    .join(':')}::/64`
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

/** Dodatkowe liczniki dla zgłoszeń przyjętych bez weryfikacji (kwarantanna). */
export function quarantineBuckets(
  namespace: string,
  ipHash: string,
  now: Date,
  limits: LimitSettings,
): LimitBucket[] {
  return [
    {
      key: `${namespace}kwarantanna-ip:${ipHash}:${utcHour(now)}`,
      limit: limits.quarantinePerIpHour,
      ttlSeconds: 2 * 3600,
      scope: 'quarantine',
    },
    {
      key: `${namespace}kwarantanna-dzien:${warsawDay(now)}`,
      limit: limits.quarantinePerDay,
      ttlSeconds: 3 * 86400,
      scope: 'quarantine',
    },
  ]
}

/**
 * Liczniki załączników zgłoszenia: pliki i kilobajty (zapowiedziane rozmiary, a każdy bilet przyjmuje najwyżej
 * zapowiedziany rozmiar), z jednego IP i łącznie na dobę.
 */
export function attachmentBuckets(
  namespace: string,
  ipHash: string,
  now: Date,
  limits: LimitSettings,
  sizes: number[],
): LimitBucket[] {
  const day = warsawDay(now)
  const files = sizes.length
  const kib = sizes.reduce((sum, size) => sum + Math.ceil(size / 1024), 0)
  const ttlSeconds = 3 * 86400
  return [
    {
      key: `${namespace}zalaczniki-ip:${ipHash}:${day}`,
      limit: limits.attachmentFilesPerIpDay,
      amount: files,
      ttlSeconds,
      scope: 'attachments',
    },
    {
      key: `${namespace}zalaczniki-ip-kb:${ipHash}:${day}`,
      limit: limits.attachmentMbPerIpDay * 1024,
      amount: kib,
      ttlSeconds,
      scope: 'attachments',
    },
    {
      key: `${namespace}zalaczniki-dzien:${day}`,
      limit: limits.attachmentFilesPerDay,
      amount: files,
      ttlSeconds,
      scope: 'attachments',
    },
    {
      key: `${namespace}zalaczniki-dzien-kb:${day}`,
      limit: limits.attachmentMbPerDay * 1024,
      amount: kib,
      ttlSeconds,
      scope: 'attachments',
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
