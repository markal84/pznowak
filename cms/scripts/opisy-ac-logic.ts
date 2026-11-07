/**
 * Opisy fasonu zamiast opisu kamienia (zlecenie AC, Marcin 06.11): lead i opis kart z wariantami kamienia zaczynają
 * się od fasonu i wykonania, kamień ze zdjęć jest przykładem w drugim akapicie. Dane: `seed/opisy/opisy-ac.json`.
 * Używa tego `scripts/staging-opisy-ac.ts` (tylko staging) oraz `tests/int/opisy-ac.int.spec.ts`.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { CARD_TEXT as URANIA_AB_TEXT } from './polaczenie-ab-logic'
import { HARMONIA_BEFORE_MERGE } from './polaczenie-harmonia-logic'
import { CARD_TEXT as AION_THALASSA_TEXT, PREVIOUS_TEXT as AION_PREVIOUS_TEXT } from './polaczenie-thalassa-logic'
import { OPISY_DIR, loadSpecs as loadSpecsU, lintSpec, type LintIssue } from './opisy-u-logic'

export const AC_PATH = path.join(OPISY_DIR, 'opisy-ac.json')

/** `id` 0 + `slug`: karta bez stałego id w eksporcie (Thalia, Euterpe – szkice z importu opublikowane 06.11). */
export type AcSpec = { id: number; slug?: string; name: string; lead: string; description: string }
export type KnownText = { lead: string; description: string }

export function loadAcSpecs(source: string = AC_PATH): AcSpec[] {
  const raw: unknown = JSON.parse(readFileSync(source, 'utf8'))
  if (!Array.isArray(raw)) throw new Error('opisy-ac.json: oczekiwana lista kart')
  return raw.map((entry, index) => {
    const item = entry as Record<string, unknown>
    for (const key of ['name', 'lead', 'description']) {
      if (typeof item[key] !== 'string') throw new Error(`opisy-ac.json, pozycja ${index + 1}: brak tekstowego „${key}”`)
    }
    if (typeof item.id !== 'number') throw new Error(`opisy-ac.json, pozycja ${index + 1}: brak liczbowego „id”`)
    if (item.id === 0 && typeof item.slug !== 'string') throw new Error(`opisy-ac.json, pozycja ${index + 1}: id 0 wymaga „slug”`)
    const extra = Object.keys(item).filter((key) => !['id', 'slug', 'name', 'lead', 'description'].includes(key))
    if (extra.length) throw new Error(`opisy-ac.json, karta ${item.id}: nieznane pola ${extra.join(', ')}`)
    return item as AcSpec
  })
}

/**
 * Teksty, które karta ma prawo mieć przed zmianą: ze zlecenia U, a Urania – opis fasonu z AB. Inny tekst na stagingu
 * to ręczna poprawka w panelu i zostaje.
 */
const LEGACY_PATH = path.resolve(OPISY_DIR, '../../../data/legacy/collection.json')

/** Teksty z WordPressa (import): karty, których zlecenie U nie objęło, bo były szkicami. */
function legacyTexts(name: string): KnownText[] {
  try {
    const legacy = JSON.parse(readFileSync(LEGACY_PATH, 'utf8')) as { products: { name: string; lead?: string; description?: string }[] }
    return legacy.products
      .filter((product) => product.name === name)
      .map((product) => ({ lead: product.lead ?? '', description: product.description ?? '' }))
  } catch {
    return []
  }
}

/** Opis Thalii z 06.11 (PR #51), z szafirem; od 07.11 karta ma topaz London Blue, więc ten tekst wolno nadpisać bez `--nadpisz`. */
const THALIA_SAPPHIRE_TEXT: KnownText = {
  lead: 'Okrągłe halo z diamentów, diamentowe ramiona i ażurowy koszyk w żółtym złocie.',
  description:
    'Pierścionek z żółtego złota w okrągłej oprawie halo. Kamień centralny w łapkach otacza pierścień drobnych diamentów, diamenty biegną też wzdłuż ramion szyny, a z boku widać ażurowy koszyk z geometrycznymi wycięciami.\n\nKamienie oprawiamy ręcznie w naszej pracowni. Na zdjęciach w centrum jest szafir w głębokim, królewskim błękicie.\n\nModel wykonamy w wybranym rozmiarze, także z innym kamieniem centralnym.',
}

export function knownTexts(id: number, name?: string): KnownText[] {
  const known: KnownText[] = []
  if (name) known.push(...legacyTexts(name))
  const u = loadSpecsU().find((spec) => spec.id === id)
  if (u?.lead !== undefined && u.description !== undefined) known.push({ lead: u.lead, description: u.description })
  if (id === 17) known.push({ lead: URANIA_AB_TEXT.lead, description: URANIA_AB_TEXT.description })
  if (id === 20) known.push({ lead: HARMONIA_BEFORE_MERGE.lead, description: HARMONIA_BEFORE_MERGE.description })
  if (id === 46) known.push(AION_PREVIOUS_TEXT, AION_THALASSA_TEXT)
  if (name === 'Thalia') known.push(THALIA_SAPPHIRE_TEXT)
  return known
}

const norm = (value: string | null | undefined) => (value ?? '').replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim().toLowerCase()

export type CardText = { id: number; name: string; lead?: string | null; description?: string | null }
export type AcPlan =
  | { action: 'zmien'; data: { lead: string; description: string }; note: string }
  | { action: 'juz' | 'pomin'; note: string }

export function planAc(card: CardText | undefined, spec: AcSpec, known: KnownText[] = knownTexts(spec.id, spec.name)): AcPlan {
  if (!card) return { action: 'pomin', note: `nie ma karty ${spec.id ? `o id ${spec.id}` : `„${spec.slug}”`}` }
  if (card.name !== spec.name) return { action: 'pomin', note: `nazwa „${card.name}” nie zgadza się z „${spec.name}”` }
  const sameLead = norm(card.lead) === norm(spec.lead)
  const sameDescription = norm(card.description) === norm(spec.description)
  if (sameLead && sameDescription) return { action: 'juz', note: 'opis fasonu już zapisany' }
  const leadOk = sameLead || known.some((text) => norm(text.lead) === norm(card.lead))
  const descriptionOk = sameDescription || known.some((text) => norm(text.description) === norm(card.description))
  if (!leadOk || !descriptionOk) {
    return { action: 'pomin', note: 'lead albo opis zmienione ręcznie w panelu, nie nadpisuję (sprawdź tekst ręcznie)' }
  }
  return { action: 'zmien', data: { lead: spec.lead, description: spec.description }, note: 'opis fasonu (lead + opis)' }
}

/**
 * Słowa, od których lead i opis nie mogą się zaczynać: nazwa albo kolor kamienia. Kamień ze zdjęć to tylko jedna z
 * wersji fasonu, a po wyborze innego kółka taki początek zaprzeczał galerii.
 */
export const STONE_OPENING =
  /^(niebiesk|błękitn|różow|malinow|oliwkow|zielon|czerwon|fiolet|żółt|biał|granatow|diament|brylant|rubin|szafir|szmaragd|topaz|tanzanit|ametyst|turmalin|morganit|cytryn|oliwin|perydot|agat|opal|andaluzyt|mystic|naturaln|owaln)/iu

export function lintAc(spec: AcSpec): LintIssue[] {
  const issues = lintSpec(spec)
  for (const [label, text] of [
    ['lead', spec.lead],
    ['opis', spec.description],
  ] as const) {
    const first = text.trim().split(/\s+/u)[0] ?? ''
    if (STONE_OPENING.test(first)) issues.push({ id: spec.id, name: spec.name, problem: `${label} zaczyna się od kamienia („${first}”)` })
  }
  if (!/oprawiamy ręcznie|wykonaliśmy ręcznie/iu.test(spec.description)) {
    issues.push({ id: spec.id, name: spec.name, problem: 'opis bez zdania o ręcznym wykonaniu w pracowni' })
  }
  if (!/wybranym rozmiarze/iu.test(spec.description)) {
    issues.push({ id: spec.id, name: spec.name, problem: 'opis bez zdania o wykonaniu na zamówienie' })
  }
  return issues
}
