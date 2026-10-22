import { describe, expect, it } from 'vitest'
import {
  filterRings,
  formatMetal,
  formatStone,
  goldGroup,
  pickByName,
  pluralRing,
  similarTo,
  stoneGroup,
  type CatalogRing,
} from '../../src/lib/catalog'
import type { PublicProduct as Jewel } from '../../src/lib/public-products'

const jewel = (name: string, stone: string, metal = 'Żółty'): Jewel => ({
  id: name.length,
  slug: name.toLowerCase(),
  name,
  lead: '',
  description: '',
  imagePath: `/${name}.jpg`,
  images: [`/${name}.jpg`],
  video: '',
  metal,
  stone,
  carats: '',
  clarity: '',
})

describe('stoneGroup', () => {
  it.each([
    ['Szafir i Diament', 'niebieskie'],
    ['Topaz London Blue, Diament', 'niebieskie'],
    ['Tanzanit, Diament', 'niebieskie'],
    ['Topaz błękitny, Diament', 'niebieskie'],
    ['Diament niebieski, Diament', 'niebieskie'],
    ['Szmaragd, Diament', 'zielone'],
    ['Turmalin oliwkowy', 'zielone'],
    ['Rubin, Diament', 'rozowe'],
    ['Morganit, Diament', 'rozowe'],
    ['Turmalin różowy, Diament', 'rozowe'],
    ['Ametyst, Diament', 'fioletowe'],
    ['Cytryn, Diament', 'zolte'],
    ['Diament', 'bezbarwne'],
    ['Diamenty', 'bezbarwne'],
  ])('%s -> %s', (stone, group) => expect(stoneGroup(stone)).toBe(group))

  it('nie zgaduje dla pustego opisu ani nieznanego kamienia', () => {
    expect(stoneGroup('')).toBeNull()
    expect(stoneGroup('   ')).toBeNull()
    expect(stoneGroup('Jadeit')).toBeNull()
  })
})

describe('goldGroup i formatMetal', () => {
  it.each([
    ['Żółty', 'zolte', 'Żółte złoto'],
    ['Żołty', 'zolte', 'Żółte złoto'],
    ['Złoto', 'zolte', 'Złoto'],
    ['Złoty', 'zolte', 'Złoty'],
    ['Żółty i biały', 'dwa', 'Żółte i białe złoto'],
    ['Biały', 'biale', 'Białe złoto'],
  ])('%s', (metal, group, label) => {
    expect(goldGroup(metal)).toBe(group)
    expect(formatMetal(metal)).toBe(label)
  })
  it('puste metale nie trafiają do żadnej grupy', () => {
    expect(goldGroup('')).toBeNull()
    expect(formatMetal('')).toBe('')
  })
})

describe('formatStone', () => {
  it('normalizuje wielkość liter i liczbę diamentów', () => {
    expect(formatStone('Szafir i Diament')).toBe('Szafir i diamenty')
    expect(formatStone('Topaz London Blue, Diament')).toBe('Topaz London Blue, diamenty')
    expect(formatStone('  ')).toBe('')
  })
})

describe('pluralRing', () => {
  it.each([
    [0, 'pierścionków'],
    [1, 'pierścionek'],
    [2, 'pierścionki'],
    [4, 'pierścionki'],
    [5, 'pierścionków'],
    [12, 'pierścionków'],
    [22, 'pierścionki'],
    [34, 'pierścionki'],
    [35, 'pierścionków'],
  ])('%s -> %s', (n, noun) => expect(pluralRing(n)).toBe(noun))
})

describe('filtrowanie katalogu', () => {
  const rings: CatalogRing[] = [
    { id: 1, slug: 'a', name: 'A', stone: '', metal: '', stoneGroup: 'niebieskie', goldGroup: 'zolte', image: '', alt: '' },
    { id: 2, slug: 'b', name: 'B', stone: '', metal: '', stoneGroup: 'niebieskie', goldGroup: 'dwa', image: '', alt: '' },
    { id: 3, slug: 'c', name: 'C', stone: '', metal: '', stoneGroup: 'zielone', goldGroup: 'zolte', image: '', alt: '' },
    { id: 4, slug: 'd', name: 'D', stone: '', metal: '', stoneGroup: null, goldGroup: null, image: '', alt: '' },
  ]
  it('bez filtrów zwraca wszystko, także produkty bez grup', () => {
    expect(filterRings(rings, 'all', 'all')).toHaveLength(4)
  })
  it('łączy filtry kamienia i złota', () => {
    expect(filterRings(rings, 'niebieskie', 'all').map((r) => r.slug)).toEqual(['a', 'b'])
    expect(filterRings(rings, 'niebieskie', 'dwa').map((r) => r.slug)).toEqual(['b'])
    expect(filterRings(rings, 'zielone', 'dwa')).toEqual([])
  })
})

describe('wybór pierścionków do sekcji', () => {
  const products = [jewel('Phoebe', 'Tanzanit'), jewel('Nyx', 'Topaz London Blue'), jewel('Merope', ''), jewel('Pyrrha', 'Rubin')]
  it('bierze nazwy z designu i dopełnia kolejnymi', () => {
    expect(pickByName(products, ['Pyrrha', 'Phoebe', 'Nieznany'], 3).map((p) => p.name)).toEqual(['Pyrrha', 'Phoebe', 'Nyx'])
  })
  it('podobne: ten sam kolor kamienia najpierw, bez bieżącego', () => {
    const similar = similarTo(products[0], products, 3).map((p) => p.name)
    expect(similar[0]).toBe('Nyx')
    expect(similar).not.toContain('Phoebe')
    expect(similar).toHaveLength(3)
  })
})
