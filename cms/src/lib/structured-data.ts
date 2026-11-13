import { DEFAULT_OG_IMAGE, absoluteUrl, siteUrl } from './seo'
import { SITE, WORKSHOP_COORDINATES } from './site'

/**
 * Nazwa firmy w danych strukturalnych, dokładnie jak w wizytówce Google (potwierdzone przez Marcina 13.11.2026,
 * decyzja D1). Musi być identyczna ze szyldem i wizytówką, żeby Google połączył stronę z profilem firmy.
 */
export const BUSINESS_NAME = 'Pracownia Złotnicza Michał Nowak'

const DAYS: Record<string, string[]> = {
  'Pon.–pt.': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  Sobota: ['Saturday'],
}

const pad = (time: string) => time.padStart(5, '0')

/** Godziny otwarcia zapisane w `SITE.hours` („9:00–16:30”) jako OpeningHoursSpecification; nieznane etykiety dni są pomijane. */
export function openingHoursSpecification(hours: readonly { days: string; time: string }[] = SITE.hours) {
  return hours.flatMap(({ days, time }) => {
    const dayOfWeek = DAYS[days]
    const [opens, closes] = time.split('–')
    if (!dayOfWeek || !opens || !closes) return []
    return [{ '@type': 'OpeningHoursSpecification', dayOfWeek, opens: pad(opens), closes: pad(closes) }]
  })
}

/** Stały identyfikator pracowni w danych strukturalnych: ten sam węzeł na stronie głównej i na /kontakt. */
export const jewelryStoreId = () => `${siteUrl()}/#pracownia`

/**
 * Dane strukturalne JewelryStore (strona główna i /kontakt). Bez pól, których nie znamy
 * (`priceRange`), bez ocen (`aggregateRating`: Google nie pokazuje gwiazdek dla opinii firmy o samej sobie).
 */
export function jewelryStoreJsonLd() {
  const [postalCode, ...locality] = SITE.city.split(' ')
  return {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    '@id': jewelryStoreId(),
    name: BUSINESS_NAME,
    url: `${siteUrl()}/`,
    logo: absoluteUrl('/logo.png'),
    telephone: SITE.phone,
    email: SITE.email,
    image: [absoluteUrl(DEFAULT_OG_IMAGE.url)],
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.street,
      postalCode,
      addressLocality: locality.join(' '),
      addressRegion: 'świętokrzyskie',
      addressCountry: 'PL',
    },
    geo: { '@type': 'GeoCoordinates', ...WORKSHOP_COORDINATES },
    openingHoursSpecification: openingHoursSpecification(),
    sameAs: [SITE.facebook, SITE.instagram],
  }
}

/**
 * Okruszki (BreadcrumbList) dla ścieżki widocznej na stronie, np. „Pierścionki / Cyane”. Każdy element ma adres
 * bezwzględny, także ostatni (bieżąca strona), co Google akceptuje i co ułatwia testy.
 */
export function breadcrumbJsonLd(items: readonly { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(({ name, path }, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: absoluteUrl(path),
    })),
  }
}

/** Zapis do `<script type="application/ld+json">`; `<` jest zamieniane, żeby tekst z CMS nie zamknął znacznika. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
