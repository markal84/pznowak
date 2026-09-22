import config from '@payload-config'
import { getPayload } from 'payload'

import {
  parseProductsLimit,
  sampleProducts,
  serializePublicGalleryItem,
  serializePublicProduct,
  serializePublicSiteContent,
} from '../../../lib/public-products'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PUBLIC_HEADERS = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: PUBLIC_HEADERS })
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams
    const returnAll = searchParams.get('all') === 'true'
    const limit = parseProductsLimit(searchParams.get('limit'))
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'products',
      depth: 1,
      limit: 500,
      overrideAccess: false,
      sort: 'sortOrder',
      where: {
        and: [
          {
            _status: {
              equals: 'published',
            },
          },
          {
            archived: {
              not_equals: true,
            },
          },
        ],
      },
    })

    const availableProducts = result.docs
      .map(serializePublicProduct)
      .filter(({ imagePath }) => imagePath.length > 0)
    const products = returnAll ? availableProducts : sampleProducts(availableProducts, limit)
    const [galleryResult, siteContent] = returnAll
      ? await Promise.all([
          payload.find({
            collection: 'gallery-items',
            depth: 1,
            limit: 100,
            overrideAccess: false,
            sort: 'position',
            where: { _status: { equals: 'published' } },
          }),
          payload.findGlobal({
            slug: 'site-content',
            draft: false,
            overrideAccess: false,
          }),
        ])
      : [null, null]
    const gallery =
      galleryResult?.docs
        .map(serializePublicGalleryItem)
        .filter(({ image }) => image.length > 0) ?? []

    return Response.json(
      {
        products,
        ...(returnAll
          ? {
              gallery,
              siteContent: siteContent ? serializePublicSiteContent(siteContent) : null,
            }
          : {}),
        meta: {
          available: availableProducts.length,
          count: products.length,
          galleryCount: gallery.length,
          randomized: !returnAll,
          source: 'payload_cms',
        },
      },
      { status: 200, headers: PUBLIC_HEADERS },
    )
  } catch (error) {
    console.error('Unable to read products from Payload', error)

    return Response.json(
      {
        error: 'database_unavailable',
        message: 'The product catalog is temporarily unavailable.',
      },
      { status: 503, headers: PUBLIC_HEADERS },
    )
  }
}

export async function POST() {
  return Response.json(
    {
      error: 'method_not_allowed',
      message: 'Use GET to read the product sample.',
    },
    {
      status: 405,
      headers: {
        ...PUBLIC_HEADERS,
        Allow: 'GET, OPTIONS',
      },
    },
  )
}
