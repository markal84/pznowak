import { describe, expect, it } from 'vitest'

import { formatPrice, lowestPrice, normalizePrice, PRICE_PREFIX } from '@/lib/price'
import { toCatalogRing } from '@/lib/catalog'
import type { Product } from '@/payload-types'
import { serializePublicProduct, serializeSiteProduct } from '@/lib/public-products'

const nb = '\u00a0'

describe('ceny pierścionków', () => {
  it('„od” zostaje na razie przed kwotą (decyzja Marcina, zmiana w jednej stałej)', () => {
    expect(PRICE_PREFIX).toBe('od')
  })

  it.each([
    [2949, `od${nb}2949${nb}zł`],
    [1590, `od${nb}1590${nb}zł`],
    [12500, `od${nb}12${nb}500${nb}zł`],
    [2949.4, `od${nb}2949${nb}zł`],
  ])('%s → %j', (price, text) => expect(formatPrice(price)).toBe(text))

  it('bez przedrostka: sama kwota', () => {
    expect(formatPrice(3199, '')).toBe(`3199${nb}zł`)
  })

  it.each([null, undefined, 0, -10, Number.NaN])('brak ceny (%s) → pusty tekst', (price) => {
    expect(formatPrice(price)).toBe('')
    expect(normalizePrice(price)).toBeNull()
  })

  it('najniższa cena pomija karty bez ceny', () => {
    expect(lowestPrice([{ price: null }, { price: 3199 }, { price: 1590 }])).toBe(1590)
    expect(lowestPrice([{ price: null }])).toBeNull()
    expect(lowestPrice([])).toBeNull()
  })

  it('cena z panelu trafia do strony i karty katalogu, ale nie do publicznego API', () => {
    const doc = {
      id: 7,
      name: 'Aria',
      slug: 'aria',
      price: 2949,
      media: [],
      updatedAt: '2026-11-06T00:00:00.000Z',
      createdAt: '2026-11-06T00:00:00.000Z',
    } as unknown as Product
    const site = serializeSiteProduct(doc)
    expect(site.price).toBe(2949)
    expect(toCatalogRing(site).price).toBe(2949)
    expect(serializeSiteProduct({ ...doc, price: null }).price).toBeNull()
    expect(serializePublicProduct(doc)).not.toHaveProperty('price')
  })
})
