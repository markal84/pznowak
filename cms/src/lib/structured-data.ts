import { DEFAULT_OG_IMAGE, absoluteUrl, siteUrl } from './seo'
import { normalizePrice } from './price'
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
    foundingDate: String(SITE.since),
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

/** Strona główna: nazwa serwisu dla wyników Google („site name”) powiązana z pracownią. */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl()}/#serwis`,
    url: `${siteUrl()}/`,
    name: BUSINESS_NAME,
    alternateName: ['PZ Nowak', 'pznowak.pl'],
    inLanguage: 'pl-PL',
    publisher: { '@id': jewelryStoreId() },
  }
}

/**
 * Pytania i odpowiedzi (FAQPage). Odpowiedź jako zwykły tekst: te same zdania, które widać na stronie. Pozycje bez
 * tekstu są pomijane; pusta lista daje `null` (strona nie wstawia wtedy znacznika).
 */
export function faqJsonLd(items: readonly { q: string; text?: string }[]) {
  const mainEntity = items
    .filter((item): item is { q: string; text: string } => Boolean(item.text?.trim()))
    .map(({ q, text }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: text.replace(/\s+/g, ' ').trim() },
    }))
  return mainEntity.length ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity } : null
}

/**
 * Zwroty w ofercie (Search Console 23.11.2026, „Informacje o sprzedawcy”: brak `hasMerchantReturnPolicy`). Pierścionki
 * z katalogu powstają po zamówieniu, w rozmiarze i wersji ustalonej z klientem, więc nie ma prawa odstąpienia od umowy
 * (art. 38 ust. 1 pkt 3 ustawy o prawach konsumenta; decyzja Kamili 21.11.2026). Reklamacja zostaje, ale schema.org
 * jej nie opisuje. Ta sama zasada stoi na /na-zamowienie w pytaniu „Czy mogę zwrócić pierścionek?”.
 */
export function merchantReturnPolicy() {
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'PL',
    returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
    merchantReturnLink: absoluteUrl('/na-zamowienie'),
  }
}

/**
 * Koszt wysyłki kurierem w zł, który płaci klient (0 = wysyłka w cenie). `null` = jeszcze nie znamy (pytanie do Michała
 * na stronie „Jak kupić”), wtedy oferta nie ma `shippingDetails`: Google wymaga w nim stawki, a zmyślonej nie podajemy.
 */
export const SHIPPING_RATE_PLN: number | null = 0 // Marcin 23.11.2026: wysyłka darmowa

/**
 * Wysyłka w ofercie (Search Console 23.11.2026: brak `shippingDetails`). Kurier w Polsce; czas: wykonanie zwykle
 * 4–6 tygodni (28–42 dni), potem 1–2 dni kurierem. Bez stawki zwraca `null`.
 */
export function offerShippingDetails(rate: number | null = SHIPPING_RATE_PLN) {
  if (rate === null || !Number.isFinite(rate) || rate < 0) return null
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: rate, currency: 'PLN' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'PL' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 28, maxValue: 42, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
    },
  }
}

type ProductJsonLdInput = {
  name: string
  /** Ścieżka karty, np. `/pierscionki/aria`. */
  path: string
  description: string
  images: readonly string[]
  /** Kamień i złoto w mianowniku, jak na karcie („Ametyst, diamenty”, „Żółte złoto”); puste są pomijane. */
  stone?: string
  metal?: string
  /** Cena z panelu w zł; bez ceny karta nie dostaje znacznika `Product` w ogóle (patrz `productJsonLd`). */
  price?: number | null
}

/**
 * Dane strukturalne pierścionka (Product), albo `null` dla karty bez ceny. Google wymaga w `Product` jednej z
 * właściwości `offers`, `review`, `aggregateRating` (błąd w Search Console z 18.11.2026 dla kart bez ceny, które na
 * stronie mają „Na zapytanie”). Nie mamy opinii ani ocen i nie wolno ich zmyślać, a ceny bez ceny nie da się
 * uczciwie podać, więc taka karta zostaje bez znacznika `Product` (strona nadal się indeksuje jako zwykły wynik).
 * Oferta: cena z panelu to cena „od” za wersję ze zdjęć (na stronie „od … zł”); dostępność to wykonanie na zamówienie.
 * Bez zmyślonych identyfikatorów (GTIN); marka i sprzedawca to pracownia z `jewelryStoreId()`.
 */
export function productJsonLd({ name, path, description, images, stone, metal, price: rawPrice }: ProductJsonLdInput) {
  // Ta sama reguła co przy wyświetlaniu ceny (`formatPrice`): oferta jest w danych dokładnie wtedy, gdy na karcie jest kwota.
  const price = normalizePrice(rawPrice)
  if (price === null) return null
  const url = absoluteUrl(path)
  const shipping = offerShippingDetails()
  const offer = {
    offers: {
      '@type': 'Offer',
      url,
      price,
      priceCurrency: 'PLN',
      // Wykonanie po zamówieniu: z wartości, które rozumie Google, najbliższa jest „BackOrder” (przyjmujemy zamówienia).
      availability: 'https://schema.org/BackOrder',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': jewelryStoreId() },
      hasMerchantReturnPolicy: merchantReturnPolicy(),
      ...(shipping ? { shippingDetails: shipping } : {}),
    },
  }
  const additionalProperty = stone ? [{ '@type': 'PropertyValue', name: 'Kamień', value: stone }] : []
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#pierscionek`,
    name: `Pierścionek ${name}`,
    url,
    description: description.replace(/\s+/g, ' ').trim(),
    category: 'Pierścionki',
    ...(images.length ? { image: images.slice(0, 6).map((src) => absoluteUrl(src)) } : {}),
    ...(metal ? { material: metal } : {}),
    ...(additionalProperty.length ? { additionalProperty } : {}),
    brand: { '@type': 'Brand', name: BUSINESS_NAME },
    ...offer,
  }
}

type ArticleJsonLdInput = {
  title: string
  description: string
  path: string
  /** Daty `RRRR-MM-DD`. */
  published: string
  updated: string
  image?: string
}

/** Poradnik (Article). Autorem i wydawcą jest pracownia: teksty powstają w pracowni, nie podpisujemy ich jedną osobą. */
export function articleJsonLd({ title, description, path, published, updated, image }: ArticleJsonLdInput) {
  const org = { '@type': 'Organization', '@id': jewelryStoreId(), name: BUSINESS_NAME, url: `${siteUrl()}/` }
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    inLanguage: 'pl-PL',
    mainEntityOfPage: absoluteUrl(path),
    datePublished: published,
    dateModified: updated,
    image: [absoluteUrl(image ?? DEFAULT_OG_IMAGE.url)],
    author: org,
    publisher: { ...org, logo: { '@type': 'ImageObject', url: absoluteUrl('/logo.png') } },
  }
}

/** Lista kart (ItemList) na stronie katalogu: kolejność i adresy pierścionków z bieżącej strony listy. */
export function itemListJsonLd(items: readonly { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map(({ name, path }, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      url: absoluteUrl(path),
    })),
  }
}
