import type { Jewel } from './collection'

export type StoneGroup = 'niebieskie' | 'zielone' | 'rozowe' | 'fioletowe' | 'zolte' | 'bezbarwne'
export type GoldGroup = 'zolte' | 'dwa' | 'biale'

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
  { id: 'zolte', label: 'Żółte' },
  { id: 'dwa', label: 'Żółte z białym' },
  { id: 'biale', label: 'Białe' },
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

export function goldGroup(metal: string): GoldGroup | null {
  const text = metal.toLowerCase()
  if (!text.trim()) return null
  if (/(żó|zo|żo|zó)łt.*bia|bia.*(żó|zo|żo|zó)łt/.test(text)) return 'dwa'
  if (/bia[łl]/.test(text)) return 'biale'
  return 'zolte'
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

export function formatMetal(metal: string): string {
  const text = metal.toLowerCase().trim()
  if (!text) return ''
  if (/(żó|zo|żo|zó)łt.*bia|bia.*(żó|zo|żo|zó)łt/.test(text)) return 'Żółte i białe złoto'
  if (/bia[łl]/.test(text)) return 'Białe złoto'
  if (/^(żó|zo|żo|zó)łt/.test(text)) return 'Żółte złoto'
  return sentence(metal)
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
  metal: string
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
export function pickByName(products: readonly Jewel[], names: readonly string[], limit: number): Jewel[] {
  const picked = names.map((n) => products.find((p) => p.name === n)).filter((p): p is Jewel => Boolean(p))
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
