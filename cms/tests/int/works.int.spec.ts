import { describe, expect, it } from 'vitest'

import type { Media, Product, Work } from '@/payload-types'
import { pickFeaturedWork, pickSelectedWork, serializePublicWork } from '@/lib/works'

const media = (id: number, extra: Partial<Media> = {}): Media => ({
  id,
  alt: 'zdjęcie',
  url: `https://x.public.blob.vercel-storage.com/m${id}.webp`,
  mimeType: 'image/webp',
  width: 1200,
  height: 1600,
  updatedAt: '2026-11-01T00:00:00.000Z',
  createdAt: '2026-11-01T00:00:00.000Z',
  ...extra,
})

const product = (extra: Partial<Product> = {}) =>
  ({ id: 7, name: 'Morganit w oprawie halo', slug: 'morganit-w-oprawie-halo', _status: 'published', archived: false, ...extra }) as unknown as Product

const work = (extra: Partial<Work> = {}): Work => ({
  id: 1,
  title: 'Pierścionek z morganitem',
  slug: 'pierscionek-z-morganitem',
  kind: 'zamowienie',
  jewelryType: 'pierscionek',
  year: 2026,
  task: ' Zadanie ',
  whatWeDid: 'Zrobione.',
  photos: [{ id: 'a', image: media(1), alt: 'Pierścionek na dłoni' }],
  featured: false,
  position: 0,
  needsConfirmation: true,
  updatedAt: '2026-11-01T00:00:00.000Z',
  createdAt: '2026-11-01T00:00:00.000Z',
  ...extra,
})

describe('serializePublicWork: filmy', () => {
  const video = (id: number) => media(id, { mimeType: 'video/mp4', url: `https://x.public.blob.vercel-storage.com/f${id}.mp4`, width: 1080, height: 1920 })

  it('bez filmów daje pustą listę', () => {
    expect(serializePublicWork(work())?.videos).toEqual([])
  })

  it('pokazuje filmy z podpisem; okładką filmu jest jego klatka albo, gdy jej nie ma, okładka realizacji', () => {
    const result = serializePublicWork(
      work({
        videos: [
          { id: 'v1', file: video(10), caption: 'Film z procesu', poster: media(11) },
          { id: 'v2', file: video(12), caption: 'Gotowe kolczyki' },
        ],
      }),
    )
    expect(result?.videos).toEqual([
      { src: 'https://x.public.blob.vercel-storage.com/f10.mp4', caption: 'Film z procesu', poster: 'https://x.public.blob.vercel-storage.com/m11.webp' },
      { src: 'https://x.public.blob.vercel-storage.com/f12.mp4', caption: 'Gotowe kolczyki', poster: 'https://x.public.blob.vercel-storage.com/m1.webp' },
    ])
  })

  it('pomija wpis, w którym plik nie jest filmem albo nie jest wczytany', () => {
    const result = serializePublicWork(
      work({
        videos: [
          { id: 'v1', file: media(10), caption: 'To zdjęcie' },
          { id: 'v2', file: 99, caption: 'Nie wczytany' },
        ],
      }),
    )
    expect(result?.videos).toEqual([])
  })
})

describe('serializePublicWork', () => {
  it('returns only what the page needs, with labels from kind and jewelry type', () => {
    const result = serializePublicWork(work({ jewelryType: 'obraczka', kind: 'przerobka' }))
    expect(result).toMatchObject({
      slug: 'pierscionek-z-morganitem',
      kindLabel: 'Przeróbka',
      ctaLabel: 'Chcę podobną obrączkę',
      year: 2026,
      task: 'Zadanie',
      duration: '',
      needsConfirmation: true,
      photos: [{ src: 'https://x.public.blob.vercel-storage.com/m1.webp', alt: 'Pierścionek na dłoni', width: 1200, height: 1600 }],
      product: null,
    })
    expect(Object.keys(result ?? {})).not.toContain('_status')
  })

  it.each([
    ['kolczyki', 'Chcę coś podobnego'],
    ['inne', 'Chcę coś podobnego'],
    ['pierscionek', 'Chcę podobny pierścionek'],
  ] as const)('button for %s', (jewelryType, label) => {
    expect(serializePublicWork(work({ jewelryType }))?.ctaLabel).toBe(label)
  })

  it('skips photos that are not populated images and drops a work with no photo at all', () => {
    const mixed = serializePublicWork(
      work({
        photos: [
          { id: 'a', image: 5, alt: 'niewczytane' },
          { id: 'b', image: media(2, { mimeType: 'video/mp4' }), alt: 'film' },
          { id: 'c', image: media(3), alt: 'dobre' },
        ],
      }),
    )
    expect(mixed?.photos.map((p) => p.alt)).toEqual(['dobre'])
    expect(serializePublicWork(work({ photos: [{ id: 'a', image: 5, alt: 'x' }] }))).toBeNull()
  })

  it('links a catalog product only when it is published and not archived', () => {
    expect(serializePublicWork(work({ product: product() }))?.product).toEqual({
      slug: 'morganit-w-oprawie-halo',
      name: 'Morganit w oprawie halo',
    })
    expect(serializePublicWork(work({ product: product({ _status: 'draft' }) }))?.product).toBeNull()
    expect(serializePublicWork(work({ product: product({ archived: true }) }))?.product).toBeNull()
    expect(serializePublicWork(work({ product: 7 }))?.product).toBeNull()
  })
})

describe('wybór realizacji do górnego okna', () => {
  const list = [
    { slug: 'a', featured: false },
    { slug: 'b', featured: true },
    { slug: 'c', featured: true },
  ]

  it('takes the first featured one by position, or the first one when none is featured', () => {
    expect(pickFeaturedWork(list)?.slug).toBe('b')
    expect(pickFeaturedWork(list.map((w) => ({ ...w, featured: false })))?.slug).toBe('a')
    expect(pickFeaturedWork([])).toBeUndefined()
  })

  it('honours ?r= and falls back to the featured one for an unknown or empty slug', () => {
    expect(pickSelectedWork(list, 'c')?.slug).toBe('c')
    expect(pickSelectedWork(list, 'nie-ma-takiej')?.slug).toBe('b')
    expect(pickSelectedWork(list, '')?.slug).toBe('b')
    expect(pickSelectedWork(list, null)?.slug).toBe('b')
  })
})
