/**
 * Szlif kamienia głównego odczytany ze zdjęć kart (21.11.2026): dane z `seed/parametry/szlif-ze-zdjec.json` i czysta
 * logika planu (bez bazy), sprawdzana testem `tests/int/szlif.int.spec.ts`. Używa tego `scripts/staging-szlif.ts`.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { STONE_CUT_OPTIONS } from '../src/lib/ring-params'

export type CutSpec = { slug: string; szlif: string }
export type CutCard = { id: number; slug: string; stoneCut: string | null | undefined }
export type CutPlan =
  | { action: 'zmien'; id: number; stoneCut: string; note: string }
  | { action: 'juz' | 'pomin'; id?: number; note: string }

const here = path.dirname(fileURLToPath(import.meta.url))
/** Ścieżka, nie `URL`: w testach (jsdom) globalny `URL` nie jest tym z Node. */
export const CUTS_PATH = path.resolve(here, '../seed/parametry/szlif-ze-zdjec.json')

const CUT_VALUES = new Set<string>(STONE_CUT_OPTIONS.map((option) => option.value))

export function loadCuts(source: string = CUTS_PATH): CutSpec[] {
  const raw = JSON.parse(readFileSync(source, 'utf8')) as Record<string, unknown>
  if (!Array.isArray(raw.szlif)) throw new Error('szlif-ze-zdjec.json: brak listy „szlif”')
  const seen = new Set<string>()
  return raw.szlif.map((entry, index) => {
    const item = entry as Record<string, unknown>
    if (typeof item.slug !== 'string' || !item.slug.trim()) throw new Error(`szlif-ze-zdjec.json, pozycja ${index + 1}: brak „slug”`)
    if (typeof item.szlif !== 'string' || !CUT_VALUES.has(item.szlif)) {
      throw new Error(`szlif-ze-zdjec.json, ${item.slug}: nieznany szlif „${String(item.szlif)}”`)
    }
    if (seen.has(item.slug)) throw new Error(`szlif-ze-zdjec.json: „${item.slug}” występuje dwa razy`)
    seen.add(item.slug)
    return { slug: item.slug, szlif: item.szlif }
  })
}

/** Wpisuje szlif tylko w puste pole: ręcznie wpisanego w panelu nie nadpisuje. */
export function planCut(cards: readonly CutCard[], spec: CutSpec): CutPlan {
  const card = cards.find((c) => c.slug === spec.slug)
  if (!card) return { action: 'pomin', note: 'brak karty o tym adresie' }
  if (card.stoneCut === spec.szlif) return { action: 'juz', id: card.id, note: `już ${spec.szlif}` }
  if (card.stoneCut) return { action: 'pomin', id: card.id, note: `w panelu jest inny szlif (${card.stoneCut}), zostawiam` }
  return { action: 'zmien', id: card.id, stoneCut: spec.szlif, note: `szlif: ${spec.szlif}` }
}
