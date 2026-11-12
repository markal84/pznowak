import type { ProductPriceFields, PublicProduct as Jewel } from './public-products'

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
  [/oliwk|oliwin/, 'zielone'],
  [/ró[żz]ow/, 'rozowe'],
  [/szafir|topaz|tanzanit|b[łl][ęe]kitn|london|niebiesk/, 'niebieskie'],
  [/szmaragd|zielon/, 'zielone'],
  [/rubin|morganit|granat|czerwon/, 'rozowe'],
  [/ametyst|fiolet/, 'fioletowe'],
  [/cytryn|[żz][óo][łl]t/, 'zolte'],
  [/bezbarw/, 'bezbarwne'],
]

/** Kamienie o wielu barwach: żaden kolor filtra nie jest prawdziwy, więc pierścionek zostaje tylko w „Wszystkie”. */
const MULTICOLOR = /mystic|wielobarw|r[óo][żz]nokolor/

/**
 * Kolor kamienia głównego z opisu "Szafir i Diament"; sam diament to "bezbarwne". Kamień główny to ten wymieniony
 * pierwszy („Szmaragd i szafiry kolorowe” → zielone), a nie pierwszy z listy reguł.
 */
export function stoneGroup(stone: string): StoneGroup | null {
  const text = stone.toLowerCase()
  if (!text.trim() || MULTICOLOR.test(text)) return null
  let best: { at: number; group: StoneGroup } | null = null
  for (const [pattern, group] of STONE_RULES) {
    const at = text.search(pattern)
    if (at !== -1 && (!best || at < best.at)) best = { at, group }
  }
  if (best) return best.group
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

/** Opis z panelu podzielony na akapity (pusta linia = nowy akapit); pojedyncze złamania linii zostają spacją. */
export function descriptionParagraphs(text: string | null | undefined): string[] {
  return (text ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
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
  /** cena z panelu w zł; `null` = bez ceny (na liście nic) */
  price: number | null
  /** dzień dodania karty w panelu (`RRRR-MM-DD`, czas polski); pusty, gdy daty nie znamy */
  addedOn: string
}

/** Dzień (czas polski) z daty ISO, np. `2026-11-12`; pusty przy braku albo błędnej dacie. */
export function addedDay(iso: string | null | undefined): string {
  const date = new Date(iso ?? '')
  if (!iso || Number.isNaN(date.getTime())) return ''
  // Szwedzki zapis daty to RRRR-MM-DD.
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(date)
}

export function toCatalogRing(
  product: Jewel & Partial<ProductPriceFields> & { createdAt?: string },
): CatalogRing {
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
    price: product.price ?? null,
    addedOn: addedDay(product.createdAt),
  }
}

export function filterRings(
  rings: readonly CatalogRing[],
  stone: 'all' | StoneGroup,
  gold: 'all' | GoldGroup,
): CatalogRing[] {
  return rings.filter(
    (ring) =>
      (stone === 'all' || ring.stoneGroup === stone) && (gold === 'all' || ring.goldGroup === gold),
  )
}

/** Ile pierścionków na stronie listy. */
export const CATALOG_PAGE_SIZE = 40

export type CatalogSort = 'polecane' | 'najnowsze' | 'cena-rosnaco' | 'cena-malejaco'

/**
 * Sortowanie listy. „Polecane” = kolejność z panelu (pole „Kolejność”) i jest domyślne, więc nie trafia do adresu.
 * Pierścionki bez ceny („Na zapytanie”) przy sortowaniu po cenie stoją zawsze na końcu, w kolejności z panelu.
 */
export const CATALOG_SORTS: readonly { id: CatalogSort; label: string }[] = [
  { id: 'polecane', label: 'Polecane' },
  { id: 'najnowsze', label: 'Najnowsze' },
  { id: 'cena-rosnaco', label: 'Cena: od najniższej' },
  { id: 'cena-malejaco', label: 'Cena: od najwyższej' },
]

/**
 * Lista ułożona wg wybranego sortowania. Wejście jest już w kolejności z panelu i przy remisie ta kolejność zostaje
 * (np. dwie karty w tej samej cenie albo dodane tego samego dnia). „Najnowsze” porównuje dzień dodania, a nie
 * godzinę: karty z jednego importu mają czasy różniące się o sekundy i bez tego stałyby w przypadkowym porządku.
 */
export function sortRings(rings: readonly CatalogRing[], sort: CatalogSort): CatalogRing[] {
  const list = [...rings]
  if (sort === 'najnowsze') {
    // Puste daty (nieznane) na końcu; RRRR-MM-DD porównuje się jak tekst.
    return list.sort((a, b) => (b.addedOn || '').localeCompare(a.addedOn || ''))
  }
  if (sort === 'cena-rosnaco' || sort === 'cena-malejaco') {
    const direction = sort === 'cena-rosnaco' ? 1 : -1
    return list.sort((a, b) => {
      if (a.price === null || b.price === null)
        return (a.price === null ? 1 : 0) - (b.price === null ? 1 : 0)
      return (a.price - b.price) * direction
    })
  }
  return list
}

export type CatalogParams = {
  stone: 'all' | StoneGroup
  gold: 'all' | GoldGroup
  page: number
  sort: CatalogSort
}

/** Odczyt filtrów, sortowania i strony z adresu (`?kamien=…&zloto=…&sortuj=…&strona=N`); nieznane wartości wracają do domyślnych. */
export function parseCatalogParams(get: (key: string) => string | null | undefined): CatalogParams {
  const stoneRaw = get('kamien')
  const goldRaw = get('zloto')
  const sortRaw = get('sortuj')
  const pageRaw = Number.parseInt(get('strona') ?? '', 10)
  return {
    stone: STONE_FILTERS.some((s) => s.id === stoneRaw && s.id !== 'all')
      ? (stoneRaw as StoneGroup)
      : 'all',
    gold: GOLD_FILTERS.some((g) => g.id === goldRaw && g.id !== 'all')
      ? (goldRaw as GoldGroup)
      : 'all',
    page: Number.isFinite(pageRaw) && pageRaw > 1 ? pageRaw : 1,
    sort: CATALOG_SORTS.find(({ id }) => id === sortRaw)?.id ?? 'polecane',
  }
}

/** Adres listy dla danych filtrów, sortowania i strony; wartości domyślne nie trafiają do adresu. */
export function catalogHref({
  stone,
  gold,
  page,
  sort = 'polecane',
}: Omit<CatalogParams, 'sort'> & { sort?: CatalogSort }): string {
  const query = new URLSearchParams()
  if (stone !== 'all') query.set('kamien', stone)
  if (gold !== 'all') query.set('zloto', gold)
  if (sort !== 'polecane') query.set('sortuj', sort)
  if (page > 1) query.set('strona', String(page))
  const text = query.toString()
  return text ? `/pierscionki?${text}` : '/pierscionki'
}

/** Wycinek jednej strony; numer strony poza zakresem jest przycinany do ostatniej. */
export function paginate<T>(items: readonly T[], page: number, size: number = CATALOG_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, page), pages)
  return { items: items.slice((current - 1) * size, current * size), page: current, pages }
}

/** Wybór pierścionków do sekcji "Pierścionki z pracowni" wg nazw z designu, uzupełniony kolejnymi. */
export function pickByName<T extends Jewel>(
  products: readonly T[],
  names: readonly string[],
  limit: number,
): T[] {
  const picked = names
    .map((n) => products.find((p) => p.name === n))
    .filter((p): p is T => Boolean(p))
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
