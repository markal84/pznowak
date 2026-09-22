import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import type { GalleryItem, Media, Product } from '../src/payload-types'

type LegacyGalleryItem = {
  id: number
  image: string
  name: string
}

type LegacyCatalog = {
  gallery: LegacyGalleryItem[]
  products: Array<{
    images?: string[]
  }>
}

const applyChanges = process.argv.includes('--apply')
const expectedGalleryCount = 11
const catalogPath = fileURLToPath(new URL('../../src/lib/collection.json', import.meta.url))
const publicPath = fileURLToPath(new URL('../../public', import.meta.url))

const siteContent = {
  homeHeading: 'Niepowtarzalny. Jak Twoja historia.',
  homeLead:
    'Pierścionki i biżuteria tworzone na indywidualne zamówienie. Od pierwszego pomysłu po detal, który zostanie z Tobą na lata.',
  aboutHeading: 'Biżuteria zaczyna się od człowieka.',
  aboutText:
    'Jesteśmy rodzinną pracownią z Buska-Zdroju. Łączymy klasyczne rzemiosło z nowoczesnymi technikami projektowania i produkcji.',
  phone: '+48 501 321 347',
  email: 'kontakt@pznowak.pl',
  address: 'Kilińskiego 12, 28-100 Busko-Zdrój',
  openingHours: 'Poniedziałek–piątek: 8:00–16:00\nSobota: 10:00–16:00',
  _status: 'published' as const,
}

function isBlobUrl(value: null | string | undefined): value is string {
  return Boolean(value?.startsWith('https://') && value.includes('.blob.vercel-storage.com/'))
}

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
      throw new Error(`Unsupported image type: ${filename}`)
  }
}

async function uploadMedia(
  payload: Awaited<ReturnType<typeof getPayload>>,
  sourceUrl: string,
  alt: string,
): Promise<Media> {
  const filename = path.basename(sourceUrl)
  const data = await readFile(path.join(publicPath, sourceUrl.replace(/^\//, '')))

  return payload.create({
    collection: 'media',
    data: { alt, legacySourceUrl: sourceUrl },
    file: {
      data,
      mimetype: mimeTypeFor(filename),
      name: filename,
      size: data.byteLength,
    },
    overrideAccess: true,
  })
}

const source = JSON.parse(await readFile(catalogPath, 'utf8')) as LegacyCatalog
const sourceUrlByFilename = new Map(
  [
    ...source.products.flatMap(({ images = [] }) => images),
    ...source.gallery.map(({ image }) => image),
  ].map((sourceUrl) => [path.basename(sourceUrl), sourceUrl] as const),
)

if (source.gallery.length !== expectedGalleryCount) {
  throw new Error(`Expected ${expectedGalleryCount} gallery items, found ${source.gallery.length}`)
}

if (process.env.NEON_BRANCH !== 'production') {
  throw new Error('bootstrap-catalog-content must run with NEON_BRANCH=production')
}

const payload = await getPayload({ config: await config })

try {
  const [mediaResult, productsResult, galleryResult, currentSiteContent] = await Promise.all([
    payload.find({
      collection: 'media',
      depth: 0,
      limit: 500,
      overrideAccess: true,
    }),
    payload.find({ collection: 'products', depth: 0, limit: 500, overrideAccess: true }),
    payload.find({ collection: 'gallery-items', depth: 0, limit: 100, overrideAccess: true }),
    payload.findGlobal({ slug: 'site-content', draft: true, overrideAccess: true }),
  ])

  const mediaBySource = new Map<string, Media>()
  const invalidMedia = (mediaResult.docs as Media[]).filter(({ url }) => !isBlobUrl(url))

  for (const media of mediaResult.docs as Media[]) {
    if (media.legacySourceUrl && isBlobUrl(media.url)) {
      mediaBySource.set(media.legacySourceUrl, media)
    }
  }

  const missingGalleryMedia = source.gallery.filter(({ image }) => !mediaBySource.has(image))
  const existingGalleryByWordPressId = new Map<number, GalleryItem>()

  for (const item of galleryResult.docs as GalleryItem[]) {
    if (item.wordpressId) existingGalleryByWordPressId.set(item.wordpressId, item)
  }

  console.log(
    `Content check: ${invalidMedia.length} invalid media URLs, ` +
      `${missingGalleryMedia.length} gallery uploads, ` +
      `${existingGalleryByWordPressId.size}/${expectedGalleryCount} gallery rows, ` +
      `site content ${currentSiteContent.homeHeading ? 'configured' : 'empty'}.`,
  )

  if (!applyChanges) {
    process.exitCode = 0
  } else {
    const replacementIds = new Map<number, number>()

    for (const media of invalidMedia) {
      const sourceUrl =
        media.legacySourceUrl ??
        (media.filename ? sourceUrlByFilename.get(media.filename) : undefined)

      if (!sourceUrl) {
        throw new Error(`Cannot resolve a local source file for media ${media.id}`)
      }

      const replacement = await uploadMedia(payload, sourceUrl, media.alt)
      replacementIds.set(media.id, replacement.id)
      mediaBySource.set(sourceUrl, replacement)
    }

    for (const product of productsResult.docs as Product[]) {
      const entries = product.media ?? []
      const nextEntries = entries.map((entry) => {
        const assetId = typeof entry.asset === 'number' ? entry.asset : entry.asset.id
        const replacementId = replacementIds.get(assetId)
        return replacementId ? { ...entry, asset: replacementId } : entry
      })
      const changed = entries.some((entry, index) => nextEntries[index].asset !== entry.asset)

      if (changed) {
        await payload.update({
          collection: 'products',
          id: product.id,
          data: { media: nextEntries },
          overrideAccess: true,
        })
      }
    }

    for (const media of invalidMedia) {
      if (replacementIds.has(media.id)) {
        await payload.delete({ collection: 'media', id: media.id, overrideAccess: true })
      }
    }

    for (const item of source.gallery) {
      let media = mediaBySource.get(item.image)

      if (!media) {
        media = await uploadMedia(payload, item.image, item.name)
        mediaBySource.set(item.image, media)
      }

      const data = {
        name: item.name,
        image: media.id,
        alt: item.name,
        position: source.gallery.indexOf(item),
        wordpressId: item.id,
        _status: 'published' as const,
      }
      const existing = existingGalleryByWordPressId.get(item.id)

      if (existing) {
        await payload.update({
          collection: 'gallery-items',
          id: existing.id,
          data,
          draft: false,
          overrideAccess: true,
        })
      } else {
        await payload.create({
          collection: 'gallery-items',
          data,
          draft: false,
          overrideAccess: true,
        })
      }
    }

    await payload.updateGlobal({
      slug: 'site-content',
      data: siteContent,
      draft: false,
      overrideAccess: true,
    })

    const [publishedGallery, remainingInvalidMedia, updatedSiteContent] = await Promise.all([
      payload.find({
        collection: 'gallery-items',
        depth: 1,
        limit: 100,
        overrideAccess: true,
        where: { _status: { equals: 'published' } },
      }),
      payload.find({
        collection: 'media',
        limit: 500,
        overrideAccess: true,
      }),
      payload.findGlobal({ slug: 'site-content', draft: false, overrideAccess: true }),
    ])
    const invalidAfter = (remainingInvalidMedia.docs as Media[]).filter(({ url }) => !isBlobUrl(url))

    if (
      publishedGallery.totalDocs !== expectedGalleryCount ||
      invalidAfter.length !== 0 ||
      updatedSiteContent.homeHeading !== siteContent.homeHeading
    ) {
      throw new Error(
        `Content verification failed: gallery=${publishedGallery.totalDocs}, ` +
          `invalidMedia=${invalidAfter.length}, siteContent=${Boolean(updatedSiteContent.homeHeading)}`,
      )
    }

    console.log(
      `Content bootstrap complete: ${replacementIds.size} media repaired, ` +
        `${publishedGallery.totalDocs} gallery items published and site content configured.`,
    )
  }
} finally {
  await payload.destroy()
}
