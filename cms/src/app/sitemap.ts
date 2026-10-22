import type { MetadataRoute } from 'next'

import { getProducts } from '@/lib/collection'
import { productPath } from '@/lib/product-seo'
import { absoluteUrl } from '@/lib/seo'

// Mapa strony zależy od opublikowanych pierścionków, więc nie może być zapisana przy budowaniu.
export const dynamic = 'force-dynamic'

/** Publiczne podstrony. Bez /kreator, /admin, /api i szkiców; dopisując stronę do serwisu, dopisz ją tutaj. */
const PAGES = ['/', '/pierscionki', '/obraczki', '/na-zamowienie', '/naprawy', '/realizacje', '/pracownia', '/kontakt']

/**
 * Mapa strony: podstrony i opublikowane pierścionki. Na podglądach też istnieje, ale `robots` i nagłówek
 * `X-Robots-Tag` blokują indeksowanie.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts()
  return [
    ...PAGES.map((path) => ({ url: absoluteUrl(path) })),
    ...products.map((product) => ({
      url: absoluteUrl(productPath(product.slug)),
      lastModified: product.updatedAt,
    })),
  ]
}
