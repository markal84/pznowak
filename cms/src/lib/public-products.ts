import type { Media, Product } from '../payload-types'

export const DEFAULT_PRODUCTS_LIMIT = 3
export const MAX_PRODUCTS_LIMIT = 10

export type PublicProduct = {
  id: number
  slug: string
  name: string
  lead: string
  imagePath: string
  metal: string
  stone: string
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
  const primaryEntry = mediaEntries.find(({ asset, isPrimary }) => isPrimary && populatedMedia(asset))
  const firstPopulatedEntry = mediaEntries.find(({ asset }) => populatedMedia(asset))
  const image = populatedMedia((primaryEntry ?? firstPopulatedEntry)?.asset ?? 0)

  return {
    id: product.legacy?.wordpressId ?? product.id,
    slug: product.slug,
    name: product.name,
    lead: product.lead ?? '',
    imagePath: image?.url ?? '',
    metal: product.metal ?? '',
    stone: product.stone ?? '',
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
