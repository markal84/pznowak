import { describe, expect, it } from 'vitest'

import { finenessText, stoneCutText, stoneSizeText } from '../../src/lib/ring-params'
import { loadCuts, planCut, type CutCard } from '../../scripts/szlif-logic'

/** Parametry pierścionka na karcie (21.11.2026): próba, szlif, wymiary kamienia. */

describe('teksty parametrów na karcie', () => {
  it('próba: tylko znane wartości', () => {
    expect(finenessText('585')).toBe('próba 585')
    expect(finenessText('750')).toBe('próba 750')
    expect(finenessText('')).toBe('')
    expect(finenessText(null)).toBe('')
    expect(finenessText('333')).toBe('')
  })

  it('szlif: wartość z panelu na tekst', () => {
    expect(stoneCutText('owalny')).toBe('owalny')
    expect(stoneCutText('szmaragdowy')).toBe('szmaragdowy, prostokątny')
    expect(stoneCutText(undefined)).toBe('')
    expect(stoneCutText('nieznany')).toBe('')
  })

  it('wymiary: porządkuje zapis i dopisuje mm', () => {
    expect(stoneSizeText('6x4')).toBe('6 × 4 mm')
    expect(stoneSizeText('6 X 4 mm')).toBe('6 × 4 mm')
    expect(stoneSizeText('7.5×5,5')).toBe('7,5 × 5,5 mm')
    expect(stoneSizeText('5')).toBe('5 mm')
    expect(stoneSizeText('  ')).toBe('')
    expect(stoneSizeText('ok. 6 mm średnicy')).toBe('ok. 6 mm średnicy')
  })
})

describe('szlif-ze-zdjec.json', () => {
  const cuts = loadCuts()

  it('45 kart ze szlifem, bez powtórzeń', () => {
    expect(cuts).toHaveLength(45)
    expect(new Set(cuts.map((c) => c.slug)).size).toBe(45)
  })

  it('kilka pewnych odczytów', () => {
    const bySlug = Object.fromEntries(cuts.map((c) => [c.slug, c.szlif]))
    expect(bySlug.leucothea).toBe('szmaragdowy')
    expect(bySlug.selene).toBe('kaboszon')
    expect(bySlug.maia).toBe('owalny')
    expect(bySlug.hestia).toBe('okragly')
    expect(bySlug.celaeno).toBeUndefined()
  })
})

describe('planCut', () => {
  const cards: CutCard[] = [
    { id: 1, slug: 'maia', stoneCut: null },
    { id: 2, slug: 'hestia', stoneCut: 'okragly' },
    { id: 3, slug: 'rhea', stoneCut: 'kropla' },
  ]

  it('wpisuje w puste pole', () => {
    expect(planCut(cards, { slug: 'maia', szlif: 'owalny' })).toMatchObject({ action: 'zmien', id: 1, stoneCut: 'owalny' })
  })

  it('nie rusza tego samego ani ręcznie wpisanego', () => {
    expect(planCut(cards, { slug: 'hestia', szlif: 'okragly' }).action).toBe('juz')
    expect(planCut(cards, { slug: 'rhea', szlif: 'owalny' }).action).toBe('pomin')
  })

  it('pomija brakującą kartę', () => {
    expect(planCut(cards, { slug: 'nie-ma', szlif: 'owalny' }).action).toBe('pomin')
  })
})
