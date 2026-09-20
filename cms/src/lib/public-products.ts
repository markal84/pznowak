import type { Media, Product } from '../payload-types'

export const DEFAULT_PRODUCTS_LIMIT = 3
export const MAX_PRODUCTS_LIMIT = 10

export type PublicProduct = {
  id: number
  slug: string
  name: string
  lead: string
  description: string
  imagePath: string
  images: string[]
  video: string
  metal: string
  stone: string
  carats: string
  clarity: string
}

export function parseProductsLimit(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? String(DEFAULT_PRODUCTS_LIMIT), 10)

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PRODUCTS_LIMIT
  }

  return Math.min(Math.max(parsed, 1), MAX_PRODUCTS_LIMIT)
}

function populatedMedia(asset: number | Media): Media | null {
  return typeof asset === 'object' && asset !== null ? asset : null
}

export function serializePublicProduct(product: Product): PublicProduct {
  const mediaEntries = product.media ?? []
  const imageEntries = mediaEntries.filter(({ asset }) =>
    populatedMedia(asset)?.mimeType?.startsWith('image/'),
  )
  const primaryEntry = imageEntries.find(({ isPrimary }) => isPrimary)
  const image = populatedMedia((primaryEntry ?? imageEntries[0])?.asset ?? 0)
  const images = imageEntries
    .map(({ asset }) => populatedMedia(asset)?.url ?? '')
    .filter((url) => url.length > 0)
  const video = mediaEntries
    .map(({ asset }) => populatedMedia(asset))
    .find((asset) => asset?.mimeType?.startsWith('video/'))

  return {
    id: product.legacy?.wordpressId ?? product.id,
    slug: product.slug,
    name: product.name,
    lead: product.lead ?? '',
    description: product.description ?? '',
    imagePath: image?.url ?? '',
    images,
    video: video?.url ?? '',
    metal: product.metal ?? '',
    stone: product.stone ?? '',
    carats: product.carats ?? '',
    clarity: product.clarity ?? '',
  }
}

export function sampleProducts<T>(
  products: readonly T[],
  limit: number,
  random: () => number = Math.random,
): T[] {
  const shuffled = [...products]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }

  return shuffled.slice(0, limit)
}
