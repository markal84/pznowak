/**
 * „Zamów z innym kamieniem” (zlecenie V): warianty kamienia na karcie pierścionka. Wariant to propozycja do rozmowy
 * (Michał dobiera kamień u dostawcy według dostępności), nie osobny produkt: bez ceny, bez `Offer` w danych strukturalnych.
 *
 * Wspólne dla panelu (lista kolorów kółek), serializacji danych strony i komponentu na karcie.
 */
import type { Media, Product } from '../payload-types'

export type SwatchId =
  | 'zielony'
  | 'niebieski'
  | 'granatowy'
  | 'jasnoniebieski'
  | 'fioletowy'
  | 'czerwony'
  | 'rozowy'
  | 'zolty'
  | 'bialy'

/**
 * Kolory kółek. Odcienie tej samej rodziny co kropki filtra kolorów na liście (`STONE_FILTERS` w `catalog.ts`),
 * dobrane tak, żeby kółka obok siebie dało się odróżnić (np. granat od niebieskiego i jasnoniebieskiego).
 */
export const SWATCHES: readonly { id: SwatchId; label: string; hex: string }[] = [
  { id: 'zielony', label: 'Zielony', hex: '#2F6B4F' },
  { id: 'niebieski', label: 'Niebieski', hex: '#2F4F8F' },
  { id: 'granatowy', label: 'Granatowy', hex: '#1E2A55' },
  { id: 'jasnoniebieski', label: 'Jasnoniebieski', hex: '#7FA8CF' },
  { id: 'fioletowy', label: 'Fioletowy', hex: '#6B4B8C' },
  { id: 'czerwony', label: 'Czerwony', hex: '#9E2235' },
  { id: 'rozowy', label: 'Różowy', hex: '#D98A9E' },
  { id: 'zolty', label: 'Żółty', hex: '#D2A92E' },
  { id: 'bialy', label: 'Biały', hex: '#FBFBF8' },
]

export const SWATCH_IDS = SWATCHES.map(({ id }) => id)

export function swatchHex(id: string | null | undefined): string {
  return SWATCHES.find((swatch) => swatch.id === id)?.hex ?? '#C9C6BD'
}

/**
 * Adres wariantu w `?kamien=`: „Różowy szafir i diamenty” → `rozowy-szafir-i-diamenty`. Polskie litery bez ogonków,
 * żeby link dało się przepisać i wkleić bez kodowania.
 */
export function stoneSlug(stone: string): string {
  return stone
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type StoneVariant = {
  /** `stoneSlug(stone)`; unikalny w obrębie karty (powtórzenie dostaje końcówkę `-2`). */
  slug: string
  stone: string
  swatch: SwatchId
  image: string
  alt: string
  isVisualization: boolean
}

type VariantEntry = NonNullable<Product['stoneVariants']>[number]

const populated = (asset: number | Media | null | undefined): Media | null =>
  typeof asset === 'object' && asset !== null ? asset : null

/** Warianty z Payload do danych strony: tylko kompletne (kamień, kolor z listy, obraz), z unikalnym adresem. */
export function serializeStoneVariants(entries: readonly VariantEntry[] | null | undefined): StoneVariant[] {
  const used = new Set<string>()
  const variants: StoneVariant[] = []
  for (const entry of entries ?? []) {
    const stone = entry.stone?.replace(/\s+/g, ' ').trim() ?? ''
    const image = populated(entry.image)?.url ?? ''
    const swatch = SWATCH_IDS.find((id) => id === entry.swatch)
    if (!stone || !image || !swatch) continue
    const base = stoneSlug(stone) || 'kamien'
    let slug = base
    for (let n = 2; used.has(slug); n += 1) slug = `${base}-${n}`
    used.add(slug)
    variants.push({
      slug,
      stone,
      swatch,
      image,
      alt: entry.alt?.trim() ?? '',
      // Brak wartości traktujemy jak wizualizację: etykieta „Wizualizacja” to bezpieczniejszy błąd niż jej brak.
      isVisualization: entry.isVisualization !== false,
    })
  }
  return variants
}

/** Wariant z parametru `?kamien=`; nieznany adres (np. wariant usunięty w panelu) = oryginał. */
export function findVariant(variants: readonly StoneVariant[], slug: string | null | undefined): StoneVariant | null {
  if (!slug) return null
  return variants.find((variant) => variant.slug === slug) ?? null
}

/** Kolor kółka oryginału: z nazwy kamienia na karcie („Szafir różowy, diament” → różowy). */
export function originalSwatch(stone: string): SwatchId {
  const text = stone.toLowerCase()
  const rules: [RegExp, SwatchId][] = [
    [/oliwk|oliwin|szmaragd|zielon|chryzopraz|awenturyn|peridot/, 'zielony'],
    [/ró[żz]ow|morganit/, 'rozowy'],
    // „Topaz London blue” to granat, nie zwykły niebieski: przy remisie pozycji wygrywa reguła wyżej na liście.
    [/topaz london|london|granatow|tanzanit/, 'granatowy'],
    [/topaz (sky|swiss)|sky|swiss|jasnoniebiesk|b[łl][ęe]kitn|akwamaryn/, 'jasnoniebieski'],
    [/szafir|topaz|niebiesk/, 'niebieski'],
    [/rubin|granat\b|czerwon/, 'czerwony'],
    [/ametyst|fiolet/, 'fioletowy'],
    [/cytryn|[żz][óo][łl]t/, 'zolty'],
  ]
  let best: { at: number; id: SwatchId } | null = null
  for (const [pattern, id] of rules) {
    const at = text.search(pattern)
    if (at !== -1 && (!best || at < best.at)) best = { at, id }
  }
  return best?.id ?? 'bialy'
}

/** Adres formularza z karty: nazwa projektu i (gdy wybrany wariant) kamień. */
export function inquiryHref(projectName: string, stone?: string | null): string {
  const params = new URLSearchParams({ temat: 'kolekcja', projekt: projectName })
  if (stone) params.set('kamien', stone)
  return `/kontakt?${params.toString()}`
}
