/**
 * Krok „opisz nowe szkice” po imporcie z FB (`npm run import:fb -- --apply`): czysta logika bez sieci i bez bazy.
 * Dla szkicu pierścionka z pustymi polami planuje: imię (plik opisów → kanon → wolne imię z puli mitologii), krótki
 * opis i opis (tylko z `seed/opisy/opisy-szkice.json`, schemat AC), kamień, metal i masę (plik opisów, a bez niego
 * odczyt z posta z flagą „do sprawdzenia”). Planuje WYŁĄCZNIE pola puste albo z tekstem, który wstawił sam import
 * (nazwa zastępcza „Do nazwania”, tytuł posta), więc ręczna poprawka w panelu zostaje, a drugi przebieg nic nie zmienia.
 * Używa tego `scripts/opisz-szkice.ts` oraz `tests/int/opisz-szkice.int.spec.ts`.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  NAME_PLACEHOLDER,
  cleanPostText,
  draftDescription,
  draftLead,
  extractDetails,
  slugify,
  uniqueSlug,
  type FbPost,
} from '../src/lib/fb-import'
import { lintAc } from './opisy-ac-logic'
import { OPISY_DIR } from './opisy-u-logic'

const here = path.dirname(fileURLToPath(import.meta.url))
export const OPISY_SZKICE_PATH = path.join(OPISY_DIR, 'opisy-szkice.json')
export const KANON_PATH = path.resolve(here, '../../scripts/facebook/nazwy-kanon.json')
export const PULA_PATH = path.resolve(here, '../../scripts/facebook/nazwy-pula.json')

export const TEXT_FIELDS = ['lead', 'description'] as const
export const PARAM_FIELDS = ['stone', 'metal', 'carats'] as const
export type ParamField = (typeof PARAM_FIELDS)[number]
export type Field = 'name' | 'slug' | (typeof TEXT_FIELDS)[number] | ParamField

export const FIELD_LABELS: Record<Field, string> = {
  name: 'imię',
  slug: 'adres',
  lead: 'krótki opis',
  description: 'opis',
  stone: 'kamień',
  metal: 'metal',
  carats: 'masa kamienia',
}

/** Karta tak, jak zwraca ją REST Payload (`depth` 0 albo 1, `draft=true`, konto z rolą Redaktor widzi `source`). */
export type DraftCard = {
  id: number
  name?: string | null
  slug?: string | null
  lead?: string | null
  description?: string | null
  stone?: string | null
  metal?: string | null
  carats?: string | null
  _status?: string | null
  archived?: boolean | null
  source?: {
    facebookKey?: string | null
    facebookPayload?: { posts?: FbPost[] | null; parsed?: Record<string, string> | null } | null
  } | null
  media?: Array<{
    alt?: string | null
    isPrimary?: boolean | null
    asset?:
      | number
      | { url?: string | null; mimeType?: string | null; filename?: string | null }
      | null
  }> | null
}

/** Pozycja pliku opisów. Karta szukana po kluczu z przeglądu (`klucz` = facebookKey), potem po id, potem po adresie. */
export type OpisSzkicu = {
  klucz?: string
  id?: number
  slug?: string
  name?: string
  lead?: string
  description?: string
  stone?: string
  metal?: string
  carats?: string
  /** Co Marcin ma sprawdzić (np. „szlif radiant odczytany ze zdjęć”). Idzie do podglądu, nie do karty. */
  uwagi?: string[]
}

const SPEC_KEYS = [
  'klucz',
  'id',
  'slug',
  'name',
  'lead',
  'description',
  'stone',
  'metal',
  'carats',
  'uwagi',
]

export function loadOpisy(source: string = OPISY_SZKICE_PATH): OpisSzkicu[] {
  const raw: unknown = JSON.parse(readFileSync(source, 'utf8'))
  if (!Array.isArray(raw)) throw new Error(`${path.basename(source)}: oczekiwana lista kart`)
  return raw.map((entry, index) => {
    const item = entry as Record<string, unknown>
    const where = `${path.basename(source)}, pozycja ${index + 1}`
    const extra = Object.keys(item).filter((key) => !SPEC_KEYS.includes(key))
    if (extra.length) throw new Error(`${where}: nieznane pola ${extra.join(', ')}`)
    if (!item.klucz && item.id === undefined && !item.slug)
      throw new Error(`${where}: potrzebny „klucz”, „id” albo „slug”`)
    if (item.id !== undefined && typeof item.id !== 'number')
      throw new Error(`${where}: „id” ma być liczbą`)
    for (const key of [
      'klucz',
      'slug',
      'name',
      'lead',
      'description',
      'stone',
      'metal',
      'carats',
    ]) {
      if (item[key] !== undefined && typeof item[key] !== 'string')
        throw new Error(`${where}: „${key}” ma być tekstem`)
    }
    if (
      item.uwagi !== undefined &&
      !(Array.isArray(item.uwagi) && item.uwagi.every((u) => typeof u === 'string'))
    ) {
      throw new Error(`${where}: „uwagi” ma być listą tekstów`)
    }
    return item as OpisSzkicu
  })
}

export type KanonRule = { match: string; name: string }

export function loadKanon(source: string = KANON_PATH): KanonRule[] {
  return (JSON.parse(readFileSync(source, 'utf8')) as { rules: KanonRule[] }).rules
}

/** Pula wolnych imion z mitologii greckiej, w kolejności przydziału. */
export function loadPula(source: string = PULA_PATH): string[] {
  return (JSON.parse(readFileSync(source, 'utf8')) as { names: string[] }).names
}

const norm = (value: string | null | undefined) =>
  (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
export const isBlank = (value: string | null | undefined) => !norm(value)

export const facebookKey = (card: DraftCard) => card.source?.facebookKey ?? ''
export const postsOf = (card: DraftCard): FbPost[] => card.source?.facebookPayload?.posts ?? []

/** Tytuł karty z przeglądu odtworzony z klucza (`moissanit-1-ct-szampanski@123` → „moissanit 1 ct szampanski”). */
export const cardTitle = (card: DraftCard) =>
  facebookKey(card).split('@')[0].replace(/-/g, ' ').trim()

export function canonName(title: string, rules: KanonRule[]): string {
  return rules.find((rule) => new RegExp(rule.match, 'i').test(title))?.name ?? ''
}

/**
 * Imię wstawione przez import, nie przez człowieka: puste, „Do nazwania” (z numerem lub bez) albo tytuł posta, z którego
 * powstał klucz karty (stary import przepisywał tytuł posta do nazwy, np. karta 60 „Turmalin – zieleń…”).
 */
export function nameFromImport(card: DraftCard): boolean {
  const name = card.name ?? ''
  if (isBlank(name)) return true
  if (/^do nazwania(\s*\d+)?$/iu.test(name.trim()) || norm(name) === norm(NAME_PLACEHOLDER))
    return true
  const keyTitle = facebookKey(card).split('@')[0]
  return Boolean(keyTitle) && slugify(name) === keyTitle
}

const slugFromImport = (card: DraftCard) => {
  const slug = card.slug ?? ''
  if (!slug || /^do-nazwania(-\d+)?$/.test(slug)) return true
  const keyTitle = facebookKey(card).split('@')[0]
  return Boolean(keyTitle) && slug.replace(/-\d+$/, '') === keyTitle
}

/** Krótki opis albo opis wstawiony przez import (szkic z tekstu posta albo sam tytuł posta), nie przez człowieka. */
export function textFromImport(card: DraftCard, field: 'lead' | 'description'): boolean {
  const value = card[field]
  if (isBlank(value)) return true
  const posts = postsOf(card)
  if (!posts.length) return false
  const generated = field === 'lead' ? draftLead(posts) : draftDescription(posts)
  if (norm(value) === norm(generated)) return true
  // Stary import: lead = tytuł posta (pierwsza linia) z kropką albo bez.
  const firstLines = posts.map((post) => cleanPostText(post.text).split('\n')[0] ?? '')
  return (
    field === 'lead' &&
    firstLines.some(
      (line) => line && norm(value).replace(/[.…]$/u, '') === norm(line).replace(/[.…]$/u, ''),
    )
  )
}

/** Kamienie spoza listy importu (`fb-import.ts`); import ich nie rozpoznaje, więc karta zostaje z pustym kamieniem. */
const EXTRA_STONES: Array<[RegExp, string]> = [
  [/moissanit/iu, 'Moissanit'],
  [/andaluzyt/iu, 'Andaluzyt'],
  [/\bopal/iu, 'Opal'],
  [/spinel/iu, 'Spinel'],
  [/granat(?!ow)/iu, 'Granat'],
  [/kunzyt/iu, 'Kunzyt'],
]

/** Metal w zapisie katalogu: „Żółte”, „Białe”, „Różowe”, „Żółte z białym”. */
function metalFromText(text: string): string {
  const colors: string[] = []
  // „złot…” i „złocie” (import pomija „w żółtym złocie”); nie „złocisty” (to kolor kamienia, nie metal).
  const gold = '(?:złot\\p{L}*|złocie\\b)'
  if (new RegExp(`żółt\\p{L}*\\s+${gold}`, 'iu').test(text)) colors.push('Żółte')
  if (new RegExp(`biał\\p{L}*\\s+${gold}`, 'iu').test(text)) colors.push('Białe')
  if (new RegExp(`różow\\p{L}*\\s+${gold}|rose gold`, 'iu').test(text)) colors.push('Różowe')
  if (/platyn/iu.test(text)) colors.push('Platyna')
  if (colors.length === 2 && colors.includes('Żółte') && colors.includes('Białe'))
    return 'Żółte z białym'
  return colors.length === 1 ? colors[0] : ''
}

/** Kamień, metal i masa odczytane z tekstu postów (to, co widać w treści; nic nie zgadujemy). */
export function paramsFromPosts(card: DraftCard): Record<ParamField, string> {
  const posts = postsOf(card)
  const texts = posts.map((post) => cleanPostText(post.text))
  const all = [cardTitle(card), ...texts].join('\n')
  const parsed = extractDetails(cardTitle(card), texts)
  let stone = parsed.stone
  if (!stone || stone === 'Diament') {
    const extra = EXTRA_STONES.find(([pattern]) => pattern.test(all))?.[1]
    if (extra) stone = stone === 'Diament' ? `${extra}, Diament` : extra
  }
  // Import czyta tylko „0,41 ct”; tu także pełne karaty („1 ct”, „2 ct”). Najpierw z tytułu karty.
  const caratPattern = /(?<![\d,.])(\d+(?:[,.]\d+)?)\s*(?:ct|kt|karat)/iu
  const carat = cardTitle(card).match(caratPattern) ?? texts.join('\n').match(caratPattern)
  const carats = carat ? `${carat[1].replace('.', ',')} ct` : ''
  return { stone, metal: metalFromText(all), carats }
}

export function findSpec(card: DraftCard, specs: OpisSzkicu[]): OpisSzkicu | undefined {
  const key = facebookKey(card)
  return (
    (key ? specs.find((spec) => spec.klucz === key) : undefined) ??
    specs.find((spec) => spec.id === card.id && !spec.klucz) ??
    specs.find(
      (spec) =>
        Boolean(spec.slug) && spec.slug === card.slug && !spec.klucz && spec.id === undefined,
    )
  )
}

export type Change = { field: Field; value: string; source: string; check?: string }
export type DraftPlan = {
  id: number
  label: string
  changes: Change[]
  /** Pola zostawione puste albo do obejrzenia przez Marcina. */
  toCheck: string[]
  skip?: string
}

export type PlanContext = {
  specs: OpisSzkicu[]
  kanon: KanonRule[]
  pula: string[]
  /** Imiona wszystkich kart (opublikowane, szkice, archiwum) i wycofane adresy, małymi literami. Uzupełniane w trakcie. */
  takenNames: Set<string>
  takenSlugs: Set<string>
}

function pickName(
  card: DraftCard,
  spec: OpisSzkicu | undefined,
  ctx: PlanContext,
  toCheck: string[],
): Change | undefined {
  const free = (name: string) =>
    !ctx.takenNames.has(norm(name)) && !ctx.takenSlugs.has(slugify(name))
  if (spec?.name) {
    if (free(spec.name)) return { field: 'name', value: spec.name, source: 'plik opisów' }
    toCheck.push(`imię „${spec.name}” z pliku opisów ma już inna karta`)
  }
  const kanon = canonName(cardTitle(card), ctx.kanon)
  if (kanon) {
    if (free(kanon)) return { field: 'name', value: kanon, source: 'kanon imion' }
    toCheck.push(`imię „${kanon}” z kanonu ma już inna karta, biorę wolne z puli`)
  }
  const reserved = new Set(ctx.kanon.map((rule) => norm(rule.name)))
  const fromPool = ctx.pula.find((name) => free(name) && !reserved.has(norm(name)))
  if (fromPool)
    return {
      field: 'name',
      value: fromPool,
      source: 'pula imion',
      check: 'imię z puli mitologii – potwierdź albo zmień w panelu',
    }
  toCheck.push(
    'imię: pula wolnych imion się skończyła – dopisz imiona w scripts/facebook/nazwy-pula.json',
  )
  return undefined
}

/**
 * Plan dla jednego szkicu. Zmienia `ctx` (rezerwuje nadane imię i adres), żeby dwa szkice w jednym przebiegu nie
 * dostały tego samego imienia.
 */
export function planDraft(card: DraftCard, ctx: PlanContext): DraftPlan {
  const label = `#${card.id} ${card.name || '(bez nazwy)'}`
  const plan: DraftPlan = { id: card.id, label, changes: [], toCheck: [] }
  if (card._status !== 'draft')
    return { ...plan, skip: 'karta opublikowana – krok opisuje tylko szkice' }
  if (card.archived) return { ...plan, skip: 'karta w archiwum' }

  const spec = findSpec(card, ctx.specs)
  if (spec?.uwagi?.length) plan.toCheck.push(...spec.uwagi)

  if (nameFromImport(card)) {
    const name = pickName(card, spec, ctx, plan.toCheck)
    if (name) {
      plan.changes.push(name)
      ctx.takenNames.add(norm(name.value))
      if (slugFromImport(card)) {
        const slug = uniqueSlug(slugify(name.value), ctx.takenSlugs)
        ctx.takenSlugs.add(slug)
        plan.changes.push({ field: 'slug', value: slug, source: 'z imienia' })
      }
    }
  }

  // Teksty tylko z pliku opisów (schemat AC); tekst posta nigdy nie jest opisem karty.
  const textIssues = spec
    ? lintAc({
        id: card.id,
        name: spec.name ?? card.name ?? '',
        lead: spec.lead ?? '',
        description: spec.description ?? '',
      })
    : []
  for (const field of TEXT_FIELDS) {
    if (!textFromImport(card, field)) continue
    const value = spec?.[field]?.trim()
    if (!value) {
      plan.toCheck.push(
        `${FIELD_LABELS[field]}: brak tekstu w opisy-szkice.json – zostaje puste (npm run opisz:szkice -- --zadanie)`,
      )
      continue
    }
    const label = field === 'lead' ? 'lead' : 'opis'
    const issues = textIssues.filter((issue) => issue.problem.startsWith(label))
    if (issues.length) {
      plan.toCheck.push(
        `${FIELD_LABELS[field]}: tekst z pliku nie spełnia schematu (${issues.map((i) => i.problem).join('; ')}) – nie wpisuję`,
      )
      continue
    }
    plan.changes.push({ field, value, source: 'plik opisów' })
  }

  const fromPosts = paramsFromPosts(card)
  for (const field of PARAM_FIELDS) {
    if (!isBlank(card[field])) continue
    const fromSpec = spec?.[field]?.trim()
    if (fromSpec) {
      plan.changes.push({ field, value: fromSpec, source: 'plik opisów' })
    } else if (fromPosts[field]) {
      plan.changes.push({
        field,
        value: fromPosts[field],
        source: 'post FB',
        check: 'odczyt z treści posta – sprawdź',
      })
    } else {
      plan.toCheck.push(
        `${FIELD_LABELS[field]}: nie widać w poście ani w pliku opisów – zostaje puste`,
      )
    }
  }
  return plan
}

export function planDrafts(cards: DraftCard[], ctx: PlanContext): DraftPlan[] {
  return [...cards].sort((a, b) => a.id - b.id).map((card) => planDraft(card, ctx))
}

/** Czy pole świeżo pobranej karty nadal jest puste (albo z tekstem importu)? Sprawdzane tuż przed zapisem. */
export function stillOpen(card: DraftCard, field: Field): boolean {
  if (field === 'name') return nameFromImport(card)
  if (field === 'slug') return slugFromImport(card)
  if (field === 'lead' || field === 'description') return textFromImport(card, field)
  return isBlank(card[field])
}

/** Dane do PATCH: tylko pola z planu. */
export const patchData = (plan: DraftPlan): Partial<Record<Field, string>> =>
  Object.fromEntries(plan.changes.map((change) => [change.field, change.value]))

/** Zbiór zajętych imion i adresów: wszystkie karty z bazy oprócz opisywanej oraz wycofane adresy z przekierowań. */
export function takenFrom(
  cards: Array<Pick<DraftCard, 'id' | 'name' | 'slug'>>,
  reservedSlugs: Iterable<string>,
  exceptId?: number,
) {
  const takenNames = new Set<string>()
  const takenSlugs = new Set<string>()
  for (const card of cards) {
    if (card.id === exceptId) continue
    if (card.name && !nameFromImport(card as DraftCard)) takenNames.add(norm(card.name))
    if (card.slug) takenSlugs.add(card.slug)
  }
  for (const slug of reservedSlugs) {
    takenSlugs.add(slug)
    if (!/\d/.test(slug)) takenNames.add(norm(slug))
  }
  return { takenNames, takenSlugs }
}
