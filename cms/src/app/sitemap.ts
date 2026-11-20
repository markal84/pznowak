import type { MetadataRoute } from 'next'

import { getProducts } from '@/lib/collection'
import { GUIDES_PATH, getGuides, guidePath } from '@/lib/guides'
import { productPath } from '@/lib/product-seo'
import { absoluteUrl } from '@/lib/seo'

// Mapa strony zależy od opublikowanych pierścionków, więc nie może być zapisana przy budowaniu.
export const dynamic = 'force-dynamic'

/** Publiczne podstrony. Bez /kreator, /admin, /api i szkiców; dopisując stronę do serwisu, dopisz ją tutaj. */
const PAGES = [
  '/',
  '/pierscionki',
  '/obraczki',
  '/na-zamowienie',
  '/naprawy',
  '/realizacje',
  '/pracownia',
  GUIDES_PATH,
  '/kontakt',
  '/regulamin',
  '/polityka-prywatnosci',
]

/**
 * Mapa strony: podstrony, poradniki i opublikowane pierścionki (ze zdjęciami, żeby Google łatwiej znalazł je w grafice). Na podglądach też istnieje, ale `robots` i nagłówek
 * `X-Robots-Tag` blokują indeksowanie.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, guides] = await Promise.all([getProducts(), getGuides()])
  return [
    ...PAGES.map((path) => ({ url: absoluteUrl(path) })),
    ...guides.map((guide) => ({ url: absoluteUrl(guidePath(guide.slug)), lastModified: guide.updated })),
    ...products.map((product) => ({
      url: absoluteUrl(productPath(product.slug)),
      lastModified: product.updatedAt,
      images: product.images.slice(0, 10).map((src) => absoluteUrl(src)),
    })),
  ]
}
