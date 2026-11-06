import { describe, expect, it } from 'vitest'

import { loadPrices, nameKey, planPrice, type PriceCard } from '../../scripts/ceny-logic'

/** Ceny z OLX na staging: dane w `seed/ceny/ceny-olx.json`, logika planu w `scripts/ceny-logic.ts`. */

const { ceny, bezKarty } = loadPrices()

describe('ceny-olx.json', () => {
  it('15 dopasowanych cen, w tym Pelagia (Marcin 06.11: cena zostaje)', () => {
    expect(ceny).toHaveLength(15)
    expect(ceny.find((c) => c.name === 'Pelagia')?.price).toBe(5499)
  })

  it('ceny zgodne z listą z OLX', () => {
    expect(Object.fromEntries(ceny.map((c) => [c.name, c.price]))).toEqual({
      Pelagia: 5499,
      Aria: 2949,
      Helios: 3999,
      Daphne: 3199,
      Urania: 3199,
      Rhea: 2399,
      Rhodope: 2200,
      Erythea: 3599,
      Dione: 2699,
      Thalia: 4199,
      Euterpe: 5550,
      Celaeno: 7199,
      Chryse: 2899,
      Chloris: 2290,
      Prometheus: 1590,
    })
  })

  it('dwie ceny bez karty czekają na Kamilę i nie trafiają do zapisu', () => {
    expect(bezKarty.map((b) => b.price)).toEqual([1899, 3299])
  })
})

describe('plan zapisu ceny', () => {
  const cards: PriceCard[] = [
    { id: 27, name: 'Aria', price: null },
    { id: 28, name: 'Helios', price: 3999 },
    { id: 29, name: 'Pelagia', price: 4000 },
    { id: 30, name: 'Thalia', price: null },
    { id: 31, name: ' thalia ', price: null },
  ]

  it('karta bez ceny dostaje cenę', () => {
    expect(planPrice(cards, { name: 'Aria', price: 2949 })).toEqual({ action: 'zmien', id: 27, price: 2949, note: 'cena 2949 zł' })
  })

  it('ta sama cena: bez zmian (drugie uruchomienie)', () => {
    expect(planPrice(cards, { name: 'Helios', price: 3999 }).action).toBe('juz')
  })

  it('inna cena wpisana wcześniej: nie nadpisuje', () => {
    const plan = planPrice(cards, { name: 'Pelagia', price: 5499 })
    expect(plan.action).toBe('pomin')
    expect(plan.note).toContain('4000')
  })

  it('brak karty albo kilka kart o tej nazwie: pomija', () => {
    expect(planPrice(cards, { name: 'Euterpe', price: 5550 }).action).toBe('pomin')
    const dup = planPrice(cards, { name: 'Thalia', price: 4199 })
    expect(dup.action).toBe('pomin')
    expect(dup.note).toContain('#30, #31')
  })

  it('nazwy porównuje bez wielkości liter i spacji', () => {
    expect(nameKey('  Pelagia ')).toBe(nameKey('pelagia'))
  })
})
