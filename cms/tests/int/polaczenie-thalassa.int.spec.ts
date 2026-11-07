import { describe, expect, it } from 'vitest'

import { MERGED_RING_VARIANTS } from '@/lib/legacy-redirects'
import { stoneSlug } from '@/lib/stone-variants'
import { lintAc, loadAcSpecs, planAc, knownTexts } from '../../scripts/opisy-ac-logic'
import { CARD_TEXT, MERGE, PREVIOUS_TEXT, planArchive, planGreen, planText, REPLACED_STONE, TARGET } from '../../scripts/polaczenie-thalassa-logic'

/** Thalassa → Aion: prawdziwe zdjęcia jako zielony wariant (Marcin 07.11). */

describe('Thalassa → Aion: dane', () => {
  it('przekierowanie 308 idzie na adres wariantu', () => {
    expect(MERGED_RING_VARIANTS[MERGE.slug]).toEqual({ slug: TARGET.slug, kamien: stoneSlug(MERGE.stone) })
    expect(stoneSlug(MERGE.stone)).toBe('zielone-i-biale-diamenty')
    expect(MERGE.swatch).toBe('zielony')
  })

  it('opis fasonu spełnia standard AC i jest tym samym tekstem co w opisy-ac.json', () => {
    const spec = loadAcSpecs().find((s) => s.id === 46)!
    expect(spec.lead).toBe(CARD_TEXT.lead)
    expect(spec.description).toBe(CARD_TEXT.description)
    expect(lintAc(spec)).toEqual([])
    expect(`${CARD_TEXT.lead} ${CARD_TEXT.description}`.toLowerCase()).not.toContain('thalass')
  })

  it('skrypt opisów AC nie uzna dawnego ani nowego tekstu Aiona za ręczną poprawkę', () => {
    const spec = loadAcSpecs().find((s) => s.id === 46)!
    expect(planAc({ id: 46, name: 'Aion', ...PREVIOUS_TEXT }, spec, knownTexts(46, 'Aion')).action).toBe('zmien')
    expect(planAc({ id: 46, name: 'Aion', ...CARD_TEXT }, spec, knownTexts(46, 'Aion')).action).toBe('juz')
  })
})

describe('Thalassa → Aion: opis', () => {
  it('zmienia dawny tekst, jest idempotentny, nie nadpisuje ręcznej poprawki', () => {
    expect(planText({ name: 'Aion', ...PREVIOUS_TEXT }).action).toBe('zmien')
    expect(planText({ name: 'Aion', ...CARD_TEXT }).action).toBe('juz')
    expect(planText({ name: 'Aion', lead: PREVIOUS_TEXT.lead, description: 'Poprawione przez Michała.' }).action).toBe('pomin')
    expect(planText({ name: 'Inna', ...PREVIOUS_TEXT }).action).toBe('pomin')
  })
})

describe('Thalassa → Aion: wariant', () => {
  const viz = { stone: REPLACED_STONE, isVisualization: true }
  const white = { stone: 'Białe diamenty', isVisualization: true }

  it('prawdziwe zdjęcia zastępują zieloną wizualizację na jej miejscu', () => {
    const { plan, removeAt } = planGreen([viz, white], [1, 2, 3], 9)
    expect(removeAt).toBe(0)
    expect(plan.action).toBe('dodaj')
    expect(plan.note).toContain('film')
  })

  it('bez zielonej wizualizacji dopisuje na końcu, drugi raz nic nie zmienia', () => {
    expect(planGreen([white], [1, 2], null)).toMatchObject({ removeAt: -1, plan: { action: 'dodaj' } })
    const real = { stone: MERGE.stone, isVisualization: false, video: 9 }
    expect(planGreen([white, real], [1, 2], 9)).toMatchObject({ removeAt: -1, plan: { action: 'juz' } })
  })

  it('prawdziwe zdjęcia o nazwie „Szmaragd i diamenty” (dodane ręcznie) zostają', () => {
    expect(planGreen([{ stone: REPLACED_STONE, isVisualization: false }, white], [1], null).removeAt).toBe(-1)
  })

  it('karta bez zdjęć w galerii: nie dodaje wariantu', () => {
    expect(planGreen([viz], [], null).plan.action).toBe('pomin')
  })
})

describe('Thalassa → Aion: archiwizacja', () => {
  it('archiwizuje tylko kartę o oczekiwanej nazwie, raz', () => {
    expect(planArchive({ name: 'Thalassa', archived: false }, MERGE).action).toBe('archiwizuj')
    expect(planArchive({ name: 'Thalassa', archived: true }, MERGE).action).toBe('juz')
    expect(planArchive({ name: 'Inna' }, MERGE).action).toBe('pomin')
    expect(planArchive(undefined, MERGE).action).toBe('pomin')
  })
})
