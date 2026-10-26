import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { pickHomeRings } from '@/lib/home'
import { findPlaceholders } from '@/lib/placeholders'
import type { SiteProduct } from '@/lib/public-products'
import type { ReviewsConfig } from '@/lib/reviews'

/**
 * Znaczniki „do uzupełnienia” (zlecenie I, pkt 7): na produkcji w HTML nie może być żadnego `[…]`
 * (np. `[TERMIN`, `[X`, `[asortyment`), a na podglądzie znaczniki mają być widoczne.
 */

const product = (id: number, name: string, extra: Partial<SiteProduct> = {}): SiteProduct => ({
  id,
  slug: name.toLowerCase(),
  name,
  lead: '',
  description: '',
  imagePath: `/media/${name}.jpg`,
  images: [`/media/${name}.jpg`, `/media/${name}-2.jpg`],
  video: '',
  metal: 'żółte złoto',
  stone: 'Szafir, diament',
  carats: '',
  clarity: '',
  seoTitle: '',
  seoDescription: '',
  seoImage: '',
  updatedAt: '2026-10-26T00:00:00.000Z',
  featuredOnHome: false,
  homeOrder: 0,
  ...extra,
})

const catalog = [
  product(1, 'Phoebe'),
  product(2, 'Harmonia'),
  product(3, 'Athena'),
  product(4, 'Nyx'),
  product(5, 'Pyrrha'),
  product(6, 'Bez-kamienia', { stone: '', metal: '' }),
]

vi.mock('@/lib/collection', () => ({
  getProducts: async () => catalog,
  getGallery: async () => [
    { id: 1, name: 'Obrączki płaskie 5 mm', image: '/media/g1.jpg' },
    { id: 2, name: 'Realizacja', image: '/media/g2.jpg' },
    { id: 3, name: 'Realizacja', image: '/media/g3.jpg' },
  ],
}))

const { default: HomePage } = await import('@/app/(frontend)/page')
const { default: CatalogPage } = await import('@/app/(frontend)/pierscionki/page')
const { default: ProductPage } = await import('@/app/(frontend)/pierscionki/[slug]/page')
const { default: BandsPage } = await import('@/app/(frontend)/obraczki/page')
const { default: OnOrderPage } = await import('@/app/(frontend)/na-zamowienie/page')
const { default: RepairsPage } = await import('@/app/(frontend)/naprawy/page')
const { default: WorksPage } = await import('@/app/(frontend)/realizacje/page')
const { default: StudioPage } = await import('@/app/(frontend)/pracownia/page')
const { default: ContactPage } = await import('@/app/(frontend)/kontakt/page')
const { default: SiteFooter } = await import('@/components/site/SiteFooter')
const { default: GoogleReviews } = await import('@/components/site/GoogleReviews')

const html = (element: ReactElement) => renderToStaticMarkup(element)

const pages = async () => ({
  '/': html(await HomePage()),
  '/pierscionki': html(await CatalogPage()),
  '/pierscionki/phoebe': html(await ProductPage({ params: Promise.resolve({ slug: 'phoebe' }) })),
  '/pierscionki/bez-kamienia': html(await ProductPage({ params: Promise.resolve({ slug: 'bez-kamienia' }) })),
  '/obraczki': html(await BandsPage()),
  '/na-zamowienie': html(await OnOrderPage()),
  '/naprawy': html(await RepairsPage()),
  '/realizacje': html(await WorksPage()),
  '/pracownia': html(createElement(StudioPage)),
  '/kontakt': html(await ContactPage({ searchParams: Promise.resolve({}) })),
  '/kontakt?temat=nowy': html(await ContactPage({ searchParams: Promise.resolve({ temat: 'nowy' }) })),
  'stopka': html(createElement(SiteFooter)),
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('produkcja: bez znaczników „do uzupełnienia”', () => {
  it.each(['SITE_ENV', 'VERCEL_ENV'])('%s=production: żadna strona nie zawiera [...]', async (name) => {
    vi.stubEnv('SITE_ENV', '')
    vi.stubEnv('VERCEL_ENV', '')
    vi.stubEnv(name, 'production')
    for (const [path, markup] of Object.entries(await pages())) {
      expect(findPlaceholders(markup), path).toEqual([])
      for (const token of ['[TERMIN', '[X', '[asortyment', '[cena', '[czas', 'data-todo']) {
        expect(markup, `${path} ${token}`).not.toContain(token)
      }
    }
  })

  it('produkcja dostaje neutralne zdania zamiast znaczników', async () => {
    vi.stubEnv('SITE_ENV', 'production')
    const p = await pages()
    expect(p['/kontakt?temat=nowy']).not.toContain('Budżet')
    expect(p['/kontakt']).toContain('Zgadzam się na kontakt w sprawie mojej wiadomości. Dane przetwarzamy tylko w tym celu.')
    expect(p['stopka']).not.toContain('Regulamin')
    expect(p['/']).toContain('Cenę i wygląd znasz, zanim zaczniemy.')
    expect(p['/']).not.toContain('mija zwykle')
    expect(p['/']).toContain('Na miejscu jest też sklep z gotową biżuterią')
    expect(p['/pierscionki/phoebe']).toContain('Wycena przed rozpoczęciem pracy')
    expect(p['/naprawy']).toContain('po wycenie')
    expect(p['/na-zamowienie']).not.toContain('Czy rozmowa o projekcie coś kosztuje?')
    // Opinii bez konfiguracji nie ma wcale, tak samo jak przedwczesnych sekcji ze zdjęciami.
    expect(p['/']).not.toContain('Opinie z Google')
    expect(p['/realizacje']).not.toContain('Opinie klientów')
    expect(p['/obraczki']).not.toContain('Obrączki z pracowni')
    expect(p['/realizacje']).not.toContain('Przed i po naprawie')
    // Zaufanie w hero: tylko to, co potwierdzone.
    expect(p['/']).toContain('Zamówienia wysyłamy do klientów')
    expect(p['/']).not.toContain('przez wideo')
  })
})

describe('podgląd i lokalnie: znaczniki widoczne', () => {
  it.each([
    ['VERCEL_ENV', 'preview'],
    ['VERCEL_ENV', ''],
  ])('%s=%j pokazuje wyróżnione znaczniki', async (name, value) => {
    vi.stubEnv('SITE_ENV', '')
    vi.stubEnv(name, value)
    const p = await pages()
    expect(p['/']).toContain('data-todo')
    expect(p['/']).toContain('[TERMIN, np. 4–6 tygodni]')
    expect(p['/']).toContain('Tu będą 3–4 opinie z Google')
    expect(p['/pierscionki/phoebe']).toContain('od [X] zł w tej wersji')
    expect(p['/obraczki']).toContain('od [X] zł za parę')
    expect(p['/naprawy']).toContain('[czas]')
    expect(p['/pierscionki/bez-kamienia']).toContain('[do uzupełnienia]')
    expect(p['/kontakt?temat=nowy']).toContain('[przedział 1]')
    expect(p['/kontakt']).toContain('Polityka prywatności [wkrótce]')
    expect(p['stopka']).toContain('Regulamin [wkrótce]')
    expect(findPlaceholders(p['/']).length).toBeGreaterThan(0)
  })
})

describe('opinie z Google', () => {
  const full: ReviewsConfig = {
    summary: { average: 4.9, count: 57, url: 'https://example.com/opinie' },
    sourceNote: 'Opinie pochodzą z wizytówki pracowni w Google.',
    reviews: [{ author: 'Anna K.', text: 'Piękny pierścionek.', rating: 5, date: 'wrzesień 2026' }],
  }

  it('z pełną konfiguracją sekcja jest na produkcji, ze średnią i liczbą opinii', () => {
    vi.stubEnv('SITE_ENV', 'production')
    const markup = html(createElement(GoogleReviews, { config: full }))
    expect(markup).toContain('4,9')
    expect(markup).toContain('57 opinii w Google')
    expect(markup).toContain('Piękny pierścionek.')
    expect(markup).toContain('Zobacz wszystkie w Google')
    expect(markup).toContain('Opinie pochodzą z wizytówki')
    expect(findPlaceholders(markup)).toEqual([])
  })

  it('cytaty bez średniej i liczby opinii nie wychodzą na produkcję', () => {
    vi.stubEnv('SITE_ENV', 'production')
    expect(html(createElement(GoogleReviews, { config: { ...full, summary: null } }))).toBe('')
  })

  it('brak zdania o źródle: znacznik tylko na podglądzie', () => {
    vi.stubEnv('SITE_ENV', 'production')
    const config = { ...full, sourceNote: null }
    expect(findPlaceholders(html(createElement(GoogleReviews, { config })))).toEqual([])
    vi.stubEnv('SITE_ENV', '')
    expect(html(createElement(GoogleReviews, { config }))).toContain('Zdanie o tym, skąd pochodzą opinie')
  })
})

describe('wybrane pierścionki na główną', () => {
  const rings = [
    product(1, 'Phoebe', { featuredOnHome: true }),
    product(2, 'Harmonia'),
    product(3, 'Athena', { featuredOnHome: true, homeOrder: 2 }),
    product(4, 'Nyx', { featuredOnHome: true, homeOrder: 1 }),
    product(5, 'Pyrrha'),
    product(6, 'Cyane'),
  ]

  it('bez zaznaczonych: lista zapasowa, bez pierścionka z hero', () => {
    const none = rings.map((r) => ({ ...r, featuredOnHome: false }))
    expect(pickHomeRings(none, none[0]).map((r) => r.name)).toEqual(['Harmonia', 'Athena', 'Nyx', 'Pyrrha'])
  })

  it('zaznaczone idą wg kolejności, hero się nie powtarza, brakujące uzupełnia lista zapasowa', () => {
    const names = pickHomeRings(rings, rings[0]).map((r) => r.name)
    expect(names).toEqual(['Nyx', 'Athena', 'Harmonia', 'Pyrrha'])
    expect(names).not.toContain('Phoebe')
  })

  it('zaznaczonych więcej niż 4: tylko cztery pierwsze wg kolejności', () => {
    const many = rings.map((r, i) => ({ ...r, featuredOnHome: true, homeOrder: 10 - i }))
    expect(pickHomeRings(many, many[0])).toHaveLength(4)
  })
})
