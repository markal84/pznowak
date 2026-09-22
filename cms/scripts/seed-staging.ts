import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import type { Media } from '../src/payload-types'

type Snapshot = {
  gallery: Array<{ id: number; image: string; name: string }>
  products: Array<{
    carats?: string
    clarity?: string
    description?: string
    images: string[]
    lead?: string
    metal?: string
    name: string
    slug: string
    stone?: string
  }>
}

const applyChanges = process.argv.includes('--apply')
const snapshotPath = fileURLToPath(new URL('../../src/lib/catalog-snapshot.json', import.meta.url))

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('seed-staging must run with NEON_BRANCH=staging')
}

const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8')) as Snapshot
const productSource = snapshot.products[0]
const gallerySource = snapshot.gallery[0]

if (!productSource?.images[0] || !gallerySource?.image) {
  throw new Error('The frontend snapshot does not contain staging seed media')
}

const payload = await getPayload({ config: await config })

async function ensureRemoteMedia(
  sourceKey: string,
  url: string,
  alt: string,
): Promise<Media> {
  const existing = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { legacySourceUrl: { equals: sourceKey } },
  })

  if (existing.docs[0]) return existing.docs[0] as Media

  const filename = path.basename(new URL(url).pathname)

  return payload.create({
    collection: 'media',
    data: {
      alt,
      filename,
      filesize: 0,
      legacySourceUrl: sourceKey,
      mimeType: 'image/jpeg',
      url,
    },
    overrideAccess: true,
  })
}

try {
  const counts = await Promise.all([
    payload.count({ collection: 'products', overrideAccess: true }),
    payload.count({ collection: 'media', overrideAccess: true }),
    payload.count({ collection: 'gallery-items', overrideAccess: true }),
  ])

  console.log(
    `Staging check: products=${counts[0].totalDocs}, media=${counts[1].totalDocs}, ` +
      `gallery=${counts[2].totalDocs}.`,
  )

  if (!applyChanges) {
    process.exitCode = 0
  } else {
    const productMedia = await ensureRemoteMedia(
      'staging://product-primary',
      productSource.images[0],
      `${productSource.name} - staging`,
    )
    const galleryMedia = await ensureRemoteMedia(
      'staging://gallery-primary',
      gallerySource.image,
      `${gallerySource.name} - staging`,
    )
    const products = await payload.find({
      collection: 'products',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { 'legacy.wordpressId': { equals: 900001 } },
    })
    const productData = {
      name: `${productSource.name} — staging`,
      generateSlug: false,
      slug: 'staging-catalog-product',
      lead: productSource.lead ?? '',
      description: productSource.description ?? '',
      metal: productSource.metal ?? '',
      stone: productSource.stone ?? '',
      carats: productSource.carats ?? '',
      clarity: productSource.clarity ?? '',
      media: [{ asset: productMedia.id, isPrimary: true, alt: productMedia.alt }],
      legacy: { wordpressId: 900001, sourcePayload: { source: 'controlled-staging-seed' } },
      sortOrder: 0,
      _status: 'published' as const,
    }

    if (products.docs[0]) {
      await payload.update({
        collection: 'products',
        id: products.docs[0].id,
        data: productData,
        draft: false,
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'products',
        data: productData,
        draft: false,
        overrideAccess: true,
      })
    }

    const gallery = await payload.find({
      collection: 'gallery-items',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { wordpressId: { equals: 900001 } },
    })
    const galleryData = {
      name: `${gallerySource.name} — staging`,
      image: galleryMedia.id,
      alt: `${gallerySource.name} - staging`,
      position: 0,
      wordpressId: 900001,
      _status: 'published' as const,
    }

    if (gallery.docs[0]) {
      await payload.update({
        collection: 'gallery-items',
        id: gallery.docs[0].id,
        data: galleryData,
        draft: false,
        overrideAccess: true,
      })
    } else {
      await payload.create({
        collection: 'gallery-items',
        data: galleryData,
        draft: false,
        overrideAccess: true,
      })
    }

    await payload.updateGlobal({
      slug: 'site-content',
      data: {
        homeHeading: 'Kontrolowane środowisko staging',
        homeLead: 'Dane testowe — nie publikować jako produkcja.',
        _status: 'published',
      },
      draft: false,
      overrideAccess: true,
    })

    const verified = await Promise.all([
      payload.count({
        collection: 'products',
        overrideAccess: true,
        where: { _status: { equals: 'published' } },
      }),
      payload.count({
        collection: 'gallery-items',
        overrideAccess: true,
        where: { _status: { equals: 'published' } },
      }),
    ])

    if (verified[0].totalDocs !== 1 || verified[1].totalDocs !== 1) {
      throw new Error(
        `Unexpected staging seed counts: products=${verified[0].totalDocs}, ` +
          `gallery=${verified[1].totalDocs}`,
      )
    }

    console.log('Staging seed complete: 1 product, 2 remote media records and 1 gallery item.')
  }
} finally {
  await payload.destroy()
}
