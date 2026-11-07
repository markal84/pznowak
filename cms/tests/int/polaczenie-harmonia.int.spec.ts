import { describe, expect, it } from 'vitest'

import { MERGED_RING_VARIANTS } from '@/lib/legacy-redirects'
import { stoneSlug } from '@/lib/stone-variants'
import { HERO_VITRINE, HOME_RINGS_FALLBACK } from '@/lib/home'
import { planArchive, planVariant } from '../../scripts/polaczenie-ab-logic'
import { knownTexts, lintAc, loadAcSpecs, planAc } from '../../scripts/opisy-ac-logic'
import { ARCHIVE_ONLY, HARMONIA_BEFORE_MERGE, SOURCES, TARGET, VARIANT_MERGES, variantQuery } from '../../scripts/polaczenie-harmonia-logic'

/** Połączenie Leto + Harmonia + Eirene w jeden fason – dane i logika skryptu `staging:harmonia`. */

const harmonia = loadAcSpecs().find((spec) => spec.name === TARGET.name)!

describe('połączenie Harmonia + Eirene + Leto: dane', () => {
  it('przekierowania zgadzają się z kartami źródłowymi i wariantami', () => {
    for (const merge of VARIANT_MERGES) {
      expect(MERGED_RING_VARIANTS[merge.slug], merge.slug).toEqual({ slug: TARGET.slug, kamien: variantQuery(merge) })
      expect(stoneSlug(merge.stone)).toBe(variantQuery(merge))
    }
    for (const { slug } of ARCHIVE_ONLY) expect(MERGED_RING_VARIANTS[slug], slug).toEqual({ slug: TARGET.slug })
    expect(SOURCES.map((s) => s.slug)).toEqual(['eirene', 'leto'])
    expect(variantQuery(VARIANT_MERGES[0])).toBe('turmalin-malinowy-i-diamenty')
  })

  it('opis fasonu w opisy-ac.json spełnia standard i nie wspomina o zarchiwizowanych kartach', () => {
    expect(lintAc(harmonia)).toEqual([])
    const text = `${harmonia.lead} ${harmonia.description}`.toLowerCase()
    for (const { name } of SOURCES) expect(text).not.toContain(name.toLowerCase())
    expect(text).toContain('turmalin')
    const names = loadAcSpecs().map((spec) => spec.name)
    expect(names).not.toContain('Leto')
    expect(names).not.toContain('Eirene')
  })

  it('strona główna nie wskazuje zarchiwizowanych kart', () => {
    const archived = SOURCES.map((s) => s.name)
    expect(HERO_VITRINE.map((v) => v.name).filter((name) => archived.includes(name))).toEqual([])
    expect(HOME_RINGS_FALLBACK.filter((name) => archived.includes(name))).toEqual([])
    expect(HERO_VITRINE.find((v) => v.name === TARGET.name)?.stone).toBe(VARIANT_MERGES[0].stone)
  })
})

describe('połączenie: opis i warianty', () => {
  it('opis Harmonii: nadpisuje tekst sprzed połączenia i ze zlecenia U, nie ręczną poprawkę', () => {
    const known = knownTexts(harmonia.id, harmonia.name)
    expect(planAc({ id: harmonia.id, name: 'Harmonia', ...HARMONIA_BEFORE_MERGE }, harmonia, known).action).toBe('zmien')
    expect(planAc({ id: harmonia.id, name: 'Harmonia', lead: harmonia.lead, description: harmonia.description }, harmonia, known).action).toBe('juz')
    expect(planAc({ id: harmonia.id, name: 'Harmonia', lead: 'x', description: 'Poprawione przez Michała.' }, harmonia, known).action).toBe('pomin')
  })

  it('wariant turmalinu: dopisuje, nie dubluje, dopisuje film, zastępuje wizualizację', () => {
    const [turmalin] = VARIANT_MERGES
    expect(planVariant([], turmalin, [1, 2], 9).action).toBe('dodaj')
    expect(planVariant([{ stone: turmalin.stone, isVisualization: false }], turmalin, [1, 2], 9).action).toBe('film')
    expect(planVariant([{ stone: turmalin.stone, isVisualization: false, video: 9 }], turmalin, [1, 2], 9).action).toBe('juz')
    expect(planVariant([{ stone: turmalin.stone, isVisualization: true }], turmalin, [1], null).action).toBe('podmien')
    expect(planVariant([], turmalin, []).action).toBe('pomin')
  })

  it('archiwizuje tylko karty o oczekiwanej nazwie, raz', () => {
    for (const source of SOURCES) {
      const spec = { ...source, stone: source.stone ?? '', swatch: 'bialy' as const, alt: '' }
      expect(planArchive({ name: source.name, archived: false }, spec).action).toBe('archiwizuj')
      expect(planArchive({ name: source.name, archived: true }, spec).action).toBe('juz')
      expect(planArchive({ name: 'Inna' }, spec).action).toBe('pomin')
    }
  })
})
