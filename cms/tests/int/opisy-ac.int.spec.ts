import { describe, expect, it } from 'vitest'

import { CARD_TEXT as URANIA_AB_TEXT } from '../../scripts/polaczenie-ab-logic'
import { countWords } from '../../scripts/opisy-u-logic'
import { knownTexts, lintAc, loadAcSpecs, planAc, STONE_OPENING } from '../../scripts/opisy-ac-logic'

/** Zlecenie AC: opisy kart z wariantami zaczynają się od fasonu, nie od kamienia. */
const specs = loadAcSpecs()

describe('AC: treść opisy-ac.json', () => {
  it('karty z wariantami (partia 1) i reszta opublikowanych bez Pyrrhy i Nyx (połączone z Uranią), z Thalią i Euterpe', () => {
    const names = specs.map((s) => s.name)
    expect(names.slice(0, 4)).toEqual(['Cyane', 'Daphne', 'Aion', 'Urania'])
    expect(names).toContain('Thalia')
    expect(names).toContain('Euterpe')
    expect(names).not.toContain('Pyrrha')
    expect(names).not.toContain('Nyx')
    expect(names).not.toContain('Eirene')
    expect(names).not.toContain('Leto')
    expect(names).toContain('Harmonia')
    expect(new Set(names).size).toBe(names.length)
  })

  it('karty bez id mają slug', () => {
    for (const spec of specs.filter((s) => s.id === 0)) expect(spec.slug).toMatch(/^[a-z-]+$/)
  })

  it('Thalia: tekst z WordPressa liczy się jako znany (nadpisujemy bez --nadpisz)', () => {
    const thalia = specs.find((s) => s.name === 'Thalia')!
    const legacy = knownTexts(0, 'Thalia')
    expect(legacy.length).toBeGreaterThan(0)
    expect(planAc({ id: 99, name: 'Thalia', ...legacy[0] }, thalia).action).toBe('zmien')
  })

  it.each(specs.map((s) => [s.name, s] as const))('%s: standard U + początek od fasonu', (_name, spec) => {
    expect(lintAc(spec)).toEqual([])
  })

  it('linter łapie stary początek od kamienia', () => {
    const cyaneU = knownTexts(21)[0]
    const issues = lintAc({ id: 21, name: 'Cyane', ...cyaneU })
    expect(issues.map((i) => i.problem)).toContain('opis zaczyna się od kamienia („Niebieski”)')
    expect(STONE_OPENING.test('Pierścionek')).toBe(false)
  })

  it('opis zostawia informację o innym kamieniu i kamień ze zdjęć dopiero w drugim akapicie', () => {
    for (const spec of specs) {
      const [first, second, third] = spec.description.split(/\n\s*\n/u)
      expect(first).not.toMatch(/Na zdjęciach/)
      expect(second).toMatch(/Na zdjęciach/)
      expect(third).toMatch(/wybranym rozmiarze/)
      expect(countWords(spec.description)).toBeLessThanOrEqual(90)
    }
  })
})

describe('AC: plan zapisu', () => {
  const cyane = specs.find((s) => s.id === 21)!
  const urania = specs.find((s) => s.id === 17)!

  it('karta z tekstem z U → zmiana', () => {
    const known = knownTexts(21)[0]
    expect(planAc({ id: 21, name: 'Cyane', ...known }, cyane).action).toBe('zmien')
  })

  it('Urania z opisem fasonu z AB → zmiana', () => {
    expect(planAc({ id: 17, name: 'Urania', ...URANIA_AB_TEXT }, urania).action).toBe('zmien')
  })

  it('już nowy tekst → juz (idempotentne)', () => {
    expect(planAc({ id: 21, name: 'Cyane', lead: cyane.lead, description: cyane.description }, cyane).action).toBe('juz')
  })

  it('tekst poprawiony ręcznie albo inna nazwa → pomin', () => {
    expect(planAc({ id: 21, name: 'Cyane', lead: 'ręcznie', description: 'ręcznie' }, cyane).action).toBe('pomin')
    expect(planAc({ id: 21, name: 'Inna', lead: cyane.lead, description: cyane.description }, cyane).action).toBe('pomin')
    expect(planAc(undefined, cyane).action).toBe('pomin')
  })
})
