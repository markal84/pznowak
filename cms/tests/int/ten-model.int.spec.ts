import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { uniqueNoteSegments } from '../../src/lib/unique-note'
import { OPISY_DIR } from '../../scripts/opisy-u-logic'
import { lintTenModel, loadTenModel, overlap, planTenModel, type OtherText } from '../../scripts/ten-model-logic'

type Opis = { id: number; name: string; lead: string; description: string; carats?: string; stone?: string }
const read = (file: string): Opis[] => JSON.parse(readFileSync(path.join(OPISY_DIR, file), 'utf8'))
/** Opisy kart z repo: AC (opublikowane) i szkice (Xanthe, Aethra). */
const cards = [...read('opisy-ac.json'), ...read('opisy-szkice.json')]
const specs = loadTenModel()

describe('„Ten model” – teksty w seed/opisy/ten-model.json', () => {
  it('na początek 6 kart bliźniaczych', () => {
    expect(specs.map((s) => s.name).sort()).toEqual(['Aethra', 'Electra', 'Ianthe', 'Iole', 'Merope', 'Xanthe'])
  })

  it('każdy tekst przechodzi zaporę (długość, liczby z karty, podobieństwo do opisów i innych tekstów)', () => {
    for (const spec of specs) {
      const card = cards.find((c) => c.id === spec.id)
      expect(card, `brak opisu karty ${spec.name} w repo`).toBeDefined()
      const facts = [card?.name, card?.stone, card?.carats, card?.lead, card?.description].filter(Boolean).join('\n')
      const others: OtherText[] = [
        ...cards.flatMap((c) => [
          { label: `opis ${c.name}`, text: c.description },
          { label: `lead ${c.name}`, text: c.lead },
        ]),
        ...specs.filter((s) => s.id !== spec.id).map((s) => ({ label: `„Ten model” ${s.name}`, text: s.text })),
      ]
      expect(lintTenModel(spec, facts, others)).toEqual([])
    }
  })
})

describe('lintTenModel', () => {
  const base = { id: 1, name: 'Test' }
  const long = (extra: string) => `Test to pierścionek ${extra} ${'słowo '.repeat(85)}`.trim()

  it('łapie za krótki tekst, liczbę spoza karty i zdanie ze wspólnego opisu', () => {
    const problems = lintTenModel({ ...base, text: 'Kamień 3 ct. Kamienie oprawiamy ręcznie w naszej pracowni.' }, 'Test 1 ct', []).map((i) => i.problem)
    expect(problems.some((p) => p.includes('słów'))).toBe(true)
    expect(problems.some((p) => p.includes('„3”'))).toBe(true)
    expect(problems.some((p) => p.includes('oprawiamy'))).toBe(true)
  })

  it('łapie tekst zaczynający się od kamienia i skopiowany z innej karty', () => {
    const text = `Ametyst ${long('z kamieniem')}`
    const problems = lintTenModel({ ...base, text }, '', [{ label: 'inna', text }]).map((i) => i.problem)
    expect(problems.some((p) => p.includes('kamienia'))).toBe(true)
    expect(problems.some((p) => p.includes('inna'))).toBe(true)
  })

  it('overlap liczy wspólne ciągi 5 słów', () => {
    expect(overlap('a b c d e f', 'x a b c d e')).toBe(0.5)
    expect(overlap('a b c', 'a b c')).toBe(0)
  })
})

describe('planTenModel', () => {
  const spec = { id: 43, name: 'Iole', text: 'Nowy tekst' }
  it('zapisuje do pustego pola, nie rusza ręcznej wersji bez nadpisania', () => {
    expect(planTenModel({ id: 43, name: 'Iole', uniqueNote: '' }, spec).action).toBe('zmien')
    expect(planTenModel({ id: 43, name: 'Iole', uniqueNote: 'Nowy  tekst' }, spec).action).toBe('juz')
    expect(planTenModel({ id: 43, name: 'Iole', uniqueNote: 'Ręczny' }, spec).action).toBe('pomin')
    expect(planTenModel({ id: 43, name: 'Iole', uniqueNote: 'Ręczny' }, spec, true).action).toBe('zmien')
    expect(planTenModel({ id: 43, name: 'Ianthe' }, spec).action).toBe('pomin')
    expect(planTenModel(undefined, spec).action).toBe('pomin')
  })
})

describe('uniqueNoteSegments', () => {
  const list = [
    { name: 'Iole', slug: 'iole' },
    { name: 'Ianthe', slug: 'ianthe' },
    { name: 'Aion', slug: 'aion' },
  ]
  it('linkuje nazwy innych kart w mianowniku, raz na kartę, bez własnej nazwy', () => {
    const segments = uniqueNoteSegments('Iole jest jak pierścionek Ianthe, a Ianthe ma owal. Aionowi nic.', list, 'iole')
    expect(segments.filter((s) => s.slug).map((s) => s.slug)).toEqual(['ianthe'])
    expect(segments.map((s) => s.text).join('')).toBe('Iole jest jak pierścionek Ianthe, a Ianthe ma owal. Aionowi nic.')
  })
  it('pusty tekst = brak akapitu', () => {
    expect(uniqueNoteSegments('', list, 'iole')).toEqual([])
  })
})
