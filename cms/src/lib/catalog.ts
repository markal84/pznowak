import type { PublicProduct as Jewel } from './public-products'

export type StoneGroup = 'niebieskie' | 'zielone' | 'rozowe' | 'fioletowe' | 'zolte' | 'bezbarwne'
export type GoldGroup = 'zolte' | 'zolte-biale' | 'biale'

/**
 * Jedyna lista kolorów złota: z niej budowany jest filtr na liście, wiersz „Złoto” na karcie i (po migracji pola
 * na select w CMS) lista wyboru w panelu. `id` to wartość zapisywana w danych, `label` widzi klient.
 */
export const GOLD_COLORS: readonly { id: GoldGroup; label: string; sentence: string }[] = [
  { id: 'zolte', label: 'Żółte', sentence: 'Żółte złoto' },
  { id: 'zolte-biale', label: 'Żółte z białym', sentence: 'Żółte i białe złoto' },
  { id: 'biale', label: 'Białe', sentence: 'Białe złoto' },
]

export const STONE_FILTERS: { id: 'all' | StoneGroup; label: string; color?: string }[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'niebieskie', label: 'Niebieskie', color: '#2F4F8F' },
  { id: 'zielone', label: 'Zielone', color: '#2F6B4F' },
  { id: 'rozowe', label: 'Czerwone i różowe', color: '#B24A5C' },
  { id: 'fioletowe', label: 'Fioletowe', color: '#6B4B8C' },
  { id: 'zolte', label: 'Żółte', color: '#D2A92E' },
  { id: 'bezbarwne', label: 'Bezbarwne', color: '#FBFBF8' },
]

export const GOLD_FILTERS: { id: 'all' | GoldGroup; label: string }[] = [
  { id: 'all', label: 'Każde' },
  ...GOLD_COLORS.map(({ id, label }) => ({ id, label })),
]

const STONE_RULES: [RegExp, StoneGroup][] = [
  [/oliwk/, 'zielone'],
  [/ró[żz]ow/, 'rozowe'],
  [/szafir|topaz|tanzanit|b[łl][ęe]kitn|london|niebiesk/, 'niebieskie'],
  [/szmaragd|zielon/, 'zielone'],
  [/rubin|morganit|czerwon/, 'rozowe'],
  [/ametyst|fiolet/, 'fioletowe'],
  [/cytryn|[żz][óo][łl]t/, 'zolte'],
]

/** Kolor kamienia głównego z opisu "Szafir i Diament"; sam diament to "bezbarwne". */
export function stoneGroup(stone: string): StoneGroup | null {
  const text = stone.toLowerCase()
  if (!text.trim()) return null
  for (const [pattern, group] of STONE_RULES) if (pattern.test(text)) return group
  return /diament/.test(text) ? 'bezbarwne' : null
}

/**
 * Kolor złota z wartości w danych: wartość z listy (`zolte`, `zolte-biale`, `biale`) albo starszy zapis tekstowy
 * („Żółty”, „Żołty”, „Żółty i biały”, „Biały”). Samo „Złoto” albo „Złoty” bez koloru to `null`: nie zgadujemy,
 * kolor trzeba ustalić (zlecenie K, pkt 4), do tego czasu pierścionek nie łapie się w filtr koloru złota.
 */
export function goldGroup(metal: string): GoldGroup | null {
  const text = metal.toLowerCase().trim()
  if (!text) return null
  const known = GOLD_COLORS.find(({ id }) => id === text)
  if (known) return known.id
  const yellow = /(żó|zo|żo|zó)łt/.test(text)
  const white = /bia[łl]/.test(text)
  if (yellow && white) return 'zolte-biale'
  if (white) return 'biale'
  if (yellow) return 'zolte'
  return null
}

/** Nazwa koloru złota z listy („Żółte z białym”), identyczna na karcie i w filtrze; pusta, gdy koloru nie znamy. */
export function goldColorLabel(metal: string): string {
  const group = goldGroup(metal)
  return GOLD_COLORS.find(({ id }) => id === group)?.label ?? ''
}

const sentence = (value: string) => {
  const flat = value.replace(/\s+/g, ' ').trim()
  return flat ? flat[0].toUpperCase() + flat.slice(1).toLowerCase() : flat
}

/** "Topaz London Blue, Diament" -> "Topaz london blue, diament" (zachowuje nazwy własne wg designu). */
export function formatStone(stone: string): string {
  return sentence(stone)
    .replace(/london blue/i, 'London Blue')
    .replace(/\bdiament\b/g, 'diamenty')
    .replace(/\bdiamenty,\s*diamenty/g, 'diamenty')
}

/** Opis złota w zdaniu („Żółte i białe złoto”), także w tytułach SEO; bez koloru zostaje samo „Złoto”. */
export function formatMetal(metal: string): string {
  if (!metal.trim()) return ''
  const group = goldGroup(metal)
  return GOLD_COLORS.find(({ id }) => id === group)?.sentence ?? sentence(metal)
}

export function pluralRing(count: number): string {
  if (count === 1) return 'pierścionek'
  const digit = count % 10
  const hundred = count % 100
  return digit >= 2 && digit <= 4 && (hundred < 12 || hundred > 14) ? 'pierścionki' : 'pierścionków'
}

export type CatalogRing = {
  id: number
  slug: string
  name: string
  stone: string
  /** opis w zdaniu („Żółte i białe złoto”), np. do podpisów */
  metal: string
  /** nazwa koloru z listy („Żółte z białym”), jak w filtrze; pusta, gdy koloru nie znamy */
  goldLabel: string
  stoneGroup: StoneGroup | null
  goldGroup: GoldGroup | null
  image: string
  alt: string
}

export function toCatalogRing(product: Jewel): CatalogRing {
  const stone = formatStone(product.stone)
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    stone,
    metal: formatMetal(product.metal),
    goldLabel: goldColorLabel(product.metal),
    stoneGroup: stoneGroup(product.stone),
    goldGroup: goldGroup(product.metal),
    image: product.images[0] ?? product.imagePath,
    alt: `Pierścionek ${product.name}${stone ? ': ' + stone.toLowerCase() : ''}`,
  }
}

export function filterRings(
  rings: readonly CatalogRing[],
  stone: 'all' | StoneGroup,
  gold: 'all' | GoldGroup,
): CatalogRing[] {
  return rings.filter(
    (ring) => (stone === 'all' || ring.stoneGroup === stone) && (gold === 'all' || ring.goldGroup === gold),
  )
}

/** Wybór pierścionków do sekcji "Pierścionki z pracowni" wg nazw z designu, uzupełniony kolejnymi. */
export function pickByName<T extends Jewel>(products: readonly T[], names: readonly string[], limit: number): T[] {
  const picked = names.map((n) => products.find((p) => p.name === n)).filter((p): p is T => Boolean(p))
  for (const p of products) {
    if (picked.length >= limit) break
    if (!picked.includes(p)) picked.push(p)
  }
  return picked.slice(0, limit)
}

export function similarTo(current: Jewel, products: readonly Jewel[], limit: number): Jewel[] {
  const group = stoneGroup(current.stone)
  const others = products.filter((p) => p.slug !== current.slug)
  const same = group ? others.filter((p) => stoneGroup(p.stone) === group) : []
  const rest = others.filter((p) => !same.includes(p))
  return [...same, ...rest].slice(0, limit)
}
