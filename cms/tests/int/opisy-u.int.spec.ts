import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  EXPORT_CUTOFF,
  OPISY_DIR,
  TEXT_FIELDS,
  countWords,
  lintSpec,
  loadSpecs,
  planCard,
  type CardState,
  type OpisSpec,
} from '../../scripts/opisy-u-logic'

type ExportCard = { id: number; name: string; stone: string } & Record<(typeof TEXT_FIELDS)[number], string>

const specs = loadSpecs()
const exported: ExportCard[] = JSON.parse(
  readFileSync(path.join(OPISY_DIR, 'stan-2026-11-01.json'), 'utf8'),
)

/** Karta „ze stagingu” w stanie z eksportu (zapisana przed eksportem). */
const fromExport = (card: ExportCard, extra: Partial<CardState> = {}): CardState => ({
  ...card,
  status: 'published',
  updatedAt: '2026-10-31T20:00:00.000Z',
  ...extra,
})

/** Minimalny „staging”: karty w pamięci i ta sama pętla co w scripts/staging-opisy-u.ts (plan → zapis). */
function run(cards: CardState[], apply: boolean, now = '2026-11-02T09:00:00.000Z') {
  const log: string[] = []
  let changes = 0
  for (const spec of specs) {
    const current = cards.find((c) => c.id === spec.id)
    const plan = planCard(current, spec)
    log.push(`${plan.action}:${spec.id}`)
    if (plan.action === 'zmien' && apply && current) {
      Object.assign(current, plan.data, { updatedAt: now })
      changes += 1
    }
  }
  return { changes, log }
}

describe('opisy-u.json – dane', () => {
  it('ma wpis dla każdej z 40 kart z eksportu, z tą samą nazwą', () => {
    expect(specs).toHaveLength(40)
    const byId = new Map(exported.map((c) => [c.id, c]))
    for (const spec of specs) expect(byId.get(spec.id)?.name, `#${spec.id}`).toBe(spec.name)
    expect(new Set(specs.map((s) => s.id)).size).toBe(specs.length)
  })

  it('każda karta dostaje nowy opis; lead zostaje tylko tam, gdzie spełniał standard (Dione, Phoebe)', () => {
    for (const spec of specs) expect(spec.description, spec.name).toBeTruthy()
    expect(specs.filter((s) => s.lead === undefined).map((s) => s.name)).toEqual(['Dione', 'Phoebe'])
  })

  it('zawiera tylko pola zmienione względem eksportu', () => {
    const byId = new Map(exported.map((c) => [c.id, c]))
    for (const spec of specs) {
      const card = byId.get(spec.id) as ExportCard
      for (const field of TEXT_FIELDS) {
        if (spec[field] !== undefined) expect(spec[field], `${spec.name}.${field}`).not.toBe(card[field] ?? '')
      }
    }
  })

  it('metal tylko z listy kolorów złota, masy i czystość w polskim zapisie', () => {
    for (const spec of specs) {
      if (spec.metal !== undefined) expect(['Żółte', 'Białe', 'Żółte z białym']).toContain(spec.metal)
      if (spec.carats !== undefined) expect(spec.carats, spec.name).toMatch(/^[^.]*\d,\d+ ct/u)
      if (spec.clarity !== undefined) expect(spec.clarity, spec.name).toMatch(/barwa [D-Z]$/u)
    }
  })

  it('pole „stone” zmienia tylko w Thalassie i Rhei (decyzja Klaudii po zdjęciach)', () => {
    const changed = Object.fromEntries(specs.filter((s) => s.stone !== undefined).map((s) => [s.name, s.stone]))
    expect(changed).toEqual({ Thalassa: 'Diament niebieski, Diament', Rhea: 'Agat zielony, Diament' })
  })

  it('kolor złota ze zdjęć: karty bez metalu w eksporcie dostają kolor', () => {
    const byName = new Map(specs.map((s) => [s.name, s]))
    for (const name of ['Leucothea', 'Erythea', 'Rhodope', 'Ianthe', 'Iole', 'Rhea', 'Eos', 'Aion']) {
      expect(byName.get(name)?.metal, name).toBe('Żółte')
    }
  })
})

describe('opisy-u.json – linter treści', () => {
  it('lead 8–16 słów, opis 40–90 słów w 2–3 akapitach, bez zakazanych fraz, emoji, pytań i pierwszej osoby', () => {
    // Karta po zmianie = eksport + pola z opisy-u.json (lead bez zmian też musi spełniać standard).
    const byId = new Map(exported.map((c) => [c.id, c]))
    const after = specs.map((spec): OpisSpec => {
      const card = byId.get(spec.id) as ExportCard
      return { ...spec, lead: spec.lead ?? card.lead, description: spec.description ?? card.description }
    })
    const issues = after.flatMap(lintSpec)
    expect(issues.map((i) => `#${i.id} ${i.name}: ${i.problem}`)).toEqual([])
  })

  it('Aion: obrączka eternity z różowymi szafirami (jedyne zdjęcie karty), bez czterech wariantów pierścionka', () => {
    const aion = specs.find((s) => s.name === 'Aion') as OpisSpec
    expect(aion.lead).toMatch(/eternity/u)
    for (const text of ['Obrączka', 'różowe szafiry', 'złota 14k', 'od podstaw', 'online', 'bez przymiarek']) {
      expect(aion.description).toContain(text)
    }
    // Bez koloru złota w tekście: pole `metal` = „Żółte” (decyzja Marcina), nic nie może mu przeczyć.
    expect(`${aion.lead} ${aion.description}`).not.toMatch(/czterech|turmalin|szmaragd|zaufani|różow\w* złot|żółt\w* złot/iu)
    expect(aion).not.toHaveProperty('stone')
  })

  it('Leucothea: GIA tylko przy tym egzemplarzu, bez obietnicy certyfikatu dla nowego zamówienia', () => {
    const leucothea = specs.find((s) => s.name === 'Leucothea') as OpisSpec
    const paragraphs = (leucothea.description ?? '').split(/\n\s*\n/u)
    expect(paragraphs[0]).toMatch(/GIA/u)
    expect(paragraphs.slice(1).join(' ')).not.toMatch(/GIA|certyfikat/iu)
  })

  it('Calypso: model bez historii pary i wyspy, bez dawnego pierwszego zdania', () => {
    const calypso = specs.find((s) => s.name === 'Calypso') as OpisSpec
    expect(calypso.description).not.toMatch(/wysp|zaręczyn|narzeczon|Pierścionek zaręczynowy \(wyspa\)/iu)
    expect(calypso.description).toMatch(/niebieskim diamentem/u)
    expect(calypso.description).toMatch(/białego złota/u)
  })

  it('karty z zlecenia S nie zaczynają się od dawnej nazwy opisowej', () => {
    const oldFirstSentences = exported
      .filter((c) => c.id >= 37 && c.id <= 47)
      .map((c) => [c.id, c.description.split('\n')[0].trim()] as const)
    for (const [id, sentence] of oldFirstSentences) {
      const spec = specs.find((s) => s.id === id) as OpisSpec
      expect(spec.description?.startsWith(sentence), `#${id}`).toBe(false)
    }
  })

  it('Thalassa: bez próby 586 i bez rubinu (niezgodności tylko w raporcie)', () => {
    const thalassa = specs.find((s) => s.name === 'Thalassa') as OpisSpec
    expect(thalassa.description).not.toMatch(/586|rubin/iu)
  })

  it('linter łapie typowe wstawki z FB', () => {
    const bad: OpisSpec = {
      id: 1,
      name: 'Test',
      lead: 'Elegancki pierścionek Test',
      description: 'Zapowiedź! Co sądzicie? Napisz do mnie 🙂 Szafir 0.44 ct w stylu art deco - według wierzeń przynosi szczęście.',
    }
    const problems = lintSpec(bad).map((i) => i.problem).join('\n')
    for (const expected of [
      'lead ma 3 słów',
      'lead zawiera nazwę',
      'zakazana fraza „zapowiedź”',
      'zakazana fraza „co sądzicie”',
      'zakazana fraza „napisz”',
      'zakazana fraza „wierzeń”',
      'zakazana fraza „przynosi szczęście”',
      'zakazana fraza „elegancki pierścionek”',
      'pierwsza osoba „mnie”',
      'emoji',
      'pytanie',
      'wykrzyknik',
      'myślnik',
      'kropka dziesiętna',
      'art deco',
      'opis ma 1 akapitów',
    ]) {
      expect(problems).toContain(expected)
    }
  })

  it('liczy słowa bez półpauz, z liczbami', () => {
    expect(countWords('Słoneczny cytryn i świetlista oprawa – ciepło w szlachetnej formie.')).toBe(9)
    expect(countWords('Cytryn 0,39 ct, twardość 7–7,5.')).toBe(5)
  })
})

describe('planCard – plan zapisu na stagingu', () => {
  it('plan dla kart z eksportu: wszystkie 40 do zmiany, z listą pól', () => {
    const cards = exported.map((c) => fromExport(c))
    const { log } = run(cards, false)
    expect(log.filter((l) => l.startsWith('zmien'))).toHaveLength(40)
    const athena = planCard(
      fromExport(exported.find((c) => c.name === 'Athena') as ExportCard),
      specs.find((s) => s.name === 'Athena') as OpisSpec,
    )
    expect(athena).toMatchObject({ action: 'zmien', fields: ['lead', 'description', 'carats'] })
  })

  it('pomija kartę zapisaną po eksporcie (updatedAt > 2026-11-01T12:00:00Z), z komunikatem', () => {
    const card = exported.find((c) => c.name === 'Merope') as ExportCard
    const spec = specs.find((s) => s.id === card.id) as OpisSpec
    const plan = planCard(fromExport(card, { updatedAt: '2026-11-01T12:00:01.000Z' }), spec)
    expect(plan.action).toBe('pomin')
    expect(plan.note).toMatch(/po eksporcie/u)
    expect(planCard(fromExport(card, { updatedAt: EXPORT_CUTOFF }), spec).action).toBe('zmien')
  })

  it('pomija, gdy id albo nazwa się nie zgadzają', () => {
    const card = exported.find((c) => c.name === 'Leto') as ExportCard
    const spec = specs.find((s) => s.id === card.id) as OpisSpec
    expect(planCard(undefined, spec).action).toBe('pomin')
    expect(planCard(fromExport(card, { name: 'Leto (kopia)' }), spec).action).toBe('pomin')
  })

  it('jest idempotentny: drugie uruchomienie nic nie zmienia, także mimo nowego updatedAt', () => {
    const cards = exported.map((c) => fromExport(c))
    const first = run(cards, true)
    expect(first.changes).toBe(40)
    const second = run(cards, true)
    expect(second.changes).toBe(0)
    expect(second.log.every((l) => l.startsWith('juz'))).toBe(true)
  })

  it('zapisuje tylko pola z planu, bez „stone”, nazwy i statusu', () => {
    const card = fromExport(exported.find((c) => c.name === 'Amphitrite') as ExportCard)
    const plan = planCard(card, specs.find((s) => s.id === card.id) as OpisSpec)
    expect(plan.action).toBe('zmien')
    if (plan.action !== 'zmien') return
    expect(Object.keys(plan.data).sort()).toEqual(['carats', 'description', 'lead', 'metal'])
    expect(plan.data.metal).toBe('Białe')
  })
})

describe('karta pierścionka – akapity opisu', () => {
  it('dzieli opis na akapity po pustej linii, pojedyncze złamania zamienia na spację', async () => {
    const { descriptionParagraphs } = await import('../../src/lib/catalog')
    expect(descriptionParagraphs('Pierwszy\nciąg dalszy.\n\nDrugi.\r\n\r\n  \n\nTrzeci.')).toEqual([
      'Pierwszy ciąg dalszy.',
      'Drugi.',
      'Trzeci.',
    ])
    expect(descriptionParagraphs(null)).toEqual([])
    const aion = specs.find((s) => s.name === 'Aion') as OpisSpec
    expect(descriptionParagraphs(aion.description)).toHaveLength(3)
  })
})
