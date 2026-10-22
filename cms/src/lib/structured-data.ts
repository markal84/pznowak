import { DEFAULT_OG_IMAGE, absoluteUrl, siteUrl } from './seo'
import { SITE } from './site'

/**
 * Nazwa firmy w danych strukturalnych. Do potwierdzenia przez pracownię (decyzja D1 w planie reklamy): ma być
 * identyczna z szyldem i wizytówką Google. Na razie nazwa z profilu na Facebooku.
 */
export const BUSINESS_NAME = 'Michał Nowak Pracownia Złotnicza'

const DAYS: Record<string, string[]> = {
  'Pon.–pt.': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  Sobota: ['Saturday'],
}

const pad = (time: string) => time.padStart(5, '0')

/** Godziny otwarcia zapisane w `SITE.hours` („8:00–16:00”) jako OpeningHoursSpecification; nieznane etykiety dni są pomijane. */
export function openingHoursSpecification(hours: readonly { days: string; time: string }[] = SITE.hours) {
  return hours.flatMap(({ days, time }) => {
    const dayOfWeek = DAYS[days]
    const [opens, closes] = time.split('–')
    if (!dayOfWeek || !opens || !closes) return []
    return [{ '@type': 'OpeningHoursSpecification', dayOfWeek, opens: pad(opens), closes: pad(closes) }]
  })
}

/**
 * Dane strukturalne JewelryStore (strona główna i /kontakt). Bez pól, których nie znamy (`geo`, `priceRange`),
 * bez ocen (`aggregateRating`: Google nie pokazuje gwiazdek dla opinii firmy o samej sobie).
 */
export function jewelryStoreJsonLd() {
  const [postalCode, ...locality] = SITE.city.split(' ')
  return {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    name: BUSINESS_NAME,
    url: `${siteUrl()}/`,
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
    openingHoursSpecification: openingHoursSpecification(),
    sameAs: [SITE.facebook, SITE.instagram],
  }
}

/** Zapis do `<script type="application/ld+json">`; `<` jest zamieniane, żeby tekst z CMS nie zamknął znacznika. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
