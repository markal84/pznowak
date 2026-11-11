import { describe, expect, it } from 'vitest'
import {
  GOLD_COLORS,
  GOLD_FILTERS,
  CATALOG_PAGE_SIZE,
  catalogHref,
  filterRings,
  paginate,
  parseCatalogParams,
  formatMetal,
  formatStone,
  goldColorLabel,
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
    ['Kamień bezbarwny', 'bezbarwne'],
    ['Kamień różowy', 'rozowe'],
    ['Kamień fioletowy', 'fioletowe'],
    ['Oliwin i diamenty', 'zielone'],
    ['Granat i diamenty', 'rozowe'],
    ['Turmalin różowy i diamenty', 'rozowe'],
    ['Szmaragd i szafiry kolorowe', 'zielone'],
    ['Diamenty i czarne diamenty', 'bezbarwne'],
    ['Mystic topaz i diamenty', null],
  ])('%s -> %s', (stone, group) => expect(stoneGroup(stone)).toBe(group))

  it('nie zgaduje dla pustego opisu ani nieznanego kamienia', () => {
    expect(stoneGroup('')).toBeNull()
    expect(stoneGroup('   ')).toBeNull()
    expect(stoneGroup('Jadeit')).toBeNull()
  })
})

describe('goldGroup, goldColorLabel i formatMetal', () => {
  it.each([
    ['Żółty', 'zolte', 'Żółte', 'Żółte złoto'],
    ['Żołty', 'zolte', 'Żółte', 'Żółte złoto'],
    ['Żółty i biały', 'zolte-biale', 'Żółte z białym', 'Żółte i białe złoto'],
    ['Biały', 'biale', 'Białe', 'Białe złoto'],
    // wartości z listy (po migracji pola na select) działają tak samo jak starsze zapisy tekstowe
    ['zolte', 'zolte', 'Żółte', 'Żółte złoto'],
    ['zolte-biale', 'zolte-biale', 'Żółte z białym', 'Żółte i białe złoto'],
    ['biale', 'biale', 'Białe', 'Białe złoto'],
  ])('%s', (metal, group, color, sentence) => {
    expect(goldGroup(metal)).toBe(group)
    expect(goldColorLabel(metal)).toBe(color)
    expect(formatMetal(metal)).toBe(sentence)
  })
  it('samo „Złoto” albo „Złoty” bez koloru nie jest zgadywane: brak grupy i nazwy koloru', () => {
    for (const metal of ['Złoto', 'Złoty']) {
      expect(goldGroup(metal)).toBeNull()
      expect(goldColorLabel(metal)).toBe('')
    }
    expect(formatMetal('Złoto')).toBe('Złoto')
  })
  it('puste metale nie trafiają do żadnej grupy', () => {
    expect(goldGroup('')).toBeNull()
    expect(formatMetal('')).toBe('')
    expect(goldColorLabel('  ')).toBe('')
  })
  it('filtr i lista kolorów mają te same nazwy', () => {
    expect(GOLD_FILTERS.slice(1).map((f) => f.label)).toEqual(GOLD_COLORS.map((c) => c.label))
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
    { id: 1, slug: 'a', name: 'A', stone: '', metal: '', goldLabel: '', stoneGroup: 'niebieskie', goldGroup: 'zolte', image: '', alt: '', price: null },
    { id: 2, slug: 'b', name: 'B', stone: '', metal: '', goldLabel: '', stoneGroup: 'niebieskie', goldGroup: 'zolte-biale', image: '', alt: '', price: null },
    { id: 3, slug: 'c', name: 'C', stone: '', metal: '', goldLabel: '', stoneGroup: 'zielone', goldGroup: 'zolte', image: '', alt: '', price: null },
    { id: 4, slug: 'd', name: 'D', stone: '', metal: '', goldLabel: '', stoneGroup: null, goldGroup: null, image: '', alt: '', price: null },
  ]
  it('bez filtrów zwraca wszystko, także produkty bez grup', () => {
    expect(filterRings(rings, 'all', 'all')).toHaveLength(4)
  })
  it('łączy filtry kamienia i złota', () => {
    expect(filterRings(rings, 'niebieskie', 'all').map((r) => r.slug)).toEqual(['a', 'b'])
    expect(filterRings(rings, 'niebieskie', 'zolte-biale').map((r) => r.slug)).toEqual(['b'])
    expect(filterRings(rings, 'zielone', 'zolte-biale')).toEqual([])
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

describe('paginacja katalogu', () => {
  const list = Array.from({ length: 95 }, (_, i) => i + 1)
  it('dzieli na strony po 40', () => {
    expect(CATALOG_PAGE_SIZE).toBe(40)
    expect(paginate(list, 1)).toMatchObject({ page: 1, pages: 3 })
    expect(paginate(list, 1).items).toHaveLength(40)
    expect(paginate(list, 3).items).toEqual(list.slice(80))
  })
  it('przycina numer strony do zakresu i znosi pustą listę', () => {
    expect(paginate(list, 99).page).toBe(3)
    expect(paginate(list, 0).page).toBe(1)
    expect(paginate([], 5)).toEqual({ items: [], page: 1, pages: 1 })
  })
  it('czyta i buduje adres bez wartości domyślnych', () => {
    const params = new URLSearchParams('kamien=zielone&zloto=biale&strona=2')
    expect(parseCatalogParams((k) => params.get(k))).toEqual({ stone: 'zielone', gold: 'biale', page: 2 })
    expect(parseCatalogParams(() => 'bzdura')).toEqual({ stone: 'all', gold: 'all', page: 1 })
    expect(catalogHref({ stone: 'zielone', gold: 'biale', page: 2 })).toBe('/pierscionki?kamien=zielone&zloto=biale&strona=2')
    expect(catalogHref({ stone: 'all', gold: 'all', page: 1 })).toBe('/pierscionki')
  })
})
