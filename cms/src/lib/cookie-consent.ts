import { COOKIE_BANNER_ENABLED } from '@/lib/site'

/**
 * Zgoda na pliki cookies (RODO + art. 173 Prawa telekomunikacyjnego, dyrektywa ePrivacy).
 * Wybór zapisuje się w jednym własnym cookie `pn_consent`. Kategoria „niezbędne” nie wymaga zgody i nie jest tu
 * zapisywana. Kategorie opcjonalne są domyślnie wyłączone:
 *   - `maps`      interaktywna mapa Google na stronie „Kontakt” (Google stawia własne cookies),
 *   - `analytics` statystyki odwiedzin (dziś żadnych nie ma),
 *   - `marketing` piksele reklamowe, np. Meta (dziś żadnych nie ma).
 *
 * Skrypt lub osadzenie z kategorii opcjonalnej wolno załadować wyłącznie po zgodzie: w React przez
 * `<ConsentGate category="…">` (src/components/site/ConsentGate.tsx), w kodzie przez `hasConsent(…)`.
 * Przy wyłączonym pasku (`COOKIE_BANNER_ENABLED = false` w src/lib/site.ts) żadna kategoria nie ma zgody.
 */

export const CONSENT_COOKIE = 'pn_consent'
/** Zmiana numeru wymusza ponowne pytanie o zgodę (np. po dodaniu nowej kategorii lub narzędzia). */
export const CONSENT_VERSION = 2
/** Wybór ważny ok. 6 miesięcy, potem pytamy ponownie. */
export const CONSENT_MAX_AGE_DAYS = 180

/** Zdarzenie po zapisaniu wyboru. */
export const CONSENT_CHANGE_EVENT = 'pn-consent-change'
/** Zdarzenie otwierające panel ustawień (przycisk w stopce). */
export const CONSENT_OPEN_EVENT = 'pn-consent-open'

export const CONSENT_CATEGORIES = ['maps', 'analytics', 'marketing'] as const
export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number]
export type ConsentChoice = Record<ConsentCategory, boolean>

export type Consent = ConsentChoice & {
  v: number
  /** Znacznik czasu wyboru (ms), dowód zgody. */
  at: number
}

export const NO_OPTIONAL: ConsentChoice = { maps: false, analytics: false, marketing: false }

export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null
  try {
    const data: unknown = JSON.parse(decodeURIComponent(raw))
    if (typeof data !== 'object' || data === null) return null
    const record = data as Record<string, unknown>
    if (record.v !== CONSENT_VERSION || typeof record.at !== 'number') return null
    if (!CONSENT_CATEGORIES.every((category) => typeof record[category] === 'boolean')) return null
    return {
      v: record.v,
      at: record.at,
      maps: record.maps as boolean,
      analytics: record.analytics as boolean,
      marketing: record.marketing as boolean,
    }
  } catch {
    return null
  }
}

/** Surowa wartość cookie (do porównania w useSyncExternalStore) albo '' gdy brak wyboru. */
export function readConsentRaw(): string {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
  return match ? match.slice(CONSENT_COOKIE.length + 1) : ''
}

export function readConsent(): Consent | null {
  return parseConsent(readConsentRaw())
}

/** Czy użytkownik zgodził się na kategorię (zawsze `false` bez paska zgody, żeby nic opcjonalnego nie ruszyło po cichu). */
export function hasConsent(category: ConsentCategory): boolean {
  return COOKIE_BANNER_ENABLED && readConsent()?.[category] === true
}

/** Zapisuje wybór; kategorie niewymienione zachowują dotychczasową wartość (domyślnie wyłączone). */
export function writeConsent(choice: Partial<ConsentChoice>): Consent {
  const previous = readConsent() ?? { ...NO_OPTIONAL }
  const consent: Consent = {
    v: CONSENT_VERSION,
    at: Date.now(),
    maps: choice.maps ?? previous.maps,
    analytics: choice.analytics ?? previous.analytics,
    marketing: choice.marketing ?? previous.marketing,
  }
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie =
    `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}` +
    `; Max-Age=${CONSENT_MAX_AGE_DAYS * 24 * 60 * 60}; Path=/; SameSite=Lax${secure}`
  window.dispatchEvent(new Event(CONSENT_CHANGE_EVENT))
  return consent
}

export function openConsentSettings() {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))
}

export function subscribeConsent(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange)
}
