/**
 * „Ten model” (Marcin 20.11): krótki tekst tylko dla jednej karty, osobno od wspólnego opisu fasonu. Ma odróżnić karty
 * bliźniacze (Iole i Ianthe, Merope i Electra, Xanthe i Aethra), które Google sklejał jako duplikaty. Dane:
 * `seed/opisy/ten-model.json`. Zapora (`lintTenModel`) pilnuje długości, liczb i podobieństwa do innych tekstów.
 * Używa tego `scripts/staging-ten-model.ts` (tylko staging) oraz `tests/int/ten-model.int.spec.ts`.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { OPISY_DIR, countWords } from './opisy-u-logic'
import { STONE_OPENING } from './opisy-ac-logic'

export const TEN_MODEL_PATH = path.join(OPISY_DIR, 'ten-model.json')
export const MIN_WORDS = 80
export const MAX_WORDS = 120
/** Najwyżej tyle ciągów 5 słów tekstu może się powtarzać w innym tekście (opisie, innym „Ten model”). */
export const MAX_OVERLAP = 0.2

export type TenModelSpec = { id: number; name: string; text: string }

export function loadTenModel(source: string = TEN_MODEL_PATH): TenModelSpec[] {
  const raw: unknown = JSON.parse(readFileSync(source, 'utf8'))
  if (!Array.isArray(raw)) throw new Error('ten-model.json: oczekiwana lista kart')
  return raw.map((entry, index) => {
    const item = entry as Record<string, unknown>
    if (typeof item.id !== 'number' || typeof item.name !== 'string' || typeof item.text !== 'string') {
      throw new Error(`ten-model.json, pozycja ${index + 1}: potrzebne liczbowe „id” i tekstowe „name” oraz „text”`)
    }
    const extra = Object.keys(item).filter((key) => !['id', 'name', 'text'].includes(key))
    if (extra.length) throw new Error(`ten-model.json, karta ${item.id}: nieznane pola ${extra.join(', ')}`)
    return item as TenModelSpec
  })
}

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

function shingles(text: string, size = 5): Set<string> {
  const list = words(text)
  const out = new Set<string>()
  for (let i = 0; i + size <= list.length; i += 1) out.add(list.slice(i, i + size).join(' '))
  return out
}

/** Jaka część ciągów 5 słów `text` występuje też w `other` (0–1). */
export function overlap(text: string, other: string): number {
  const own = shingles(text)
  if (!own.size) return 0
  const theirs = shingles(other)
  let shared = 0
  for (const item of own) if (theirs.has(item)) shared += 1
  return shared / own.size
}

/** Liczby w tekście („1 ct”, „7,5”, „585”); słowne („dwóch”) nie są sprawdzane. */
const numbers = (text: string) => text.match(/\d+(?:[.,]\d+)?/g) ?? []

/** Zdania ze wspólnego opisu fasonu – są już na karcie, więc tu tylko by ją rozwadniały. */
const TEMPLATE_PHRASES = [/oprawiamy ręcznie/iu, /wybranym rozmiarze/iu, /w naszej pracowni/iu, /pokażemy ci zdjęcie/iu]

export type TenModelIssue = { id: number; name: string; problem: string }
/** Teksty, od których „Ten model” ma się różnić: wspólny opis, lead i „Ten model” innych kart. */
export type OtherText = { label: string; text: string }

/**
 * `facts`: tekst karty (nazwa, kamień, masa, lead, opis) – każda liczba z „Ten model” musi w nim wystąpić.
 * `others`: teksty do porównania (opis i lead tej karty, „Ten model” i opisy innych kart).
 */
export function lintTenModel(spec: TenModelSpec, facts: string, others: OtherText[]): TenModelIssue[] {
  const issues: TenModelIssue[] = []
  const add = (problem: string) => issues.push({ id: spec.id, name: spec.name, problem })
  const count = countWords(spec.text)
  if (count < MIN_WORDS || count > MAX_WORDS) add(`${count} słów (ma być ${MIN_WORDS}–${MAX_WORDS})`)
  const first = spec.text.trim().split(/\s+/u)[0] ?? ''
  if (STONE_OPENING.test(first)) add(`zaczyna się od kamienia („${first}”)`)
  for (const phrase of TEMPLATE_PHRASES) if (phrase.test(spec.text)) add(`zdanie ze wspólnego opisu (${phrase.source})`)
  const known = new Set(numbers(facts).map((n) => n.replace(',', '.')))
  for (const n of numbers(spec.text)) {
    if (!known.has(n.replace(',', '.'))) add(`liczba „${n}” nie występuje w danych karty`)
  }
  for (const other of others) {
    const share = overlap(spec.text, other.text)
    if (share > MAX_OVERLAP) add(`${Math.round(share * 100)}% wspólnych ciągów 5 słów z: ${other.label}`)
  }
  return issues
}

const norm = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim()

export type CardNote = { id: number; name: string; uniqueNote?: string | null }
export type TenModelPlan =
  | { action: 'zmien'; text: string; note: string }
  | { action: 'juz' | 'pomin'; note: string }

/** Zapis tylko do pustego pola (albo identycznego tekstu); ręczna wersja z panelu zostaje, chyba że `overwrite`. */
export function planTenModel(card: CardNote | undefined, spec: TenModelSpec, overwrite = false): TenModelPlan {
  if (!card) return { action: 'pomin', note: `nie ma karty o id ${spec.id}` }
  if (card.name !== spec.name) return { action: 'pomin', note: `nazwa „${card.name}” nie zgadza się z „${spec.name}”` }
  const current = norm(card.uniqueNote)
  if (current === norm(spec.text)) return { action: 'juz', note: '„Ten model” już zapisany' }
  if (current && !overwrite) return { action: 'pomin', note: 'pole „Ten model” ma inny tekst z panelu, nie nadpisuję' }
  return { action: 'zmien', text: spec.text, note: current ? '„Ten model” (nadpisany na prośbę)' : '„Ten model”' }
}
