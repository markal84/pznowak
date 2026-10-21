import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import {
  serializePublicGalleryItem,
  serializePublicProduct,
  serializePublicSiteContent,
  type PublicGalleryItem,
  type PublicProduct,
  type PublicSiteContent,
} from './public-products'

export type Jewel = PublicProduct
export type Gallery = PublicGalleryItem

export const getProducts = unstable_cache(
  async (): Promise<Jewel[]> => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'products',
      depth: 1,
      limit: 500,
      overrideAccess: false,
      sort: 'sortOrder',
      where: {
        and: [
          { _status: { equals: 'published' } },
          { archived: { not_equals: true } },
        ],
      },
    })
    return result.docs.map(serializePublicProduct).filter(({ imagePath }) => Boolean(imagePath))
  },
  ['published-products'],
  { tags: ['products'], revalidate: 3600 },
)

export const getGallery = unstable_cache(
  async (): Promise<Gallery[]> => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'gallery-items',
      depth: 1,
      limit: 100,
      overrideAccess: false,
      sort: 'position',
      where: { _status: { equals: 'published' } },
    })
    return result.docs.map(serializePublicGalleryItem).filter(({ image }) => Boolean(image))
  },
  ['published-gallery'],
  { tags: ['gallery'], revalidate: 3600 },
)

export const getSiteContent = unstable_cache(
  async (): Promise<PublicSiteContent> => {
    const payload = await getPayload({ config })
    const content = await payload.findGlobal({
      slug: 'site-content',
      draft: false,
      overrideAccess: false,
    })
    return serializePublicSiteContent(content)
  },
  ['published-site-content'],
  { tags: ['site-content'], revalidate: 3600 },
)
