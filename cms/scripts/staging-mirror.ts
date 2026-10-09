import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parse } from 'dotenv'
import { getPayload } from 'payload'
import type { Media, Product } from '../src/payload-types'

// Production is read through SQL in a single READ ONLY snapshot, never Payload.
const require = createRequire(import.meta.resolve('@payloadcms/db-postgres'))
const { Client } = require('pg')
const apply = process.argv.includes('--apply')
if (process.argv.includes('--check') && apply) throw new Error('Choose --check or --apply')
const root = fileURLToPath(new URL('../../', import.meta.url))
const sourceEnv = parse(await readFile(path.join(root, 'backend/.env.local')))
const targetEnv = parse(await readFile(path.join(root, 'backend/.env.staging.local')))
const cmsEnv = parse(await readFile(path.join(root, 'cms/.env')))
const sourceUrl = sourceEnv.DATABASE_URL_UNPOOLED
const targetUrl = targetEnv.DATABASE_URL
if (sourceEnv.NEON_BRANCH !== 'production' || targetEnv.NEON_BRANCH !== 'staging') {
  throw new Error('Source must be production; target must be staging')
}
const sourceHost = new URL(sourceUrl).hostname.replace('-pooler', '')
const targetHost = new URL(targetUrl).hostname.replace('-pooler', '')
if (sourceHost === targetHost || !targetHost.endsWith('.neon.tech'))
  throw new Error('Unsafe mirror target')
console.log(`Mirror ${apply ? 'APPLY' : 'CHECK'}: ${sourceHost} -> ${targetHost}`)
Object.assign(process.env, cmsEnv, sourceEnv, targetEnv, { NEON_BRANCH: 'staging' })
const tokenStore = sourceEnv.BLOB_READ_WRITE_TOKEN?.match(
  /^vercel_blob_rw_([a-z\d]+)_/i,
)?.[1].toLowerCase()
if (!tokenStore) throw new Error('Blob store token is missing')
const db = new Client({ connectionString: sourceUrl, connectionTimeoutMillis: 15000 })
await db.connect()
// No config import, migration, schema push, or application hooks on production.
await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
type Row = Record<string, unknown>
let products: Row[], relations: Row[], media: Row[], gallery: Row[], site: Row
try {
  const query = async (table: string, filter = ''): Promise<Row[]> =>
    (await db.query(`SELECT to_jsonb(t) AS doc FROM ${table} t ${filter}`)).rows.map(
      (r: { doc: Row }) => r.doc,
    )
  products = await query(
    'cms_products',
    "WHERE _status = 'published' AND archived IS NOT TRUE AND deleted_at IS NULL ORDER BY sort_order, id",
  )
  relations = await query('cms_products_media', 'ORDER BY _parent_id, _order')
  media = await query('cms_media', 'WHERE deleted_at IS NULL')
  gallery = await query(
    'cms_gallery_items',
    "WHERE _status = 'published' AND deleted_at IS NULL ORDER BY position, id",
  )
  const sites = await query('cms_site_content', "WHERE _status = 'published'")
  if (sites.length !== 1) throw new Error('Expected one published site-content')
  site = sites[0]
} finally {
  await db.query('ROLLBACK')
  await db.end()
}
const productIds = new Set(products.map((p) => p.id))
const usedRelations = relations.filter((r) => productIds.has(r._parent_id))
const mediaIds = new Set([
  ...usedRelations.map((r) => r.asset_id),
  ...gallery.map((g) => g.image_id),
])
const sourceMedia = media.filter((m) => mediaIds.has(m.id))
if (sourceMedia.length !== mediaIds.size) throw new Error('Production media relationship missing')
const blobUrl = (m: Row) =>
  `https://${tokenStore}.public.blob.vercel-storage.com/${m.prefix}/${m.filename}`
async function assertHttp200(url: string) {
  const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30000) })
  if (response.status !== 200) throw new Error(`Media HTTP ${response.status}: ${url}`)
}
for (const m of sourceMedia) await assertHttp200(blobUrl(m))
const config = (await import('../src/payload.config')).default
const payload = await getPayload({ config: await config })
const context = { skipFrontendRevalidation: true }
function matching(a: unknown, b: unknown): boolean {
  if (typeof b !== 'object' || b === null) return a === b
  if (Array.isArray(b))
    return Array.isArray(a) && a.length === b.length && b.every((v, i) => matching(a[i], v))
  return Object.entries(b).every(([key, value]) =>
    matching((a as Record<string, unknown>)[key], value),
  )
}
try {
  const currentProducts = await payload.find({
    collection: 'products',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  const currentGallery = await payload.find({
    collection: 'gallery-items',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  const currentMedia = await payload.find({
    collection: 'media',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  console.log(
    `Source products=${products.length}, gallery=${gallery.length}, referencedMedia=${sourceMedia.length}; staging products=${currentProducts.totalDocs}, gallery=${currentGallery.totalDocs}`,
  )
  const mediaMap = new Map<unknown, number>()
  let uploads = 0,
    changes = 0
  for (const m of sourceMedia) {
    const key = `mirror-production-media:${m.id}:${m.filename}`
    let existing = currentMedia.docs.find(
      (d) => d.legacySourceUrl === key && d.prefix === 'cms/media-staging',
    )
    if (!existing) {
      uploads++
      if (apply) {
        const response = await fetch(blobUrl(m), { signal: AbortSignal.timeout(60000) })
        if (response.status !== 200) throw new Error(`Download HTTP ${response.status}`)
        const buffer = Buffer.from(await response.arrayBuffer())
        existing = await payload.create({
          collection: 'media',
          overrideAccess: true,
          data: {
            alt: String(m.alt || m.filename),
            legacySourceUrl: key,
          },
          file: {
            data: buffer,
            mimetype: String(m.mime_type),
            name: String(m.filename),
            size: buffer.length,
          },
        })
        existing = await payload.findByID({
          collection: 'media',
          id: existing.id,
          depth: 0,
          overrideAccess: true,
        })
        console.log(`Copied media ${m.id} (${uploads})`)
      }
    }
    if (existing) {
      mediaMap.set(m.id, existing.id)
      if (!existing.url || !existing.url.includes('/cms/media-staging/'))
        throw new Error('Staging media URL must have isolated prefix')
      await assertHttp200(existing.url)
    }
  }
  for (const p of products) {
    const entries = usedRelations.filter((r) => r._parent_id === p.id)
    const data = {
      name: String(p.name),
      slug: String(p.slug),
      generateSlug: false,
      lead: String(p.lead ?? ''),
      description: String(p.description ?? ''),
      metal: String(p.metal ?? ''),
      stone: String(p.stone ?? ''),
      carats: String(p.carats ?? ''),
      clarity: String(p.clarity ?? ''),
      archived: false,
      sortOrder: Number(p.sort_order),
      legacy: {
        wordpressId: Number(p.legacy_wordpress_id),
        sourcePayload: p.legacy_source_payload as NonNullable<Product['legacy']>['sourcePayload'],
      },
      media: entries.map((r) => ({
        asset: mediaMap.get(r.asset_id)!,
        isPrimary: Boolean(r.is_primary),
        alt: String(r.alt ?? ''),
      })),
      _status: 'published' as const,
    }
    const old = currentProducts.docs.find((d) => d.legacy?.wordpressId === data.legacy.wordpressId)
    if (!old || !matching(old, data)) {
      changes++
      if (apply) {
        if (old)
          await payload.update({
            collection: 'products',
            id: old.id,
            data,
            draft: false,
            context,
            overrideAccess: true,
          })
        else
          await payload.create({
            collection: 'products',
            data,
            draft: false,
            context,
            overrideAccess: true,
          })
      }
    }
  }
  for (const g of gallery) {
    const data = {
      name: String(g.name),
      alt: String(g.alt),
      position: Number(g.position),
      wordpressId: Number(g.wordpress_id),
      image: mediaMap.get(g.image_id)!,
      _status: 'published' as const,
    }
    const old = currentGallery.docs.find((d) => d.wordpressId === data.wordpressId)
    if (!old || !matching(old, data)) {
      changes++
      if (apply) {
        if (old)
          await payload.update({
            collection: 'gallery-items',
            id: old.id,
            data,
            draft: false,
            context,
            overrideAccess: true,
          })
        else
          await payload.create({
            collection: 'gallery-items',
            data,
            draft: false,
            context,
            overrideAccess: true,
          })
      }
    }
  }
  // Retain controlled seed records as drafts; never delete their media.
  for (const p of currentProducts.docs.filter(
    (p) => p.legacy?.wordpressId === 900001 && p._status === 'published',
  )) {
    changes++
    if (apply)
      await payload.update({
        collection: 'products',
        id: p.id,
        data: { archived: true, _status: 'draft' },
        draft: false,
        context,
        overrideAccess: true,
      })
  }
  for (const g of currentGallery.docs.filter(
    (g) => g.wordpressId === 900001 && g._status === 'published',
  )) {
    changes++
    if (apply)
      await payload.update({
        collection: 'gallery-items',
        id: g.id,
        data: { _status: 'draft' },
        draft: false,
        context,
        overrideAccess: true,
      })
  }
  const siteData = {
    homeHeading: String(site.home_heading).replace(
      'Niepowtarzalny. Jak Twoja historia.',
      'Niepowtarzalny.\nJak *Twoja historia.*',
    ),
    aboutHeading: String(site.about_heading).replace(
      'Biżuteria zaczyna się od człowieka.',
      'Biżuteria zaczyna się\nod *człowieka.*',
    ),
    homeLead: String(site.home_lead),
    aboutText: String(site.about_text),
    phone: String(site.phone),
    email: String(site.email),
    address: String(site.address),
    openingHours: String(site.opening_hours),
    _status: 'published' as const,
  }
  const oldSite = await payload.findGlobal({
    slug: 'site-content',
    draft: false,
    overrideAccess: true,
  })
  if (!matching(oldSite, siteData)) {
    changes++
    if (apply)
      await payload.updateGlobal({
        slug: 'site-content',
        data: siteData,
        draft: false,
        context,
        overrideAccess: true,
      })
  }
  console.log(`Plan: uploads=${uploads}, recordChanges=${changes}`)
  if (apply || (uploads === 0 && changes === 0)) {
    const result = await payload.find({
      collection: 'products',
      limit: 1000,
      depth: 1,
      sort: 'sortOrder',
      overrideAccess: false,
    })
    const resultGallery = await payload.find({
      collection: 'gallery-items',
      limit: 1000,
      depth: 1,
      sort: 'position',
      overrideAccess: false,
    })
    if (
      JSON.stringify(result.docs.map((d) => d.slug)) !== JSON.stringify(products.map((p) => p.slug))
    )
      throw new Error('Product order/count mismatch')
    if (resultGallery.totalDocs !== gallery.length) throw new Error('Gallery count mismatch')
    const urls = new Set<string>()
    for (const p of result.docs)
      for (const entry of p.media ?? []) {
        const m = entry.asset as Media
        if (m.prefix !== 'cms/media-staging' || !m.url) throw new Error('Unsafe product media')
        urls.add(m.url)
      }
    for (const g of resultGallery.docs) {
      const m = g.image as Media
      if (m.prefix !== 'cms/media-staging' || !m.url) throw new Error('Unsafe gallery media')
      urls.add(m.url)
    }
    for (const url of urls) await assertHttp200(url)
    console.log(
      `VERIFIED: products=${result.totalDocs}, gallery=${resultGallery.totalDocs}, mediaHTTP200=${urls.size}, order=equal`,
    )
  }
} finally {
  await payload.destroy()
}
process.exit(0)
