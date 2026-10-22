import type { Metadata } from 'next'

import { SITE } from './site'

/** Adres docelowy serwisu. Podglądy też wskazują na niego jako kanoniczny (mają noindex, więc niczego nie psują). */
export const DEFAULT_SITE_URL = 'https://pznowak.pl'

/** Domyślny obraz do udostępniania (Facebook, Messenger), 1200×630. */
// TYMCZASOWE: kadr z about-us-son.png, podmienić na oryginał z pracowni.
export const DEFAULT_OG_IMAGE = {
  url: '/og-pracownia.jpg',
  width: 1200,
  height: 630,
  alt: 'Michał Nowak przy mikroskopie w pracowni złotniczej w Busku-Zdroju',
} as const

export const SITE_TITLE_SUFFIX = ` — ${SITE.name}`

/**
 * Adres serwisu bez końcowego skośnika. `SITE_URL` przesłania domyślny; niepoprawna wartość jest pomijana, żeby
 * błąd w konfiguracji nie wyłożył budowania strony.
 */
export function siteUrl(value: string | undefined = process.env.SITE_URL): string {
  const candidate = value?.trim()
  if (candidate) {
    try {
      const url = new URL(candidate)
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin
    } catch {
      // niepoprawny adres: zostaje domyślny
    }
  }
  return DEFAULT_SITE_URL
}

/** Adres bezwzględny dla ścieżki z serwisu (`/pierscionki/aria`) albo dla adresu, który już jest bezwzględny. */
export function absoluteUrl(pathOrUrl: string, base: string = siteUrl()): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${base}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`
}

type PageMetadataInput = {
  /** Tytuł bez dopisku „— Michał Nowak” (dopisuje go szablon w layout.tsx). */
  title: string
  description: string
  /** Ścieżka strony w serwisie, np. `/pierscionki`; z niej powstaje adres kanoniczny. */
  path: string
  /** Obraz do udostępniania; domyślnie zdjęcie pracowni. Ścieżka lub adres bezwzględny. */
  image?: { url: string; width?: number; height?: number; alt?: string }
}

/**
 * Wspólny zestaw metadanych podstrony: tytuł, opis, adres kanoniczny, Open Graph i Twitter. Next nie scala
 * `openGraph` z layoutu głębiej niż jeden poziom, dlatego każda strona podaje komplet.
 */
export function pageMetadata({ title, description, path, image = DEFAULT_OG_IMAGE }: PageMetadataInput): Metadata {
  const fullTitle = `${title}${SITE_TITLE_SUFFIX}`
  const images = [{ url: image.url, width: image.width, height: image.height, alt: image.alt ?? title }]
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'pl_PL',
      siteName: SITE.name,
      title: fullTitle,
      description,
      url: path,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: images.map(({ url, alt }) => ({ url, alt })),
    },
  }
}
