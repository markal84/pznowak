import type { Product } from '@/payload-types'
import {
  parseProductsLimit,
  sampleProducts,
  serializePublicProduct,
} from '@/lib/public-products'
import { describe, expect, it } from 'vitest'

const product = {
  id: 999,
  name: 'Merope',
  slug: 'merope-2',
  lead: 'Elegancki pierścionek Merope',
  metal: 'Złoto',
  stone: 'Diament',
  legacy: { wordpressId: 529 },
  media: [
    {
      asset: {
        id: 2,
        alt: 'Drugie zdjęcie',
        url: 'https://example.public.blob.vercel-storage.com/cms/media/secondary.jpg',
        mimeType: 'image/jpeg',
        updatedAt: '2026-09-20T00:00:00.000Z',
        createdAt: '2026-09-20T00:00:00.000Z',
      },
      isPrimary: false,
    },
    {
      asset: {
        id: 1,
        alt: 'Zdjęcie główne',
        url: 'https://example.public.blob.vercel-storage.com/cms/media/primary.jpg',
        mimeType: 'image/jpeg',
        updatedAt: '2026-09-20T00:00:00.000Z',
        createdAt: '2026-09-20T00:00:00.000Z',
      },
      isPrimary: true,
    },
    {
      asset: {
        id: 3,
        alt: 'Film produktu',
        url: 'https://example.public.blob.vercel-storage.com/cms/media/product.mp4',
        mimeType: 'video/mp4',
        updatedAt: '2026-09-20T00:00:00.000Z',
        createdAt: '2026-09-20T00:00:00.000Z',
      },
      isPrimary: false,
    },
  ],
  sortOrder: 0,
  updatedAt: '2026-09-20T00:00:00.000Z',
  createdAt: '2026-09-20T00:00:00.000Z',
  _status: 'published',
} satisfies Product

describe('public products compatibility', () => {
  it('keeps the previous bounded limit behavior', () => {
    expect(parseProductsLimit(undefined)).toBe(3)
    expect(parseProductsLimit('invalid')).toBe(3)
    expect(parseProductsLimit('0')).toBe(1)
    expect(parseProductsLimit('50')).toBe(10)
  })

  it('serializes a Payload product to the existing API contract', () => {
    expect(serializePublicProduct(product)).toEqual({
      id: 529,
      slug: 'merope-2',
      name: 'Merope',
      lead: 'Elegancki pierścionek Merope',
      description: '',
      imagePath: 'https://example.public.blob.vercel-storage.com/cms/media/primary.jpg',
      images: [
        'https://example.public.blob.vercel-storage.com/cms/media/secondary.jpg',
        'https://example.public.blob.vercel-storage.com/cms/media/primary.jpg',
      ],
      video: 'https://example.public.blob.vercel-storage.com/cms/media/product.mp4',
      metal: 'Złoto',
      stone: 'Diament',
      carats: '',
      clarity: '',
    })
  })

  it('returns a unique sample with the requested length', () => {
    const sample = sampleProducts([1, 2, 3, 4], 3, () => 0.25)

    expect(sample).toHaveLength(3)
    expect(new Set(sample).size).toBe(3)
  })
})
