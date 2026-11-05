import { describe, expect, it } from 'vitest'

import { stoneSlug } from '@/lib/stone-variants'
import { MERGED_RING_VARIANTS } from '@/lib/legacy-redirects'
import { lintSpec, loadSpecs } from '../../scripts/opisy-u-logic'
import {
  CARD_TEXT,
  featuredTransfer,
  imageIds,
  MERGES,
  planArchive,
  planText,
  planVariant,
  TARGET,
  variantQuery,
} from '../../scripts/polaczenie-ab-logic'

/** Zlecenie AB: Urania + Pyrrha + Nyx jako jeden fason – dane i logika skryptu `staging:polaczenie`. */

const known = (() => {
  const spec = loadSpecs().find((s) => s.name === TARGET.name)
  return { lead: spec!.lead!, description: spec!.description! }
})()

describe('połączenie Urania + Pyrrha + Nyx: dane', () => {
  it('adresy ?kamien= z przekierowań zgadzają się z nazwami wariantów', () => {
    for (const merge of MERGES) {
      expect(MERGED_RING_VARIANTS[merge.slug], merge.slug).toEqual({ slug: TARGET.slug, kamien: variantQuery(merge) })
    }
    expect(variantQuery(MERGES[0])).toBe('rubin-i-diamenty')
    expect(variantQuery(MERGES[1])).toBe('topaz-london-blue-i-diamenty')
    expect(new Set(MERGES.map(variantQuery)).size).toBe(MERGES.length)
  })

  it('opis fasonu spełnia standard zlecenia U i nie wspomina o zarchiwizowanych kartach', () => {
    const issues = lintSpec({ id: 17, name: TARGET.name, lead: CARD_TEXT.lead, description: CARD_TEXT.description })
    expect(issues).toEqual([])
    const text = `${CARD_TEXT.lead} ${CARD_TEXT.description}`.toLowerCase()
    for (const merge of MERGES) expect(text).not.toContain(merge.name.toLowerCase())
  })
})

describe('połączenie: opis fasonu', () => {
  it('zmienia tekst ze zlecenia U, jest idempotentny, nie nadpisuje ręcznej poprawki', () => {
    const plan = planText({ name: 'Urania', ...known }, known)
    expect(plan).toMatchObject({ action: 'zmien', data: { lead: CARD_TEXT.lead, description: CARD_TEXT.description } })
    expect(planText({ name: 'Urania', lead: CARD_TEXT.lead, description: CARD_TEXT.description }, known).action).toBe('juz')
    expect(planText({ name: 'Urania', lead: known.lead, description: 'Poprawione przez Michała.' }, known).action).toBe('pomin')
    expect(planText({ name: 'Inna', ...known }, known).action).toBe('pomin')
  })
})

describe('połączenie: warianty z prawdziwych zdjęć', () => {
  it('bierze tylko obrazy z galerii karty, w jej kolejności, bez filmu i powtórzeń', () => {
    const media = [
      { asset: { id: 5, mimeType: 'image/webp' } },
      { asset: { id: 9, mimeType: 'video/mp4' } },
      { asset: { id: 7, mimeType: 'image/jpeg' } },
      { asset: { id: 5, mimeType: 'image/webp' } },
      { asset: 11 }, // niepopulowane id: nie wiadomo, czy to obraz
    ]
    expect(imageIds(media)).toEqual([5, 7])
    expect(imageIds(undefined)).toEqual([])
  })

  it('dopisuje brakujący wariant, nie dubluje prawdziwego, zastępuje wizualizację, pomija kartę bez zdjęć', () => {
    const [rubin] = MERGES
    expect(planVariant([], rubin, [1, 2]).action).toBe('dodaj')
    expect(planVariant([{ stone: 'Rubin i diamenty', isVisualization: false }], rubin, [1, 2]).action).toBe('juz')
    expect(planVariant([{ stone: 'rubin i  diamenty', isVisualization: true }], rubin, [1, 2]).action).toBe('podmien')
    expect(planVariant([{ stone: 'Szafir', isVisualization: true }], rubin, [1]).action).toBe('dodaj')
    expect(planVariant([], rubin, []).action).toBe('pomin')
    // Prawdziwy wariant zostaje, nawet gdy karta źródłowa straciła zdjęcia (np. po archiwizacji).
    expect(planVariant([{ stone: 'Rubin i diamenty', isVisualization: false }], rubin, []).action).toBe('juz')
  })

  it('warianty to prawdziwe zdjęcia (bez plakietki), z kółkami innymi niż oryginał', () => {
    expect(MERGES.map((m) => m.swatch)).toEqual(['czerwony', 'londonblue'])
    for (const merge of MERGES) expect(stoneSlug(merge.stone)).toBe(variantQuery(merge))
  })
})

describe('połączenie: archiwizacja i strona główna', () => {
  it('archiwizuje tylko kartę o oczekiwanej nazwie, raz', () => {
    const [rubin] = MERGES
    expect(planArchive({ name: 'Pyrrha', archived: false }, rubin).action).toBe('archiwizuj')
    expect(planArchive({ name: 'Pyrrha', archived: true }, rubin).action).toBe('juz')
    expect(planArchive({ name: 'Rubinowa' }, rubin).action).toBe('pomin')
    expect(planArchive(undefined, rubin).action).toBe('pomin')
  })

  it('Urania przejmuje miejsce na stronie głównej z najwcześniejszą kolejnością', () => {
    const urania = { name: 'Urania', featuredOnHome: false }
    expect(featuredTransfer(urania, [{ name: 'Pyrrha' }, { name: 'Nyx' }])).toBeNull()
    expect(featuredTransfer(urania, [{ name: 'Pyrrha', featuredOnHome: true, homeOrder: 3 }, { name: 'Nyx', featuredOnHome: true, homeOrder: 1 }])).toEqual({
      featuredOnHome: true,
      homeOrder: 1,
    })
    expect(featuredTransfer({ name: 'Urania', featuredOnHome: true }, [{ name: 'Nyx', featuredOnHome: true, homeOrder: 1 }])).toBeNull()
  })
})
