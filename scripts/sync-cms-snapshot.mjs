import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const catalogUrl = process.env.CMS_CATALOG_URL
const outputPath = fileURLToPath(new URL('../src/lib/catalog-snapshot.json', import.meta.url))

if (!catalogUrl) {
  console.log('CMS_CATALOG_URL is not configured; using the committed catalog snapshot.')
  process.exit(0)
}

const response = await fetch(catalogUrl, {
  headers: { Accept: 'application/json' },
  signal: AbortSignal.timeout(30_000),
})

if (!response.ok) {
  throw new Error(`CMS catalog request failed with status ${response.status}`)
}

const catalog = await response.json()

if (!Array.isArray(catalog.products) || catalog.products.length === 0) {
  throw new Error('CMS catalog contains no products')
}

if (!Array.isArray(catalog.gallery) || catalog.gallery.length === 0) {
  throw new Error('CMS catalog contains no gallery items')
}

for (const product of catalog.products) {
  if (!product.slug || !Array.isArray(product.images) || product.images.length === 0) {
    throw new Error(`CMS product ${product.name ?? product.id ?? 'unknown'} is incomplete`)
  }
}

for (const item of catalog.gallery) {
  if (!item.name || !item.image?.startsWith('https://')) {
    throw new Error(`CMS gallery item ${item.id ?? 'unknown'} is incomplete`)
  }
}

await writeFile(
  outputPath,
  `${JSON.stringify({ products: catalog.products, gallery: catalog.gallery }, null, 2)}\n`,
  'utf8',
)

console.log(
  `CMS snapshot synchronized: ${catalog.products.length} products and ` +
    `${catalog.gallery.length} gallery items.`,
)
