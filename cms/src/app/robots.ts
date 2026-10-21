import type { MetadataRoute } from 'next'
import { isIndexable } from '@/lib/indexing'

export default function robots(): MetadataRoute.Robots {
  return isIndexable()
    ? { rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] } }
    : { rules: { userAgent: '*', disallow: '/' } }
}
