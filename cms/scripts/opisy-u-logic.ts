/**
 * Jednolite opisy pierścionków (zlecenie U): dane z `seed/opisy/opisy-u.json` i czysta logika planu (bez bazy),
 * żeby dało się ją sprawdzić testem. Używa tego `scripts/staging-opisy-u.ts` (tylko staging) oraz
 * `tests/int/opisy-u.int.spec.ts`.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Pola karty, które zlecenie U może zmienić. `stone` tylko tam, gdzie rozstrzygnęła to Klaudia po zdjęciach
 * (przegląd PR #38: Thalassa i Rhea); pilnuje tego test.
 */
export const TEXT_FIELDS = ['lead', 'description', 'metal', 'stone', 'carats', 'clarity'] as const
export type TextField = (typeof TEXT_FIELDS)[number]

/** Jeden wpis z `opisy-u.json`: `id` i `name` do dopasowania, reszta to tylko pola zmienione względem eksportu. */
export type OpisSpec = { id: number; name: string } & Partial<Record<TextField, string>>

/**
 * Eksport `stan-2026-11-01.json` powstał 01.11 ok. 13:00 (czasu polskiego). Karta zapisana później mogła zostać
 * poprawiona ręcznie w panelu, więc jej nie nadpisujemy.
 */
export const EXPORT_CUTOFF = '2026-11-01T12:00:00Z'

const here = path.dirname(fileURLToPath(import.meta.url))

/** Pliki zlecenia (`cms/seed/opisy`). Ścieżki, nie `URL`: w testach (jsdom) globalny `URL` nie jest tym z Node. */
export const OPISY_DIR = path.resolve(here, '../seed/opisy')
export const SPECS_PATH = path.join(OPISY_DIR, 'opisy-u.json')

export function loadSpecs(source: string = SPECS_PATH): OpisSpec[] {
  const raw: unknown = JSON.parse(readFileSync(source, 'utf8'))
  if (!Array.isArray(raw)) throw new Error('opisy-u.json: oczekiwana lista kart')
  return raw.map((entry, index) => {
    const item = entry as Record<string, unknown>
    if (typeof item.id !== 'number' || typeof item.name !== 'string') {
      throw new Error(`opisy-u.json, pozycja ${index + 1}: brak liczbowego „id” albo tekstowej „name”`)
    }
    const spec: OpisSpec = { id: item.id, name: item.name }
    for (const key of Object.keys(item)) {
      if (key === 'id' || key === 'name') continue
      if (!(TEXT_FIELDS as readonly string[]).includes(key)) {
        throw new Error(`opisy-u.json, karta ${item.id}: nieznane pole „${key}”`)
      }
      if (typeof item[key] !== 'string') throw new Error(`opisy-u.json, karta ${item.id}: pole „${key}” musi być tekstem`)
      spec[key as TextField] = item[key] as string
    }
    return spec
  })
}

export type CardState = {
  id: number
  name: string
  updatedAt?: string | null
  status?: string | null
} & Partial<Record<TextField, string | null>>

export type OpisPlan =
  | { action: 'zmien'; data: Partial<Record<TextField, string>>; fields: TextField[]; note: string }
  | { action: 'juz'; note: string }
  | { action: 'pomin'; note: string }

const norm = (value: string | null | undefined) => (value ?? '').replace(/\r\n/g, '\n').trim()

/**
 * Decyzja dla jednej karty. Kolejność ma znaczenie dla idempotencji: najpierw „już ma nowe teksty” (po pierwszym
 * `--apply` `updatedAt` jest późniejsze niż eksport, a karta ma być „juz”, a nie „pomin”), dopiero potem strażnik daty.
 */
export function planCard(card: CardState | undefined, spec: OpisSpec, cutoff: string = EXPORT_CUTOFF): OpisPlan {
  if (!card) return { action: 'pomin', note: `nie ma karty o id ${spec.id} na stagingu` }
  if (card.name !== spec.name) {
    return { action: 'pomin', note: `nazwa „${card.name}” nie zgadza się z „${spec.name}”, zostawiam` }
  }
  const fields = TEXT_FIELDS.filter((field) => spec[field] !== undefined && norm(card[field]) !== norm(spec[field]))
  if (!fields.length) return { action: 'juz', note: 'teksty już zgodne z opisy-u.json, bez zmian' }
  if (card.updatedAt && Date.parse(card.updatedAt) > Date.parse(cutoff)) {
    return {
      action: 'pomin',
      note: `zapisana ręcznie po eksporcie (updatedAt ${card.updatedAt}), nie nadpisuję; różnice: ${fields.join(', ')}`,
    }
  }
  const data: Partial<Record<TextField, string>> = {}
  for (const field of fields) data[field] = spec[field] as string
  return { action: 'zmien', data, fields, note: `zmiana: ${fields.join(', ')}` }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Linter treści (standard karty ze zlecenia U). Używa go test na opisy-u.json; można go puścić na dowolnym tekście. */

/** Słowa liczone tak jak w zleceniu: ciągi znaków z co najmniej jedną literą albo cyfrą (półpauza się nie liczy). */
export function countWords(text: string): number {
  return text.split(/\s+/u).filter((token) => /[\p{L}\p{N}]/u.test(token)).length
}

/** Zakazane frazy (sekcja „Głos” zlecenia + typowe wstawki z FB). Sprawdzane bez względu na wielkość liter. */
export const FORBIDDEN_PHRASES = [
  'zapraszamy',
  'zapraszam',
  'zapowiedź',
  'już wkrótce',
  'przedstawiamy państwu',
  'kolejny',
  'kolejna',
  'pamiętacie',
  'co sądzicie',
  'napisz',
  'w komentarzu',
  'wierzeń',
  'energii',
  'energią',
  'przynosi szczęście',
  'tiffany',
  'elizabeth taylor',
  'księżniczka brazylii',
  'elegancki pierścionek',
]

/** Pierwsza osoba liczby pojedynczej (głos ma być „my”, pracownia). */
const FIRST_PERSON = /(?<![\p{L}])(ja|mnie|mną|mój|moja|moje|moich|moim|przeze mnie)(?![\p{L}])/iu

const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}]/u

export type LintIssue = { id: number; name: string; problem: string }

export function lintSpec(spec: OpisSpec): LintIssue[] {
  const issues: LintIssue[] = []
  const add = (problem: string) => issues.push({ id: spec.id, name: spec.name, problem })
  const { lead, description } = spec
  if (lead !== undefined) {
    const words = countWords(lead)
    if (words < 8 || words > 16) add(`lead ma ${words} słów (norma 8–16)`)
    if (/\n/.test(lead.trim())) add('lead ma kilka linii, ma być jednym zdaniem')
    if (lead.toLowerCase().includes(spec.name.toLowerCase())) add('lead zawiera nazwę pierścionka')
  }
  if (description !== undefined) {
    const words = countWords(description)
    if (words < 40 || words > 90) add(`opis ma ${words} słów (norma 40–90)`)
    const paragraphs = description.split(/\n\s*\n/u).filter((p) => p.trim())
    if (paragraphs.length < 2 || paragraphs.length > 3) add(`opis ma ${paragraphs.length} akapitów (norma 2–3)`)
  }
  for (const [label, text] of [
    ['lead', lead],
    ['opis', description],
  ] as const) {
    if (text === undefined) continue
    const lower = text.toLowerCase()
    for (const phrase of FORBIDDEN_PHRASES) if (lower.includes(phrase)) add(`${label}: zakazana fraza „${phrase}”`)
    const firstPerson = text.match(FIRST_PERSON)
    if (firstPerson) add(`${label}: pierwsza osoba „${firstPerson[0]}”`)
    if (EMOJI.test(text)) add(`${label}: emoji`)
    if (text.includes('?')) add(`${label}: pytanie do czytelnika`)
    if (text.includes('!')) add(`${label}: wykrzyknik`)
    if (/\s-\s/u.test(text) || /\s—\s/u.test(text)) add(`${label}: myślnik zamiast półpauzy z odstępami („ – ”)`)
    if (/\d\.\d+\s?ct/u.test(text)) add(`${label}: kropka dziesiętna w masie (ma być „0,41 ct”)`)
    if (/art deco/iu.test(text)) add(`${label}: „art deco” bez akcentu (ma być „art déco”)`)
  }
  return issues
}
