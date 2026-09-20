import { createHash } from 'node:crypto'
import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { del, list } from '@vercel/blob'
import { getPayload } from 'payload'

import config from '../src/payload.config'
import type { Media, Product } from '../src/payload-types'

type LegacyProduct = {
  id: number
  name: string
  video?: string
}

type LegacyCatalog = {
  products: LegacyProduct[]
}

const expectedVideoCount = 27
const applyChanges = process.argv.includes('--apply')
const deleteLegacyVideos = process.argv.includes('--delete-legacy')
const catalogPath = fileURLToPath(new URL('../../src/lib/collection.json', import.meta.url))

if (deleteLegacyVideos && !applyChanges) {
  throw new Error('--delete-legacy requires --apply')
}

function legacyVideoPathname(sourceUrl: string): string {
  const sourcePath = new URL(sourceUrl).pathname
  const filename = decodeURIComponent(path.basename(sourcePath))
  const sourceHash = createHash('sha256').update(sourceUrl).digest('hex').slice(0, 12)

  return `legacy/videos/${sourceHash}-${filename}`
}

function isVercelBlobUrl(value: string | null | undefined): value is string {
  return Boolean(value && /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//.test(value))
}

function populatedMedia(asset: number | Media): Media | null {
  return typeof asset === 'object' && asset !== null ? asset : null
}

async function listLegacyVideos() {
  const blobs: Awaited<ReturnType<typeof list>>['blobs'] = []
  let cursor: string | undefined

  do {
    const page = await list({ prefix: 'legacy/videos/', cursor, limit: 1000 })
    blobs.push(...page.blobs)
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)

  return blobs
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
const videoEntries = source.products
  .filter((product): product is LegacyProduct & { video: string } => Boolean(product.video))
  .map((product) => ({
    product,
    sourceUrl: product.video,
    pathname: legacyVideoPathname(product.video),
    alt: `${product.name} - film`,
  }))

if (videoEntries.length !== expectedVideoCount) {
  throw new Error(`Unexpected video count: ${videoEntries.length}`)
}

const legacyBlobs = await listLegacyVideos()
const legacyBlobByPath = new Map(legacyBlobs.map((blob) => [blob.pathname, blob] as const))
const missingLegacyBlobs = videoEntries.filter(({ pathname }) => !legacyBlobByPath.has(pathname))
const payload = await getPayload({ config: await config })

try {
  const [existingMediaResult, existingProductsResult] = await Promise.all([
    payload.find({
      collection: 'media',
      depth: 0,
      limit: 500,
      overrideAccess: true,
      where: { legacySourceUrl: { exists: true } },
    }),
    payload.find({
      collection: 'products',
      depth: 1,
      limit: 500,
      overrideAccess: true,
    }),
  ])
  const mediaBySource = new Map(
    existingMediaResult.docs.map((media) => [media.legacySourceUrl, media] as const),
  )
  const productsByWordPressId = new Map<number, Product>()

  for (const product of existingProductsResult.docs) {
    if (product.legacy?.wordpressId) {
      productsByWordPressId.set(product.legacy.wordpressId, product)
    }
  }

  const missingProducts = videoEntries.filter(({ product }) => !productsByWordPressId.has(product.id))
  const videosReadyInCMS = videoEntries.filter(({ sourceUrl }) => {
    const media = mediaBySource.get(sourceUrl)
    return media?.mimeType?.startsWith('video/') && isVercelBlobUrl(media.url)
  }).length

  if (!applyChanges) {
    console.log(
      JSON.stringify(
        {
          sourceVideos: videoEntries.length,
          legacyBlobVideos: legacyBlobs.length,
          missingLegacyBlobs: missingLegacyBlobs.map(({ pathname }) => pathname),
          missingProducts: missingProducts.map(({ product }) => product.id),
          videosReadyInCMS,
          changesRequired: expectedVideoCount - videosReadyInCMS,
        },
        null,
        2,
      ),
    )
    process.exitCode = missingProducts.length > 0 ? 1 : 0
  } else {
    if (missingProducts.length > 0) {
      throw new Error(
        `Missing Payload products for WordPress IDs: ${missingProducts
          .map(({ product }) => product.id)
          .join(', ')}`,
      )
    }

    let createdMedia = 0
    const migratedMedia = await mapWithConcurrency(videoEntries, 2, async (entry, index) => {
      const existing = mediaBySource.get(entry.sourceUrl)
      if (existing) {
        if (!existing.mimeType?.startsWith('video/') || !isVercelBlobUrl(existing.url)) {
          throw new Error(`Existing media ${existing.id} is not a valid Blob video`)
        }
        return existing
      }

      const legacyBlob = legacyBlobByPath.get(entry.pathname)
      if (!legacyBlob) {
        throw new Error(`Missing legacy Blob source: ${entry.pathname}`)
      }

      const response = await fetch(legacyBlob.url, { signal: AbortSignal.timeout(120_000) })
      if (!response.ok) {
        throw new Error(`Cannot download ${legacyBlob.url}: HTTP ${response.status}`)
      }

      const data = Buffer.from(await response.arrayBuffer())
      const filename = path.basename(new URL(entry.sourceUrl).pathname)
      const media = await payload.create({
        collection: 'media',
        data: {
          alt: entry.alt,
          legacySourceUrl: entry.sourceUrl,
        },
        file: {
          data,
          mimetype: response.headers.get('content-type') || 'video/mp4',
          name: filename,
          size: data.byteLength,
        },
        overrideAccess: true,
      })

      if (!media.mimeType?.startsWith('video/') || !isVercelBlobUrl(media.url)) {
        throw new Error(`Uploaded media ${media.id} is not a valid Blob video`)
      }

      createdMedia += 1
      mediaBySource.set(entry.sourceUrl, media)
      console.log(`[${index + 1}/${videoEntries.length}] ${entry.pathname} -> ${media.url}`)
      return media
    })

    let updatedProducts = 0

    for (const [index, entry] of videoEntries.entries()) {
      const product = productsByWordPressId.get(entry.product.id)
      const video = migratedMedia[index]
      if (!product) {
        throw new Error(`Missing product ${entry.product.id}`)
      }

      const currentMedia = product.media ?? []
      const alreadyLinked = currentMedia.some(({ asset }) => {
        const media = populatedMedia(asset)
        return media?.id === video.id
      })

      if (alreadyLinked) continue

      await payload.update({
        collection: 'products',
        id: product.id,
        data: {
          media: [
            ...currentMedia.map(({ asset, isPrimary, alt, id }) => ({
              asset: populatedMedia(asset)?.id ?? asset,
              isPrimary: Boolean(isPrimary),
              alt: alt ?? '',
              id,
            })),
            {
              asset: video.id,
              isPrimary: false,
              alt: entry.alt,
            },
          ],
        },
        draft: false,
        overrideAccess: true,
      })
      updatedProducts += 1
    }

    const verification = await payload.find({
      collection: 'products',
      depth: 1,
      limit: 500,
      overrideAccess: true,
      where: { _status: { equals: 'published' } },
    })
    const videoRelations = verification.docs.flatMap((product) =>
      (product.media ?? [])
        .map(({ asset }) => populatedMedia(asset))
        .filter((media): media is Media => Boolean(media?.mimeType?.startsWith('video/'))),
    )
    const uniqueVideos = new Map(videoRelations.map((media) => [media.id, media] as const))
    const headChecks = await mapWithConcurrency([...uniqueVideos.values()], 6, async (media) => {
      if (!isVercelBlobUrl(media.url) || !media.url.includes('/cms/media/')) {
        return { id: media.id, status: 0, type: 'invalid_url' }
      }
      const response = await fetch(media.url, { method: 'HEAD' })
      return {
        id: media.id,
        status: response.status,
        type: response.headers.get('content-type') ?? '',
      }
    })
    const failedChecks = headChecks.filter(
      ({ status, type }) => status < 200 || status >= 400 || !type.startsWith('video/'),
    )

    if (
      videoRelations.length !== expectedVideoCount ||
      uniqueVideos.size !== expectedVideoCount ||
      failedChecks.length > 0
    ) {
      throw new Error(
        `Video verification failed: ${videoRelations.length} relations, ` +
          `${uniqueVideos.size} unique videos, ${failedChecks.length} failed URLs`,
      )
    }

    if (deleteLegacyVideos) {
      const blobsToDelete = await listLegacyVideos()
      if (![0, expectedVideoCount].includes(blobsToDelete.length)) {
        throw new Error(`Refusing cleanup: found ${blobsToDelete.length} legacy videos`)
      }
      if (blobsToDelete.length > 0) {
        await del(blobsToDelete.map(({ url }) => url))
      }
      const remaining = await listLegacyVideos()
      if (remaining.length > 0) {
        throw new Error(`Legacy video cleanup incomplete: ${remaining.length} objects remain`)
      }
    }

    console.log(
      `Video migration complete: ${createdMedia} media created, ${updatedProducts} products updated, ` +
        `${uniqueVideos.size} CMS videos verified, legacy cleanup ${deleteLegacyVideos ? 'complete' : 'not requested'}.`,
    )
  }
} finally {
  await payload.destroy()
}

process.exit(process.exitCode ?? 0)
