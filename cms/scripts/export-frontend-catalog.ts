import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import type { Media } from '../src/payload-types'

type ExistingCatalog = {
  gallery: unknown[]
}

const legacyCatalogPath = fileURLToPath(new URL('../../src/lib/collection.json', import.meta.url))
const outputPath = fileURLToPath(new URL('../../src/lib/catalog-snapshot.json', import.meta.url))

function populatedMedia(asset: number | Media): Media | null {
  return typeof asset === 'object' && asset !== null ? asset : null
}

function requiredUrl(media: Media, productName: string): string {
  if (!media.url?.startsWith('https://') || !media.url.includes('.blob.vercel-storage.com/')) {
    throw new Error(`Product ${productName} has media without a Vercel Blob URL`)
  }
  return media.url
}

const existingCatalog = JSON.parse(await readFile(legacyCatalogPath, 'utf8')) as ExistingCatalog
const payload = await getPayload({ config: await config })

try {
  const result = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 500,
    overrideAccess: true,
    sort: 'sortOrder',
    where: {
      and: [{ _status: { equals: 'published' } }, { archived: { not_equals: true } }],
    },
  })

  const products = result.docs.map((product) => {
    const media = (product.media ?? [])
      .map(({ asset }) => populatedMedia(asset))
      .filter((asset): asset is Media => Boolean(asset))
    const images = media
      .filter(({ mimeType }) => mimeType?.startsWith('image/'))
      .map((asset) => requiredUrl(asset, product.name))
    const videoAsset = media.find(({ mimeType }) => mimeType?.startsWith('video/'))

    if (images.length === 0) {
      throw new Error(`Product ${product.name} has no published image`)
    }

    return {
      id: product.legacy?.wordpressId ?? product.id,
      slug: product.slug,
      name: product.name,
      description: product.description ?? '',
      lead: product.lead ?? '',
      images,
      video: videoAsset ? requiredUrl(videoAsset, product.name) : '',
      metal: product.metal ?? '',
      stone: product.stone ?? '',
      carats: product.carats ?? '',
      clarity: product.clarity ?? '',
    }
  })

  const videoCount = products.filter(({ video }) => video.length > 0).length
  if (products.length !== 34 || videoCount !== 27) {
    throw new Error(
      `Snapshot verification failed: ${products.length} products, ${videoCount} videos`,
    )
  }

  await writeFile(
    outputPath,
    `${JSON.stringify({ products, gallery: existingCatalog.gallery }, null, 2)}\n`,
    'utf8',
  )
  console.log(`Frontend snapshot exported: ${products.length} products and ${videoCount} videos.`)
} finally {
  await payload.destroy()
}

process.exit(0)
