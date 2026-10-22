import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'

import robots from '../../src/app/robots'
import { goldInLocative, productSeoDescription, productSeoTitle } from '../../src/lib/product-seo'
import { absoluteUrl, DEFAULT_OG_IMAGE, DEFAULT_SITE_URL, pageMetadata, siteUrl } from '../../src/lib/seo'
import { SITE } from '../../src/lib/site'
import { jewelryStoreJsonLd, openingHoursSpecification, serializeJsonLd } from '../../src/lib/structured-data'

const here = path.dirname(fileURLToPath(import.meta.url))
const catalog = JSON.parse(readFileSync(path.resolve(here, '../../../data/legacy/collection.json'), 'utf8')) as {
  products: { slug: string; name: string; stone?: string; metal?: string; lead?: string }[]
}

afterEach(() => vi.unstubAllEnvs())

describe('adres serwisu', () => {
  it('domyślnie https://pznowak.pl, SITE_URL go przesłania, błędna wartość jest pomijana', () => {
    expect(siteUrl(undefined)).toBe(DEFAULT_SITE_URL)
    expect(siteUrl('')).toBe(DEFAULT_SITE_URL)
    expect(siteUrl('https://example.test/ścieżka/')).toBe('https://example.test')
    expect(siteUrl('nie-adres')).toBe(DEFAULT_SITE_URL)
    expect(siteUrl('javascript:alert(1)')).toBe(DEFAULT_SITE_URL)
  })

  it('absoluteUrl składa adres z ścieżki i nie rusza adresów bezwzględnych', () => {
    expect(absoluteUrl('/pierscionki', 'https://pznowak.pl')).toBe('https://pznowak.pl/pierscionki')
    expect(absoluteUrl('pierscionki', 'https://pznowak.pl')).toBe('https://pznowak.pl/pierscionki')
    expect(absoluteUrl('https://cdn.test/a.jpg', 'https://pznowak.pl')).toBe('https://cdn.test/a.jpg')
  })
})

describe('metadane strony', () => {
  it('ma adres kanoniczny, Open Graph i Twitter z tytułem i opisem', () => {
    const meta = pageMetadata({ title: 'Obrączki', description: 'Opis.', path: '/obraczki' })
    expect(meta.title).toBe('Obrączki')
    expect(meta.description).toBe('Opis.')
    expect(meta.alternates?.canonical).toBe('/obraczki')
    expect(meta.openGraph).toMatchObject({
      title: 'Obrączki — Michał Nowak',
      description: 'Opis.',
      url: '/obraczki',
      locale: 'pl_PL',
    })
    expect(meta.openGraph?.images).toEqual([
      { url: DEFAULT_OG_IMAGE.url, width: 1024, height: 683, alt: DEFAULT_OG_IMAGE.alt },
    ])
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', title: 'Obrączki — Michał Nowak' })
  })

  it('zdjęcie pierścionka zastępuje domyślny obraz', () => {
    const meta = pageMetadata({
      title: 'Phoebe',
      description: 'Opis.',
      path: '/pierscionki/pierscionek-10',
      image: { url: 'https://cdn.test/phoebe.jpg', alt: 'Pierścionek Phoebe' },
    })
    expect(meta.openGraph?.images).toEqual([
      { url: 'https://cdn.test/phoebe.jpg', width: undefined, height: undefined, alt: 'Pierścionek Phoebe' },
    ])
  })

  it('domyślny obraz Open Graph istnieje w public/', () => {
    const file = path.resolve(here, '../../public', DEFAULT_OG_IMAGE.url.slice(1))
    expect(() => readFileSync(file)).not.toThrow()
  })
})

describe('tytuł i opis pierścionka (wtyczka SEO i strona)', () => {
  it('składa nazwę, kamień i złoto, pomijając brakujące części', () => {
    expect(productSeoTitle({ name: 'Phoebe', stone: 'Tanzanit, Diament', metal: 'Żółty' })).toBe(
      'Phoebe — tanzanit, diamenty w żółtym złocie',
    )
    expect(productSeoTitle({ name: 'Athena', stone: 'Szmaragd, Diament', metal: 'Żółty i biały' })).toBe(
      'Athena — szmaragd, diamenty w żółtym i białym złocie',
    )
    expect(productSeoTitle({ name: 'Egea', stone: 'Szafir', metal: 'Biały' })).toBe('Egea — szafir w białym złocie')
    expect(productSeoTitle({ name: 'Merope', stone: '', metal: 'Złoto' })).toBe('Merope — pierścionek w złocie')
    expect(productSeoTitle({ name: 'Nyx', stone: 'Topaz London Blue, Diament', metal: '' })).toBe(
      'Nyx — topaz London Blue, diamenty',
    )
    expect(productSeoTitle({ name: 'Bez danych', stone: null, metal: undefined })).toBe('Bez danych')
  })

  it('tytuł nigdy nie jest pusty ani nie zawiera „undefined”', () => {
    for (const p of catalog.products) {
      const title = productSeoTitle(p)
      expect(title.length, p.slug).toBeGreaterThan(p.name.length - 1)
      expect(title.startsWith(p.name), p.slug).toBe(true)
      expect(title, p.slug).not.toMatch(/undefined|null|\[|\]/)
    }
  })

  it('opis to krótki opis, a gdy pusty zdanie z nazwy, kamienia i złota', () => {
    expect(productSeoDescription({ name: 'Phoebe', lead: '  Wiktoriański   charakter. ' })).toBe('Wiktoriański charakter.')
    expect(productSeoDescription({ name: 'Phoebe', stone: 'Tanzanit, Diament', metal: 'Żółty', lead: '' })).toBe(
      'Pierścionek Phoebe: tanzanit, diamenty, żółte złoto. Ręcznie wykonany w pracowni Michała Nowaka w Busku-Zdroju.',
    )
    expect(productSeoDescription({ name: 'Merope' })).toBe(
      'Pierścionek Merope. Ręcznie wykonany w pracowni Michała Nowaka w Busku-Zdroju.',
    )
  })

  it('opis nigdy nie jest pusty dla żadnego z 34 pierścionków', () => {
    for (const p of catalog.products) {
      const description = productSeoDescription({ ...p, lead: '' })
      expect(description, p.slug).toContain(p.name)
      expect(description, p.slug).not.toMatch(/undefined|null|\[|\]/)
    }
  })

  it('odmiana złota', () => {
    expect(goldInLocative('Żołty')).toBe('żółtym złocie')
    expect(goldInLocative('Złoty')).toBe('złocie')
    expect(goldInLocative('Srebro')).toBe('')
    expect(goldInLocative('')).toBe('')
  })
})

describe('dane strukturalne JewelryStore', () => {
  const data = jewelryStoreJsonLd()

  it('zawiera dane pracowni z site.ts i nie ma ocen ani pól, których nie znamy', () => {
    expect(data['@type']).toBe('JewelryStore')
    expect(data.telephone).toBe(SITE.phone)
    expect(data.email).toBe(SITE.email)
    expect(data.address).toMatchObject({
      streetAddress: 'Kilińskiego 12',
      postalCode: '28-100',
      addressLocality: 'Busko-Zdrój',
      addressCountry: 'PL',
    })
    expect(data.sameAs).toEqual([SITE.facebook, SITE.instagram])
    const text = JSON.stringify(data)
    expect(text).not.toMatch(/aggregateRating|geo|priceRange|offers/)
    expect(text).not.toMatch(/\[[^\]"]*\]|TODO|do uzupełnienia/i)
  })

  it('godziny otwarcia zgadzają się z SITE.hours', () => {
    expect(openingHoursSpecification()).toEqual(data.openingHoursSpecification)
    expect(data.openingHoursSpecification).toHaveLength(SITE.hours.length)
    expect(data.openingHoursSpecification[0]).toMatchObject({ opens: '08:00', closes: '16:00' })
    expect(data.openingHoursSpecification[1]).toMatchObject({ dayOfWeek: ['Saturday'], opens: '10:00', closes: '16:00' })
  })

  it('zapis do <script> zamienia znak < i jest poprawnym JSON-em', () => {
    const text = serializeJsonLd({ name: '</script><b>' })
    expect(text).not.toContain('<')
    expect(JSON.parse(text)).toEqual({ name: '</script><b>' })
  })
})

describe('robots.txt', () => {
  it('na produkcji zezwala i wskazuje mapę strony, poza produkcją blokuje wszystko', () => {
    vi.stubEnv('SITE_ENV', 'production')
    expect(robots()).toEqual({
      rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
      sitemap: `${siteUrl()}/sitemap.xml`,
    })
    vi.stubEnv('SITE_ENV', 'preview')
    vi.stubEnv('VERCEL_ENV', 'production')
    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } })
    vi.stubEnv('SITE_ENV', '')
    vi.stubEnv('VERCEL_ENV', '')
    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } })
  })
})
