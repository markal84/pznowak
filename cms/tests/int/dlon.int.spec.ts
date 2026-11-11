import { describe, expect, it } from 'vitest'

import {
  checkImages,
  isHandMedia,
  loadSpecs,
  planAdd,
  planAddToVariant,
  variantsWithoutHand,
  withoutHand,
} from '../../scripts/dlon-logic'
import { MERGED_RING_VARIANTS } from '../../src/lib/legacy-redirects'

const photo = (id: number, filename: string, legacySourceUrl: string | null = null) => ({ id, filename, legacySourceUrl })

describe('zdjęcia na dłoni', () => {
  it('seed ma komplet plików webp do 300 KB i unikalne karty', () => {
    const specs = loadSpecs()
    expect(checkImages(specs)).toEqual([])
    expect(new Set(specs.map((s) => s.name)).size).toBe(specs.length)
  })

  it('rozpoznaje zdjęcie z seeda i wgrane ręcznie jako <nazwa>-dlon.jpg', () => {
    expect(isHandMedia(photo(1, 'athena-dlon.webp', 'seed://dlon/athena-dlon.webp'))).toBe(true)
    expect(isHandMedia(photo(2, 'celaeno-dlon.jpg'))).toBe(true)
    expect(isHandMedia(photo(3, 'celaeno-dlon-1.jpg'))).toBe(true)
    expect(isHandMedia(photo(4, '122167532246616875_122167529066616875.jpg'))).toBe(false)
    expect(isHandMedia(5)).toBe(false)
  })

  it('dopisuje tylko tam, gdzie zdjęcia na dłoni jeszcze nie ma', () => {
    const gallery = [1, 2, 3, 4].map((id) => ({ asset: photo(id, `${id}.jpg`) }))
    expect(planAdd({ media: gallery }).action).toBe('dodaj')
    expect(planAdd({ media: [...gallery, { asset: photo(9, 'nyx-dlon.jpg') }] }).action).toBe('juz')
    expect(planAdd(undefined).action).toBe('brak')
  })

  it('cofnięcie zdejmuje tylko zdjęcia na dłoni, kolejność reszty bez zmian', () => {
    const gallery = [
      { asset: photo(1, 'a.jpg'), isPrimary: true },
      { asset: photo(2, 'rhodope-dlon.jpg') },
      { asset: photo(3, 'b.jpg') },
      { asset: photo(4, 'x.webp', 'seed://dlon/x.webp') },
    ]
    const { kept, removed } = withoutHand(gallery)
    expect(removed).toBe(2)
    expect(kept.map((e) => (e.asset as { id: number }).id)).toEqual([1, 3])
    expect(kept[0].isPrimary).toBe(true)
  })

  it('połączone karty idą do wariantu fasonu, nie do archiwalnej karty', () => {
    const specs = loadSpecs()
    for (const old of Object.keys(MERGED_RING_VARIANTS)) {
      expect(specs.some((s) => s.name.toLowerCase() === old)).toBe(false)
    }
    const targets = Object.values(MERGED_RING_VARIANTS).map((m) => `${m.slug}:${m.kamien}`)
    for (const spec of specs.filter((s) => s.kamien)) {
      expect(targets).toContain(`${spec.name.toLowerCase()}:${spec.kamien}`)
    }
  })

  it('wariant: dopisanie raz, cofnięcie zostawia pierwszy obraz', () => {
    const card = {
      stoneVariants: [
        { stone: 'Rubin i diamenty', image: photo(1, 'r.webp'), moreImages: [] },
        { stone: 'Oliwin i diamenty', image: photo(2, 'o.webp'), moreImages: [photo(3, 'o2.webp')] },
      ],
    }
    expect(planAddToVariant(card, 'oliwin-i-diamenty').action).toBe('dodaj')
    expect(planAddToVariant(card, 'szmaragd-i-diamenty').action).toBe('brak')
    card.stoneVariants[1].moreImages.push(photo(4, 'iris-oliwin-dlon.webp', 'seed://dlon/iris-oliwin-dlon.webp'))
    expect(planAddToVariant(card, 'oliwin-i-diamenty').action).toBe('juz')
    const { kept, removed } = variantsWithoutHand(card.stoneVariants)
    expect(removed).toBe(1)
    expect(kept[1].image).toEqual(photo(2, 'o.webp'))
    expect(kept[1].moreImages.map((a) => a.id)).toEqual([3])
  })
})
