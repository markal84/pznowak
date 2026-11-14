/**
 * Statystyki odwiedzin i zdarzeń konwersji (pomiar źródeł klientów, plan SEO 14.11.2026–15.02.2027).
 *
 * Narzędzie: Umami (https://umami.is). Nie zapisuje niczego na urządzeniu odwiedzającego (bez cookies,
 * localStorage i odcisku przeglądarki), nie zapisuje adresu IP i nie śledzi między stronami, więc nie wymaga
 * zgody z paska cookies (art. 399 Prawa komunikacji elektronicznej dotyczy zapisu i odczytu na urządzeniu).
 * Opis w polityce prywatności: src/content/legal.ts, § 9. Instrukcja dla Marcina: docs/analityka/README.md.
 *
 * Włącznik: zmienna NEXT_PUBLIC_UMAMI_WEBSITE_ID wstawiana przy budowaniu (`next build`). Bez niej strona nie ładuje
 * żadnego skryptu. NEXT_PUBLIC_UMAMI_SRC zmienia adres skryptu (domyślnie Umami Cloud; przy własnej instancji
 * na MyDevil np. https://statystyki.pznowak.pl/script.js).
 */

export const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID?.trim() ?? ''
export const UMAMI_SRC = process.env.NEXT_PUBLIC_UMAMI_SRC?.trim() || 'https://cloud.umami.is/script.js'
/**
 * Domeny, na których skrypt liczy wizyty (podgląd, localhost i staging się nie liczą, nawet z tym samym ID).
 * Domyślnie host z SITE_URL (src/lib/seo.ts); NEXT_PUBLIC_UMAMI_DOMAINS nadpisuje (lista po przecinku).
 */
export function umamiDomains(siteOrigin: string): string {
  const custom = process.env.NEXT_PUBLIC_UMAMI_DOMAINS?.trim()
  if (custom) return custom
  try {
    return new URL(siteOrigin).hostname
  } catch {
    return 'pznowak.pl'
  }
}

export const ANALYTICS_ENABLED = UMAMI_WEBSITE_ID !== ''

/**
 * Nazwy zdarzeń widoczne w panelu Umami (Zdarzenia). Zmiana nazwy rozbija porównanie miesiąc do miesiąca,
 * więc nowe zdarzenia dopisuj, a istniejących nie zmieniaj.
 */
export const EVENTS = {
  /** Klik w numer telefonu (link tel:). Na telefonie to zwykle rozmowa, na komputerze tylko próba. */
  phone: 'telefon',
  /** Klik w adres e-mail (mailto:). */
  email: 'email',
  /** Klik w nawigację do pracowni (Mapy Google lub Apple) albo „Pokaż interaktywną mapę”. */
  map: 'mapa',
  /** Klik w profil pracowni na Facebooku lub Instagramie. */
  social: 'social',
  /** Klik w opinie lub wizytówkę Google (link do Google Maps z miejscem pracowni). */
  reviews: 'opinie-google',
  /** Formularz kontaktowy wysłany i przyjęty przez serwer. */
  form: 'formularz-wyslany',
} as const

export type AnalyticsEvent = (typeof EVENTS)[keyof typeof EVENTS]
export type EventData = Record<string, string | number>

/**
 * Rozpoznaje link, który jest konwersją, po jego adresie. Zwraca nazwę zdarzenia i szczegóły albo null.
 * Klik w link tel:/mailto:/mapy/social łapie jeden nasłuch w <Analytics>, więc komponenty nie muszą nic wołać.
 */
export function classifyLink(href: string): { event: AnalyticsEvent; data: EventData } | null {
  const value = href.trim()
  if (!value) return null
  const lower = value.toLowerCase()
  if (lower.startsWith('tel:')) return { event: EVENTS.phone, data: {} }
  if (lower.startsWith('mailto:')) return { event: EVENTS.email, data: {} }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '')
  if (host === 'maps.apple.com') return { event: EVENTS.map, data: { rodzaj: 'apple' } }
  if (host === 'maps.app.goo.gl' || host === 'g.page' || ((host === 'google.com' || host.startsWith('google.')) && url.pathname.startsWith('/maps'))) {
    // Nawigacja (`/maps/dir`) to droga do pracowni; inne linki do Map Google prowadzą do wizytówki z opiniami.
    if (url.pathname.startsWith('/maps/dir') || url.searchParams.has('daddr'))
      return { event: EVENTS.map, data: { rodzaj: 'google' } }
    return { event: EVENTS.reviews, data: {} }
  }
  if (host === 'search.google.com' && url.pathname.includes('review'))
    return { event: EVENTS.reviews, data: {} }
  if (host === 'facebook.com' || host === 'm.facebook.com' || host === 'fb.com')
    return { event: EVENTS.social, data: { kanal: 'facebook' } }
  if (host === 'instagram.com') return { event: EVENTS.social, data: { kanal: 'instagram' } }
  return null
}

type UmamiTracker = { track: (event: string, data?: EventData) => void }

/** Wysyła zdarzenie do Umami. Bez skryptu (wyłączone, zablokowane, podgląd) nic się nie dzieje. */
export function track(event: AnalyticsEvent, data: EventData = {}) {
  if (!ANALYTICS_ENABLED || typeof window === 'undefined') return
  const umami = (window as unknown as { umami?: UmamiTracker }).umami
  try {
    umami?.track(event, data)
  } catch {
    // Statystyki nigdy nie mogą zepsuć strony.
  }
}
