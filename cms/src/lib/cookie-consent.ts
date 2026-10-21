/**
 * Zgoda na pliki cookies (RODO + art. 173 Prawa telekomunikacyjnego, dyrektywa ePrivacy).
 * Wybór zapisuje się w jednym własnym cookie `pn_consent`; kategoria niezbędna nie wymaga zgody i nie jest tu zapisywana.
 * Skrypty opcjonalne (np. statystyki) wolno ładować wyłącznie po `hasConsent(...)`.
 */

export const CONSENT_COOKIE = 'pn_consent'
/** Zmiana numeru wymusza ponowne pytanie o zgodę (np. po dodaniu nowej kategorii lub narzędzia). */
export const CONSENT_VERSION = 1
/** Wybór ważny ok. 6 miesięcy, potem pytamy ponownie. */
export const CONSENT_MAX_AGE_DAYS = 180

/** Zdarzenie po zapisaniu wyboru. */
export const CONSENT_CHANGE_EVENT = 'pn-consent-change'
/** Zdarzenie otwierające panel ustawień (przycisk w stopce). */
export const CONSENT_OPEN_EVENT = 'pn-consent-open'

export type Consent = {
  v: number
  /** Znacznik czasu wyboru (ms), dowód zgody. */
  at: number
  analytics: boolean
}

export function parseConsent(raw: string | null | undefined): Consent | null {
  if (!raw) return null
  try {
    const data: unknown = JSON.parse(decodeURIComponent(raw))
    if (typeof data !== 'object' || data === null) return null
    const { v, at, analytics } = data as Record<string, unknown>
    if (v !== CONSENT_VERSION || typeof at !== 'number' || typeof analytics !== 'boolean') return null
    return { v, at, analytics }
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

export function hasConsent(category: 'analytics'): boolean {
  return readConsent()?.[category] === true
}

export function writeConsent(choice: { analytics: boolean }): Consent {
  const consent: Consent = { v: CONSENT_VERSION, at: Date.now(), analytics: choice.analytics }
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
