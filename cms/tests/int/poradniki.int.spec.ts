import { describe, expect, it } from 'vitest'

import { mainStoneOf, priceExamples, ringsWithMainStone } from '../../src/lib/catalog'
import { mainStoneGuideAnchor } from '../../src/lib/guide-links'
import { GUIDE_SEED } from '../../src/content/guides-seed'
import { guideDateLabel, guidePath } from '../../src/lib/guides'
import { productStonePhrase } from '../../src/lib/product-seo'
import { formatNumberPl, ringSize, ringSizeTable } from '../../src/lib/ring-size'
import { articleJsonLd, faqJsonLd, itemListJsonLd, productJsonLd, websiteJsonLd } from '../../src/lib/structured-data'

describe('rozmiary pierścionków', () => {
  it('rozmiar polski to obwód wewnętrzny minus 40', () => {
    expect(ringSize('obwod', 52)).toMatchObject({ pl: 12, eu: 52, between: null })
    expect(ringSize('pl', 14)?.circumferenceMm).toBe(54)
  })

  it('średnica 16,5 mm daje rozmiar 12 i amerykański 6', () => {
    const size = ringSize('srednica', 16.5)
    expect(size).toMatchObject({ pl: 12, eu: 52, us: 6 })
    expect(formatNumberPl(size!.circumferenceMm)).toBe('51,8')
  })

  it('rozmiar amerykański przelicza się w obie strony', () => {
    expect(ringSize('us', 7)).toMatchObject({ pl: 14, us: 7 })
  })

  it('wynik w połowie między rozmiarami podaje oba', () => {
    expect(ringSize('obwod', 52.5)?.between).toEqual([12, 13])
    expect(ringSize('obwod', 52.1)?.between).toBeNull()
  })

  it('wartości poza tabelą i błędne dają null', () => {
    expect(ringSize('obwod', 20)).toBeNull()
    expect(ringSize('srednica', 165)).toBeNull()
    expect(ringSize('obwod', Number.NaN)).toBeNull()
    expect(ringSize('obwod', -5)).toBeNull()
  })

  it('tabela ma kolejne rozmiary z obwodem i średnicą', () => {
    const rows = ringSizeTable(10, 12)
    expect(rows).toEqual([
      { pl: 10, circumferenceMm: 50, diameterMm: 15.9, us: 5.25 },
      { pl: 11, circumferenceMm: 51, diameterMm: 16.2, us: 5.75 },
      { pl: 12, circumferenceMm: 52, diameterMm: 16.6, us: 6 },
    ])
  })

  it('liczby po polsku: przecinek, bez zbędnych zer', () => {
    expect(formatNumberPl(16)).toBe('16')
    expect(formatNumberPl(50, 0)).toBe('50')
    expect(formatNumberPl(6.25, 2)).toBe('6,25')
    expect(formatNumberPl(6.5, 2)).toBe('6,5')
  })
})

describe('treść startowa poradników', () => {
  it('ma unikalne adresy, opisy mieszczące się w wyniku wyszukiwania i poprawne daty', () => {
    expect(new Set(GUIDE_SEED.map((g) => g.slug)).size).toBe(GUIDE_SEED.length)
    for (const guide of GUIDE_SEED) {
      expect(guide.slug).toMatch(/^[a-z0-9-]+$/)
      expect(guide.description.length).toBeLessThanOrEqual(160)
      expect(guide.published).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(guide.updated >= guide.published).toBe(true)
    }
    expect(guidePath('jak-sprawdzic-rozmiar-pierscionka')).toBe('/poradniki/jak-sprawdzic-rozmiar-pierscionka')
    expect(guideDateLabel('2026-11-05')).toBe('5 listopada 2026')
  })
})

describe('kamień główny i linki do poradnika', () => {
  it('bierze pierwszy kamień z zapisu karty', () => {
    expect(mainStoneOf('Szafir i Diament')).toBe('szafir')
    expect(mainStoneOf('Topaz London Blue, Diament')).toBe('topaz london blue')
    expect(mainStoneOf('')).toBe('')
  })

  it('wybiera pierścionki po kamieniu głównym, a nie bocznym', () => {
    const products = [{ stone: 'Szafir i Diament' }, { stone: 'Diament' }, { stone: 'Rubin, Diament' }]
    expect(ringsWithMainStone(products, /^diament/, 3)).toEqual([{ stone: 'Diament' }])
    expect(ringsWithMainStone(products, /^szafir/, 3)).toHaveLength(1)
  })

  it('kotwica sekcji poradnika dla kamienia z karty', () => {
    expect(mainStoneGuideAnchor('Ametyst, Diament')).toBe('ametyst-cytryn')
    expect(mainStoneGuideAnchor('Szmaragd i szafiry kolorowe')).toBe('szmaragd')
    expect(mainStoneGuideAnchor('Oliwin, Diament')).toBe('oliwin')
    expect(mainStoneGuideAnchor('Mystic topaz')).toBeNull()
    expect(mainStoneGuideAnchor(null)).toBeNull()
  })

  it('nadtytuł karty: kamień w narzędniku z przyimkiem', () => {
    expect(productStonePhrase('Ametyst, Diament')).toBe('z ametystem')
    expect(productStonePhrase('Szmaragd')).toBe('ze szmaragdem')
    expect(productStonePhrase('')).toBe('')
  })

  it('przykłady cen: najtańszy, najdroższy i środek, bez kart bez ceny', () => {
    const rings = [5, null, 1, 9, 3, 7, null, 2].map((price, id) => ({ id, price }))
    expect(priceExamples(rings).map((r) => r.price)).toEqual([1, 3, 5, 9])
    expect(priceExamples([{ price: null }])).toEqual([])
    expect(priceExamples([{ price: 4 }, { price: 2 }]).map((r) => r.price)).toEqual([2, 4])
  })
})

describe('dane strukturalne poradników i kart', () => {
  it('pierścionek z ceną ma ofertę w PLN, bez ceny (null, 0, brak) nie dostaje znacznika Product', () => {
    const base = { name: 'Aria', path: '/pierscionki/aria', description: 'Opis  z\nłamaniem', images: ['/a.jpg'], stone: 'Ametyst, diamenty', metal: 'Żółte złoto' }
    const priced = productJsonLd({ ...base, price: 2949 })
    expect(priced).toMatchObject({
      '@type': 'Product',
      name: 'Pierścionek Aria',
      url: 'https://pznowak.pl/pierscionki/aria',
      description: 'Opis z łamaniem',
      image: ['https://pznowak.pl/a.jpg'],
      material: 'Żółte złoto',
      offers: { '@type': 'Offer', price: 2949, priceCurrency: 'PLN', url: 'https://pznowak.pl/pierscionki/aria' },
    })
    expect(productJsonLd({ ...base, price: null })).toBeNull()
    expect(productJsonLd({ ...base, price: 0 })).toBeNull()
    expect(productJsonLd({ ...base, price: 0.4 })).toBeNull() // zaokrągla się do 0: na karcie „Na zapytanie”
    expect(productJsonLd({ ...base, price: Number.NaN })).toBeNull()
    expect(productJsonLd({ ...base, price: 2949.4 })).toMatchObject({ offers: { price: 2949 } })
    expect(productJsonLd({ ...base })).toBeNull()
    expect(productJsonLd({ ...base, price: 2949, images: [], stone: '', metal: '' })).not.toHaveProperty('image')
  })

  it('pytania bez tekstu są pomijane, pusta lista daje null', () => {
    expect(faqJsonLd([{ q: 'A?', text: ' tak  jest ' }, { q: 'B?' }])).toMatchObject({
      '@type': 'FAQPage',
      mainEntity: [{ name: 'A?', acceptedAnswer: { text: 'tak jest' } }],
    })
    expect(faqJsonLd([{ q: 'B?' }])).toBeNull()
  })

  it('poradnik, lista i serwis mają adresy bezwzględne', () => {
    const article = articleJsonLd({ title: 'T', description: 'D', path: '/poradniki/x', published: '2026-11-15', updated: '2026-11-16' })
    expect(article).toMatchObject({ '@type': 'Article', mainEntityOfPage: 'https://pznowak.pl/poradniki/x', dateModified: '2026-11-16' })
    expect(itemListJsonLd([{ name: 'A', path: '/a' }]).itemListElement[0]).toMatchObject({ position: 1, url: 'https://pznowak.pl/a' })
    expect(websiteJsonLd()).toMatchObject({ '@type': 'WebSite', url: 'https://pznowak.pl/' })
  })
})
