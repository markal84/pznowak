/**
 * Warianty kamieni na staging (zlecenie V): dane z `seed/warianty/warianty.json` i czysta logika planu (bez bazy),
 * żeby dało się ją sprawdzić testem. Używa tego `scripts/staging-warianty-v.ts` i `tests/int/warianty-v.int.spec.ts`.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SWATCH_IDS, stoneSlug, type SwatchId } from '../src/lib/stone-variants'

const here = path.dirname(fileURLToPath(import.meta.url))

/** Pliki zlecenia (`cms/seed/warianty`). Ścieżki, nie `URL`: w testach (jsdom) globalny `URL` nie jest tym z Node. */
export const WARIANTY_DIR = path.resolve(here, '../seed/warianty')
export const SPECS_PATH = path.join(WARIANTY_DIR, 'warianty.json')
export const IMAGES_DIR = path.join(WARIANTY_DIR, 'obrazy')

/** Obrazy z seeda rozpoznajemy w Media po `legacySourceUrl`, jak w seedzie realizacji. */
export const SOURCE_PREFIX = 'seed://warianty/'
export const sourceKey = (file: string) => `${SOURCE_PREFIX}${file}`
/** Podmieniony obraz dostaje własny klucz (skrót pliku), więc nie myli się ze starym Media tego samego pliku. */
export const replacementKey = (file: string, hash: string) => `${sourceKey(file)}#${hash}`
export const MAX_IMAGE_BYTES = 300 * 1024

/**
 * `files`: obrazy wariantu w kolejności zdjęć karty (zlecenie Y) – pierwszy zastępuje 1. zdjęcie, drugi 2. itd.
 * W JSON-ie można dalej podać jeden `file` (V/W): to lista jednoelementowa, wariant pokazuje wtedy tylko ten obraz.
 */
export type VariantSpec = {
  stone: string
  swatch: SwatchId
  files: string[]
  alt: string
  isVisualization: boolean
}

/**
 * Poprawka danych karty (Leto: morganit, Aion: niebieskie i białe diamenty). Strażnik `onlyIfStone`: zmieniamy tylko
 * kartę, która ma jeszcze dawny kamień, więc ręczna poprawka w panelu nie zostanie nadpisana.
 */
export type CardFix = {
  onlyIfStone: string[]
  stone: string
  lead?: string
  description?: string
  /** Opis alternatywny wszystkich plików z „Zdjęcia i filmy” (te, które jeszcze go nie mają). */
  mediaAlt?: string
}

/** `removeStones`: warianty do usunięcia z karty (po nazwie kamienia), np. gdy wariant dubluje oryginał. */
export type CardSpec = { slug: string; name: string; card?: CardFix; variants: VariantSpec[]; removeStones: string[] }

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const norm = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

export function loadSpecs(source: string = SPECS_PATH): CardSpec[] {
  const raw: unknown = JSON.parse(readFileSync(source, 'utf8'))
  if (!Array.isArray(raw)) throw new Error('warianty.json: oczekiwana lista kart')
  return raw.map((entry, index) => {
    const item = entry as Record<string, unknown>
    const where = `warianty.json, pozycja ${index + 1}`
    if (!isText(item.slug) || !isText(item.name)) throw new Error(`${where}: brak „slug” albo „name”`)
    if (!Array.isArray(item.variants)) throw new Error(`${where}: „variants” musi być listą`)
    const slugs = new Set<string>()
    const variants = item.variants.map((v, i) => {
      const variant = v as Record<string, unknown>
      const at = `${where}, wariant ${i + 1}`
      const files = variant.files ?? (variant.file === undefined ? undefined : [variant.file])
      if (variant.files !== undefined && variant.file !== undefined) throw new Error(`${at}: podaj „file” albo „files”, nie oba`)
      if (!isText(variant.stone) || !isText(variant.alt) || !Array.isArray(files) || !files.length || !files.every(isText)) {
        throw new Error(`${at}: wymagane „stone”, „files” (albo „file”) i „alt”`)
      }
      if (new Set(files).size !== files.length) throw new Error(`${at}: ten sam obraz dwa razy w „files”`)
      if (!SWATCH_IDS.includes(variant.swatch as SwatchId)) {
        throw new Error(`${at}: „swatch” spoza listy (${SWATCH_IDS.join(', ')})`)
      }
      if (typeof variant.isVisualization !== 'boolean') throw new Error(`${at}: „isVisualization” musi być true/false`)
      const slug = stoneSlug(variant.stone)
      if (slugs.has(slug)) throw new Error(`${at}: dwa warianty dają ten sam adres ?kamien=${slug}`)
      slugs.add(slug)
      return {
        stone: variant.stone.trim(),
        swatch: variant.swatch as SwatchId,
        files: files as string[],
        alt: variant.alt.trim(),
        isVisualization: variant.isVisualization,
      }
    })
    let card: CardFix | undefined
    if (item.card !== undefined) {
      const c = item.card as Record<string, unknown>
      if (!Array.isArray(c.onlyIfStone) || !c.onlyIfStone.every(isText) || !isText(c.stone)) {
        throw new Error(`${where}: „card” wymaga „onlyIfStone” (lista) i „stone”`)
      }
      for (const key of ['lead', 'description', 'mediaAlt'] as const) {
        if (c[key] !== undefined && !isText(c[key])) throw new Error(`${where}: „card.${key}” musi być tekstem`)
      }
      card = {
        onlyIfStone: c.onlyIfStone as string[],
        stone: c.stone,
        lead: c.lead as string | undefined,
        description: c.description as string | undefined,
        mediaAlt: c.mediaAlt as string | undefined,
      }
    }
    if (item.removeStones !== undefined && (!Array.isArray(item.removeStones) || !item.removeStones.every(isText))) {
      throw new Error(`${where}: „removeStones” musi być listą nazw kamieni`)
    }
    const removeStones = ((item.removeStones as string[] | undefined) ?? []).map((stone) => stone.trim())
    for (const stone of removeStones) {
      if (variants.some((variant) => norm(variant.stone) === norm(stone))) {
        throw new Error(`${where}: „${stone}” jest jednocześnie w „variants” i „removeStones”`)
      }
    }
    return { slug: item.slug, name: item.name, card, variants, removeStones }
  })
}

/** Brakujące albo za duże obrazy (przed dotknięciem bazy). */
export function checkImages(specs: readonly CardSpec[], dir: string = IMAGES_DIR): string[] {
  const problems: string[] = []
  for (const spec of specs) {
    for (const name of spec.variants.flatMap((variant) => variant.files)) {
      const file = path.join(dir, name)
      if (!existsSync(file)) problems.push(`${spec.slug}: brak pliku seed/warianty/obrazy/${name}`)
      else if (!name.endsWith('.webp')) problems.push(`${spec.slug}: ${name} nie jest webp`)
      else if (statSync(file).size > MAX_IMAGE_BYTES) problems.push(`${spec.slug}: ${name} ma ponad 300 KB`)
    }
  }
  return problems
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Warianty */

/**
 * Wariant zapisany na karcie. `files`: plik z seeda dla każdego obrazu (główny, potem „Kolejne obrazy”);
 * `null` = obraz spoza seeda (wgrany w panelu). Klucz po `--podmien-obraz` (`<plik>#<skrót>`) to nadal ten plik.
 */
export type CurrentVariant = { files: (string | null)[]; stone: string }

/** Plik z seeda z `legacySourceUrl` Media (`seed://warianty/<plik>` albo `…#<skrót>`), inaczej `null`. */
export function seedFile(legacySourceUrl: string | null | undefined): string | null {
  if (!legacySourceUrl?.startsWith(SOURCE_PREFIX)) return null
  return legacySourceUrl.slice(SOURCE_PREFIX.length).split('#')[0] || null
}

const sameVariant = (variant: CurrentVariant, spec: VariantSpec) =>
  (variant.files[0] !== null && variant.files[0] === spec.files[0]) || norm(variant.stone) === norm(spec.stone)

/**
 * Które warianty z JSON-a trzeba dopisać. Istniejących nie dublujemy (Michał mógł poprawić nazwę albo alt w panelu),
 * ręcznie dodane w panelu zostają. Wariant uznajemy za obecny, gdy ma ten sam główny obraz z seeda albo tę samą nazwę kamienia.
 */
export function missingVariants(current: readonly CurrentVariant[], specs: readonly VariantSpec[]): VariantSpec[] {
  return specs.filter((spec) => !current.some((variant) => sameVariant(variant, spec)))
}

export type ImagePlan = { action: 'zostaw' | 'podmien' | 'reczne'; note: string }

/**
 * Obrazy istniejącego wariantu względem JSON-a (zlecenie Y: cała galeria). Podmieniamy listę obrazów tylko wtedy,
 * gdy wszystkie obecne są z seeda – obraz wgrany ręcznie w panelu zostaje (`reczne`). Nazwa, kolor kółka i alt
 * wariantu się nie zmieniają.
 */
export function planVariantImages(current: CurrentVariant, spec: VariantSpec): ImagePlan {
  const same = current.files.length === spec.files.length && current.files.every((file, i) => file === spec.files[i])
  if (same) return { action: 'zostaw', note: `${spec.files.length} obr.` }
  if (current.files.some((file) => file === null)) {
    return { action: 'reczne', note: `„${current.stone}”: obraz wgrany w panelu, nie podmieniam (${spec.files.length} obr. w seedzie)` }
  }
  return { action: 'podmien', note: `„${current.stone}”: ${current.files.length} → ${spec.files.length} obr.` }
}

/** `--podmien-obraz <slug>:<kamień>`; kamień porównujemy jak nazwy wariantów (bez wielkości liter i nadmiarowych spacji). */
export function parseReplaceArg(value: string | undefined): { slug: string; stone: string } {
  const at = (value ?? '').indexOf(':')
  const slug = (value ?? '').slice(0, at).trim()
  const stone = (value ?? '').slice(at + 1).trim()
  if (at < 1 || !stone) throw new Error('--podmien-obraz wymaga <slug>:<kamień>, np. aion:Szafir granatowy i diamenty')
  return { slug, stone }
}

/** Wariant do podmiany obrazu: ten o danej nazwie kamienia. */
export function findReplaceTarget<T extends { stone: string }>(variants: readonly T[], stone: string): T | undefined {
  return variants.find((variant) => norm(variant.stone) === norm(stone))
}

/** Warianty z karty, które zostają po usunięciu `removeStones` (porównanie nazw bez wielkości liter i spacji). */
export function keptVariants<T extends { stone: string }>(current: readonly T[], removeStones: readonly string[]): T[] {
  return current.filter((variant) => !removeStones.some((stone) => norm(stone) === norm(variant.stone)))
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Poprawka danych karty */

export type CardState = {
  stone?: string | null
  lead?: string | null
  description?: string | null
  media?: readonly { alt?: string | null }[] | null
}

export type CardPlan =
  | { action: 'zmien'; data: { stone: string; lead?: string; description?: string }; mediaAlt?: string; note: string }
  | { action: 'juz'; note: string }
  | { action: 'pomin'; note: string }

export function planCardFix(card: CardState, fix: CardFix): CardPlan {
  if (norm(card.stone) === norm(fix.stone)) return { action: 'juz', note: `kamień już „${fix.stone}”` }
  if (!fix.onlyIfStone.some((stone) => norm(stone) === norm(card.stone))) {
    return {
      action: 'pomin',
      note: `kamień „${card.stone ?? ''}” zmieniony ręcznie (oczekiwany „${fix.onlyIfStone.join('” / „')}”), nie nadpisuję`,
    }
  }
  const data: { stone: string; lead?: string; description?: string } = { stone: fix.stone }
  const fields = ['stone']
  if (fix.lead && card.lead?.trim() !== fix.lead) {
    data.lead = fix.lead
    fields.push('lead')
  }
  if (fix.description && card.description?.trim() !== fix.description) {
    data.description = fix.description
    fields.push('description')
  }
  const altCount = fix.mediaAlt ? (card.media ?? []).filter((entry) => !norm(entry.alt).includes(norm(fix.stone).split(' ')[0])).length : 0
  if (altCount) fields.push(`alt ${altCount} plików`)
  return {
    action: 'zmien',
    data,
    mediaAlt: altCount ? fix.mediaAlt : undefined,
    note: `„${card.stone ?? ''}” → „${fix.stone}” (${fields.join(', ')})`,
  }
}

/**
 * Alt plików z „Zdjęcia i filmy” po poprawce: nadpisujemy tylko te, które nie wymieniają nowego kamienia
 * (pierwsze słowo, np. „morganit”), więc ręcznie dopisany alt z właściwym kamieniem zostaje.
 */
export function fixMediaAlts<T extends { alt?: string | null }>(media: readonly T[], fix: CardFix): T[] {
  if (!fix.mediaAlt) return [...media]
  const key = norm(fix.stone).split(' ')[0]
  return media.map((entry) => (norm(entry.alt).includes(key) ? entry : { ...entry, alt: fix.mediaAlt }))
}
