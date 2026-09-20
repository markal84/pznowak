import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import type { Media, Product } from '../src/payload-types'

type LegacyProduct = {
  id: number
  slug: string
  name: string
  description?: string
  lead?: string
  images?: string[]
  video?: string
  metal?: string
  stone?: string
  carats?: string
  clarity?: string
}

type LegacyCatalog = {
  products: LegacyProduct[]
}

const expectedProductCount = 34
const expectedImageCount = 106
const applyChanges = process.argv.includes('--apply')
const catalogPath = fileURLToPath(new URL('../../src/lib/collection.json', import.meta.url))
const publicPath = fileURLToPath(new URL('../../public', import.meta.url))

function mimeTypeFor(filename: string): string {
  switch (path.extname(filename).toLowerCase()) {
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.jpeg':
    case '.jpg':
      return 'image/jpeg'
    default:
      throw new Error(`Unsupported catalog image type: ${filename}`)
  }
}

function isVercelBlobUrl(value: string | null | undefined): value is string {
  return Boolean(value && /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//.test(value))
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await task(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

const source = JSON.parse(await readFile(catalogPath, 'utf8')) as LegacyCatalog
const imageEntries = source.products.flatMap((product) =>
  (product.images ?? []).map((sourceUrl, position) => ({
    product,
    sourceUrl,
    position,
    alt: `${product.name} - zdjęcie ${position + 1}`,
  })),
)

if (source.products.length !== expectedProductCount || imageEntries.length !== expectedImageCount) {
  throw new Error(
    `Unexpected catalog size: ${source.products.length} products and ${imageEntries.length} images`,
  )
}

for (const { sourceUrl } of imageEntries) {
  await readFile(path.join(publicPath, sourceUrl.replace(/^\//, '')))
}

if (!applyChanges) {
  console.log(
    `Catalog check passed: ${source.products.length} products and ${imageEntries.length} local images are ready for import.`,
  )
  process.exit(0)
}

const payload = await getPayload({ config: await config })

try {
  const existingMediaResult = await payload.find({
    collection: 'media',
    limit: 500,
    overrideAccess: true,
    where: {
      legacySourceUrl: {
        exists: true,
      },
    },
  })
  const mediaBySource = new Map(
    existingMediaResult.docs.map((media) => [media.legacySourceUrl, media] as const),
  )
  let createdMedia = 0

  await mapWithConcurrency(imageEntries, 4, async ({ alt, sourceUrl }, index) => {
    const existing = mediaBySource.get(sourceUrl)
    if (existing) {
      if (!isVercelBlobUrl(existing.url)) {
        throw new Error(`Existing media ${existing.id} has no valid Vercel Blob URL`)
      }
      return existing
    }

    const filename = path.basename(sourceUrl)
    const data = await readFile(path.join(publicPath, sourceUrl.replace(/^\//, '')))
    const media = await payload.create({
      collection: 'media',
      data: {
        alt,
        legacySourceUrl: sourceUrl,
      },
      file: {
        data,
        mimetype: mimeTypeFor(filename),
        name: filename,
        size: data.byteLength,
      },
      overrideAccess: true,
    })

    if (!isVercelBlobUrl(media.url)) {
      throw new Error(`Uploaded media ${media.id} has no valid Vercel Blob URL`)
    }

    createdMedia += 1
    mediaBySource.set(sourceUrl, media)
    console.log(`[${index + 1}/${imageEntries.length}] ${sourceUrl} -> ${media.url}`)
    return media
  })

  const existingProductsResult = await payload.find({
    collection: 'products',
    limit: 500,
    overrideAccess: true,
  })
  const productsByWordPressId = new Map<number, Product>()

  for (const product of existingProductsResult.docs) {
    if (product.legacy?.wordpressId) {
      productsByWordPressId.set(product.legacy.wordpressId, product)
    }
  }

  let createdProducts = 0
  let updatedProducts = 0

  for (const [sortOrder, product] of source.products.entries()) {
    const media = (product.images ?? []).map((sourceUrl, position) => {
      const asset = mediaBySource.get(sourceUrl)
      if (!asset) {
        throw new Error(`Missing imported media for ${sourceUrl}`)
      }

      return {
        asset: asset.id,
        isPrimary: position === 0,
        alt: `${product.name} - zdjęcie ${position + 1}`,
      }
    })
    const data = {
      name: product.name,
      generateSlug: false,
      slug: product.slug,
      lead: product.lead ?? '',
      description: product.description ?? '',
      metal: product.metal ?? '',
      stone: product.stone ?? '',
      carats: product.carats ?? '',
      clarity: product.clarity ?? '',
      media,
      legacy: {
        wordpressId: product.id,
        sourcePayload: product,
      },
      sortOrder,
      _status: 'published' as const,
    }
    const existing = productsByWordPressId.get(product.id)

    if (existing) {
      await payload.update({
        collection: 'products',
        id: existing.id,
        data,
        draft: false,
        overrideAccess: true,
      })
      updatedProducts += 1
    } else {
      await payload.create({
        collection: 'products',
        data,
        draft: false,
        overrideAccess: true,
      })
      createdProducts += 1
    }
  }

  const [productsResult, mediaResult] = await Promise.all([
    payload.find({
      collection: 'products',
      limit: 500,
      overrideAccess: true,
      where: { _status: { equals: 'published' } },
    }),
    payload.find({
      collection: 'media',
      limit: 500,
      overrideAccess: true,
      where: { legacySourceUrl: { exists: true } },
    }),
  ])
  const blobMedia = (mediaResult.docs as Media[]).filter(({ url }) => isVercelBlobUrl(url))

  if (productsResult.totalDocs !== expectedProductCount || blobMedia.length !== expectedImageCount) {
    throw new Error(
      `Import verification failed: ${productsResult.totalDocs} products and ${blobMedia.length} Blob images`,
    )
  }

  console.log(
    `Import complete: ${createdProducts} products created, ${updatedProducts} updated, ` +
      `${createdMedia} images uploaded, ${blobMedia.length - createdMedia} reused.`,
  )
} finally {
  await payload.destroy()
}
