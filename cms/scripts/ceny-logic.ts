/**
 * Ceny pierścionków z OLX (zlecenie „ceny”): dane z `seed/ceny/ceny-olx.json` i czysta logika planu (bez bazy),
 * żeby dało się ją sprawdzić testem. Używa tego `scripts/staging-ceny.ts` (tylko staging) oraz
 * `tests/int/ceny.int.spec.ts`.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** `poprzednia`: cena, którą karta ma mieć teraz, żeby wolno ją było zmienić (np. Michał 1590 → 1600). */
export type PriceSpec = { name: string; price: number; uwaga?: string; poprzednia?: number }
export type UnmatchedPrice = { olx: string; price: number; pytanie: string }
export type PriceFile = { ceny: PriceSpec[]; bezKarty: UnmatchedPrice[] }

const here = path.dirname(fileURLToPath(import.meta.url))
/** Ścieżka, nie `URL`: w testach (jsdom) globalny `URL` nie jest tym z Node. */
export const PRICES_DIR = path.resolve(here, '../seed/ceny')
export const PRICES_PATH = path.resolve(PRICES_DIR, 'ceny-olx.json')

const isPrice = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 && value < 1_000_000

export function loadPrices(source: string = PRICES_PATH): PriceFile {
  const raw = JSON.parse(readFileSync(source, 'utf8')) as Record<string, unknown>
  if (!Array.isArray(raw.ceny)) throw new Error('ceny-olx.json: brak listy „ceny”')
  const seen = new Set<string>()
  const ceny = raw.ceny.map((entry, index) => {
    const item = entry as Record<string, unknown>
    if (typeof item.name !== 'string' || !item.name.trim()) throw new Error(`ceny-olx.json, pozycja ${index + 1}: brak „name”`)
    if (!isPrice(item.price)) throw new Error(`ceny-olx.json, ${item.name}: „price” musi być dodatnią liczbą całkowitą (zł)`)
    const key = nameKey(item.name)
    if (seen.has(key)) throw new Error(`ceny-olx.json: „${item.name}” występuje dwa razy`)
    seen.add(key)
    if (item.poprzednia !== undefined && !isPrice(item.poprzednia)) {
      throw new Error(`ceny-olx.json, ${item.name}: „poprzednia” musi być dodatnią liczbą całkowitą (zł)`)
    }
    return {
      name: item.name,
      price: item.price,
      ...(typeof item.uwaga === 'string' ? { uwaga: item.uwaga } : {}),
      ...(isPrice(item.poprzednia) ? { poprzednia: item.poprzednia } : {}),
    }
  })
  const bezKarty = Array.isArray(raw.bezKarty) ? (raw.bezKarty as UnmatchedPrice[]) : []
  return { ceny, bezKarty }
}

/** Nazwy kart porównujemy bez wielkości liter i zbędnych spacji („ Aria ” = „aria”). */
export function nameKey(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl')
}

export type PriceCard = { id: number; name: string; price?: number | null; status?: string | null }

export type PricePlan =
  | { action: 'zmien'; id: number; price: number; note: string }
  | { action: 'juz'; id: number; note: string }
  | { action: 'pomin'; note: string }

/**
 * Decyzja dla jednej ceny. Karta musi być dokładnie jedna (przy duplikatach nie zgadujemy). Ceny wpisanej wcześniej
 * inaczej (np. ręcznie w panelu) nie nadpisujemy, chyba że plik podaje ją jako `poprzednia` (świadoma zmiana ceny).
 * Drugie uruchomienie po `--apply` daje same „juz”.
 */
export function planPrice(cards: readonly PriceCard[], spec: PriceSpec): PricePlan {
  const matches = cards.filter((card) => nameKey(card.name) === nameKey(spec.name))
  if (matches.length === 0) return { action: 'pomin', note: 'nie ma karty o tej nazwie' }
  if (matches.length > 1) {
    return { action: 'pomin', note: `kilka kart o tej nazwie (${matches.map((c) => `#${c.id}`).join(', ')}), nie zgaduję` }
  }
  const [card] = matches
  if (card.price === spec.price) return { action: 'juz', id: card.id, note: `cena ${spec.price} zł już jest` }
  if (typeof card.price === 'number' && card.price > 0) {
    if (spec.poprzednia === card.price) {
      return { action: 'zmien', id: card.id, price: spec.price, note: `cena ${card.price} → ${spec.price} zł` }
    }
    return { action: 'pomin', note: `#${card.id} ma już inną cenę (${card.price} zł), nie nadpisuję ${spec.price} zł` }
  }
  return { action: 'zmien', id: card.id, price: spec.price, note: `cena ${spec.price} zł` }
}
