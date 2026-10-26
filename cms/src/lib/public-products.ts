import type { GalleryItem, Media, Product, SiteContent } from '../payload-types'

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

/** Pola SEO pierścionka (wtyczka SEO w Payload). Tylko dla stron serwisu; publiczny kontrakt API (`PublicProduct`) bez zmian. */
export type ProductSeoFields = {
  seoTitle: string
  seoDescription: string
  seoImage: string
  /** Data ostatniej zmiany (ISO); trafia do `lastModified` w sitemap.xml. */
  updatedAt: string
}

/** Wybór pierścionków na stronę główną (panel: pola w pasku bocznym). Tylko dla stron serwisu, nie dla publicznego API. */
export type ProductHomeFields = {
  featuredOnHome: boolean
  /** Kolejność w sekcji „Wybrane pierścionki”; mniejsza liczba = wcześniej. */
  homeOrder: number
}

export type SiteProduct = PublicProduct & ProductSeoFields & ProductHomeFields

export type PublicGalleryItem = {
  id: number
  name: string
  image: string
}

export type PublicSiteContent = Pick<
  SiteContent,
  | 'aboutHeading'
  | 'aboutText'
  | 'address'
  | 'email'
  | 'homeHeading'
  | 'homeLead'
  | 'openingHours'
  | 'phone'
>

export function parseProductsLimit(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? String(DEFAULT_PRODUCTS_LIMIT), 10)

  if (!Number.isFinite(parsed)) {
    return DEFAULT_PRODUCTS_LIMIT
  }

  return Math.min(Math.max(parsed, 1), MAX_PRODUCTS_LIMIT)
}

export function populatedMedia(asset: number | Media): Media | null {
  return typeof asset === 'object' && asset !== null ? asset : null
}

export function serializePublicGalleryItem(item: GalleryItem): PublicGalleryItem {
  return {
    id: item.wordpressId ?? item.id,
    name: item.name,
    image: populatedMedia(item.image)?.url ?? '',
  }
}

export function serializePublicSiteContent(content: SiteContent): PublicSiteContent {
  return {
    aboutHeading: content.aboutHeading ?? null,
    aboutText: content.aboutText ?? null,
    address: content.address ?? null,
    email: content.email ?? null,
    homeHeading: content.homeHeading ?? null,
    homeLead: content.homeLead ?? null,
    openingHours: content.openingHours ?? null,
    phone: content.phone ?? null,
  }
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

export function serializeSiteProduct(product: Product): SiteProduct {
  return {
    ...serializePublicProduct(product),
    seoTitle: product.meta?.title?.trim() ?? '',
    seoDescription: product.meta?.description?.trim() ?? '',
    seoImage: populatedMedia(product.meta?.image ?? 0)?.url ?? '',
    updatedAt: product.updatedAt,
    featuredOnHome: product.featuredOnHome === true,
    homeOrder: product.homeOrder ?? 0,
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
