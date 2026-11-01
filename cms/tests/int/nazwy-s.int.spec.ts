import { describe, expect, it } from 'vitest'

import { SEED_WORKS } from '../../scripts/realizacje-data'
import { matchProduct, type CatalogProduct } from '../../scripts/realizacje-logic'
import {
  NAME_SPECS,
  descriptiveSentence,
  planRename,
  withDescriptiveName,
  type CardState,
  type NameSpec,
} from '../../scripts/nazwy-s-logic'

const spec = (id: number) => NAME_SPECS.find((s) => s.id === id) as NameSpec
const card = (s: NameSpec, extra: Partial<CardState> = {}): CardState => ({
  description: 'Szkic z posta.',
  id: s.id,
  name: s.oldName,
  slug: 'stary-adres',
  status: 'draft',
  ...extra,
})

/** Minimalny „staging”: karty w pamięci i ta sama pętla co w scripts/staging-nazwy-s.ts (plan → zapis). */
function run(cards: CardState[], apply: boolean) {
  const owners = () => new Map(cards.map((c) => [c.slug, c.id]))
  const log: string[] = []
  let changes = 0
  for (const s of NAME_SPECS) {
    const current = cards.find((c) => c.id === s.id)
    const plan = planRename(current, s, owners())
    log.push(`${plan.action}:${s.id}`)
    if (plan.action === 'zmien' && apply && current) {
      Object.assign(current, plan.data, { status: 'published' })
      changes += 1
    }
  }
  return { changes, log }
}

describe('zlecenie S: imiona nowych pierścionków', () => {
  it('ma 11 kart z id 37–47, unikalne imiona i adresy, adres = imię małymi literami', () => {
    expect(NAME_SPECS.map((s) => s.id)).toEqual([37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47])
    expect(new Set(NAME_SPECS.map((s) => s.newName)).size).toBe(11)
    expect(new Set(NAME_SPECS.map((s) => s.slug)).size).toBe(11)
    for (const s of NAME_SPECS) expect(s.slug).toBe(s.newName.toLowerCase())
    expect(spec(37).newName).toBe('Leucothea')
    expect(spec(47).newName).toBe('Calypso')
  })

  it('plan: zmienia nazwę i adres, a dotychczasową nazwę (bez „klienta”) dopisuje na początek opisu', () => {
    const plan = planRename(card(spec(47)), spec(47), new Map())
    expect(plan).toMatchObject({ action: 'zmien', data: { name: 'Calypso', slug: 'calypso' } })
    if (plan.action !== 'zmien') throw new Error('oczekiwano zmiany')
    expect(plan.data.description).toBe('Pierścionek zaręczynowy (wyspa).\n\nSzkic z posta.')
  })

  it('opis: puste pole dostaje samo zdanie, a opis który już zawiera nazwę zostaje bez zmian', () => {
    expect(withDescriptiveName('', 'Oliwin w szlifie emerald')).toBe('Oliwin w szlifie emerald.')
    expect(withDescriptiveName(null, 'Oliwin w szlifie emerald')).toBe('Oliwin w szlifie emerald.')
    expect(withDescriptiveName('Oliwin w szlifie emerald, biały kruszec.', 'Oliwin w szlifie emerald')).toBe(
      'Oliwin w szlifie emerald, biały kruszec.',
    )
    expect(descriptiveSentence('ETERNITY: kamienie kolorowe i brylanty')).toBe('ETERNITY: kamienie kolorowe i brylanty.')
  })

  it('apply, potem drugi apply daje 0 zmian', () => {
    const cards = NAME_SPECS.map((s) => card(s, { slug: `szkic-${s.id}` }))
    expect(run(cards, false).changes).toBe(0)
    expect(cards.every((c, i) => c.name === NAME_SPECS[i].oldName)).toBe(true)

    const first = run(cards, true)
    expect(first.changes).toBe(11)
    expect(cards.map((c) => c.name)).toEqual(NAME_SPECS.map((s) => s.newName))
    expect(cards.every((c) => c.status === 'published')).toBe(true)

    const snapshot = JSON.stringify(cards)
    const second = run(cards, true)
    expect(second.changes).toBe(0)
    expect(second.log.every((entry) => entry.startsWith('juz:'))).toBe(true)
    expect(JSON.stringify(cards)).toBe(snapshot)
  })

  it('karta z ręcznie zmienioną nazwą jest pomijana, reszta idzie dalej', () => {
    const cards = NAME_SPECS.map((s) => card(s, { slug: `szkic-${s.id}` }))
    cards[2].name = 'Chloris Michała'
    const { changes, log } = run(cards, true)
    expect(changes).toBe(10)
    expect(log[2]).toBe('pomin:39')
    expect(cards[2].name).toBe('Chloris Michała')
  })

  it('pomija brakującą kartę, zarchiwizowaną i adres zajęty przez inną kartę', () => {
    expect(planRename(undefined, spec(40), new Map())).toMatchObject({ action: 'pomin' })
    expect(planRename(card(spec(40), { archived: true }), spec(40), new Map())).toMatchObject({ action: 'pomin' })
    const collision = planRename(card(spec(40)), spec(40), new Map([['erythea', 999]]))
    expect(collision).toMatchObject({ action: 'pomin' })
    expect(collision.note).toContain('999')
    // ten sam adres zajęty przez samą kartę nie jest kolizją
    expect(planRename(card(spec(40), { slug: 'erythea' }), spec(40), new Map([['erythea', 40]]))).toMatchObject({ action: 'zmien' })
  })
})

describe('zlecenie S: Realizacje znajdują karty po nowych nazwach', () => {
  const published = (id: number, name: string): CatalogProduct => ({ archived: false, id, name, status: 'published' })
  const bySlug = (slug: string) => SEED_WORKS.find((w) => w.slug === slug)!

  it('wyspa: stara nazwa i Calypso, brylant szmaragdowy: stara nazwa i Leucothea', () => {
    const island = bySlug('pierscionek-zareczynowy-wyspa').product
    expect(matchProduct([published(1, 'Pierścionek zaręczynowy klienta (wyspa)')], island)?.product.id).toBe(1)
    expect(matchProduct([published(2, 'Calypso')], island)).toMatchObject({ by: 'nazwa', product: { id: 2 } })

    const emerald = bySlug('brylant-w-szlifie-szmaragdowym').product
    expect(matchProduct([published(3, 'Brylant w szlifie szmaragdowym 0,41 ct')], emerald)?.product.id).toBe(3)
    expect(matchProduct([published(4, 'Leucothea')], emerald)?.product.id).toBe(4)
  })
})
