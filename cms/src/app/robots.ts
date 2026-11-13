import type { MetadataRoute } from 'next'
import { isIndexable } from '@/lib/indexing'
import { absoluteUrl } from '@/lib/seo'

// `/products`: publiczne JSON API dla starego frontu (katalog jako dane), nie strona dla ludzi.
export default function robots(): MetadataRoute.Robots {
  return isIndexable()
    ? {
        rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/products'] },
        sitemap: absoluteUrl('/sitemap.xml'),
      }
    : { rules: { userAgent: '*', disallow: '/' } }
}
