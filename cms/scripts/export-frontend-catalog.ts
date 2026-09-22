import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import {
  serializePublicGalleryItem,
  serializePublicProduct,
} from '../src/lib/public-products'

const outputPath = fileURLToPath(new URL('../../src/lib/catalog-snapshot.json', import.meta.url))

function requiredBlobUrl(url: string, label: string): string {
  if (!url.startsWith('https://') || !url.includes('.blob.vercel-storage.com/')) {
    throw new Error(`${label} has no Vercel Blob URL`)
  }
  return url
}

const payload = await getPayload({ config: await config })

try {
  const [productsResult, galleryResult] = await Promise.all([
    payload.find({
      collection: 'products',
      depth: 1,
      limit: 500,
      overrideAccess: true,
      sort: 'sortOrder',
      where: {
        and: [{ _status: { equals: 'published' } }, { archived: { not_equals: true } }],
      },
    }),
    payload.find({
      collection: 'gallery-items',
      depth: 1,
      limit: 100,
      overrideAccess: true,
      sort: 'position',
      where: { _status: { equals: 'published' } },
    }),
  ])

  const products = productsResult.docs.map(serializePublicProduct).map((product) => ({
    ...product,
    imagePath: undefined,
    images: product.images.map((url) => requiredBlobUrl(url, `Product ${product.name}`)),
    video: product.video
      ? requiredBlobUrl(product.video, `Product ${product.name}`)
      : '',
  }))
  const gallery = galleryResult.docs.map(serializePublicGalleryItem).map((item) => ({
    ...item,
    image: requiredBlobUrl(item.image, `Gallery item ${item.name}`),
  }))

  const videoCount = products.filter(({ video }) => video.length > 0).length
  if (products.length !== 34 || videoCount !== 27 || gallery.length !== 11) {
    throw new Error(
      `Snapshot verification failed: ${products.length} products, ${videoCount} videos, ` +
        `${gallery.length} gallery items`,
    )
  }

  await writeFile(
    outputPath,
    `${JSON.stringify({ products, gallery }, null, 2)}\n`,
    'utf8',
  )
  console.log(
    `Frontend snapshot exported: ${products.length} products, ${videoCount} videos and ` +
      `${gallery.length} gallery items.`,
  )
} finally {
  await payload.destroy()
}

process.exit(0)
