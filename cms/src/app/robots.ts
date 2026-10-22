import type { MetadataRoute } from 'next'
import { isIndexable } from '@/lib/indexing'
import { absoluteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return isIndexable()
    ? {
        rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
        sitemap: absoluteUrl('/sitemap.xml'),
      }
    : { rules: { userAgent: '*', disallow: '/' } }
}
