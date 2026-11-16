import { formatMetal, formatStone } from './catalog'

type ProductSeoSource = {
  name: string
  stone?: string | null
  metal?: string | null
  lead?: string | null
}

const lcFirst = (value: string) => (value ? value[0].toLowerCase() + value.slice(1) : value)

/** „Żółte i białe złoto” → „żółtym i białym złocie”; nieznany metal → pusty tekst (część tytułu jest pomijana). */
export function goldInLocative(metal: string | null | undefined): string {
  const nominative = formatMetal(metal ?? '')
  if (!nominative) return ''
  if (nominative === 'Żółte i białe złoto') return 'żółtym i białym złocie'
  if (nominative === 'Białe złoto') return 'białym złocie'
  if (nominative === 'Żółte złoto') return 'żółtym złocie'
  return /z[łl]ot/i.test(nominative) ? 'złocie' : ''
}

/**
 * Rdzenie nazw kamieni. Rzeczownik w zapisie kamienia rozpoznajemy po rdzeniu, a nie po pozycji, bo w panelu bywa
 * „Szafir różowy”, ale też „Różowy szafir” (wtedy pierwszym słowem jest przymiotnik).
 */
const STONE_NOUNS =
  /^(diament|brylant|szafir|rubin|szmaragd|topaz|tanzanit|ametyst|cytryn|turmalin|morganit|oliwin|perydot|granat|akwamaryn|agat|opal|spinel|cyrkon|moissanit|kwarc|onyks|turkus|labradoryt|kamie[nń]|perł)(?:a|y|e|i|ie)?$/

const isStoneNoun = (word: string) => STONE_NOUNS.test(word)
const isPlural = (word: string) => /(?:y|e|i|ie)$/.test(word) && !/^kamie[nń]$/.test(word) && !/^perła$/.test(word)

/** Rzeczownik w narzędniku („diament” → „diamentem”, „perła” → „perłą”, „diamenty” → „diamentami”, „kamień” → „kamieniem”). */
function nounInstrumental(word: string): string {
  if (/^kamie[nń]$/.test(word)) return 'kamieniem'
  if (/^kamienie$/.test(word)) return 'kamieniami'
  if (/(?:y|e|i)$/.test(word)) return `${word.slice(0, -1)}ami`
  if (/a$/.test(word)) return `${word.slice(0, -1)}ą`
  if (/[kg]$/.test(word)) return `${word}iem`
  return `${word}em`
}

/**
 * Przymiotnik w narzędniku, zgodny z rodzajem i liczbą rzeczownika („niebieski” → „niebieskim”, „biała” → „białą”,
 * „niebieskie” → „niebieskimi”). Pusty tekst, gdy słowo nie wygląda na przymiotnik.
 */
function adjectiveInstrumental(word: string, feminine: boolean, plural: boolean): string {
  if (plural) {
    if (/[kg]ie$/.test(word)) return `${word.slice(0, -1)}mi`
    if (/e$/.test(word)) return `${word.slice(0, -1)}ymi`
    return ''
  }
  if (feminine) return /a$/.test(word) ? word.replace(/a$/, 'ą') : ''
  return /[yi]$/.test(word) ? `${word}m` : ''
}

/**
 * Kamień główny (pierwszy z listy) w narzędniku, do zwrotu „z …”: „Diament niebieski, Diament” → „niebieskim diamentem”,
 * „Różowy szafir i diamenty” → „różowym szafirem”, „Topaz London Blue” → „topazem London Blue”. Kamienie boczne są
 * pomijane (tytuł ma być krótki). Pusty tekst, gdy zapisu nie da się bezpiecznie odmienić (cyfry, nawiasy, nieznany
 * kamień, więcej niż jeden przymiotnik) – wtedy tytuł zostawia kamień w mianowniku.
 */
export function mainStoneInstrumental(stone: string | null | undefined): string {
  const main = (stone ?? '').split(/,|\s+i\s+|\s+oraz\s+|\+/i)[0]?.trim() ?? ''
  if (!main || /[^\p{L}\s-]/u.test(main)) return ''
  const words = main.split(/\s+/)
  const lower = words.map((w) => w.toLowerCase())
  const nounAt = lower.findIndex(isStoneNoun)
  if (nounAt < 0) return ''
  const noun = lower[nounAt]
  const instr = nounInstrumental(noun)
  const feminine = /a$/.test(noun)
  const plural = isPlural(noun)
  const before = lower.slice(0, nounAt)
  const after = words.slice(nounAt + 1)
  const tail = after.join(' ')
  // Nazwa własna odmiany („London Blue”) zostaje za rzeczownikiem w niezmienionej postaci.
  if (!before.length && /^london blue$/i.test(tail)) return `${instr} London Blue`
  // Polski przymiotnik idzie przed rzeczownik, niezależnie od tego, czy w panelu stał przed nim, czy za nim.
  const adjectives = [...before, ...after.map((w) => w.toLowerCase())]
  if (adjectives.length > 1) return ''
  if (!adjectives.length) return instr
  const adj = adjectiveInstrumental(adjectives[0], feminine, plural)
  return adj ? `${adj} ${instr}` : ''
}

/** „z” albo „ze” przed zbitką spółgłosek: „ze szmaragdem”, ale „z szafirem”, „z diamentem”. */
function withPreposition(phrase: string): string {
  return /^(?:sz|rz|[sśzźż](?!z))[^aeiouyąęó]/i.test(phrase) ? `ze ${phrase}` : `z ${phrase}`
}

/** „z ametystem”, „ze szmaragdem”; pusty tekst, gdy kamienia głównego nie da się bezpiecznie odmienić. */
export function productStonePhrase(stone: string | null | undefined): string {
  const instr = mainStoneInstrumental(stone)
  return instr ? withPreposition(instr) : ''
}

/**
 * Tytuł strony pierścionka pod frazy, których szukają klienci: `Pierścionek <nazwa> z <kamień>, <złoto>`, np.
 * „Pierścionek Cyane z niebieskim diamentem, żółte złoto”. Brakujące części są pomijane; bez kamienia
 * `Pierścionek <nazwa> w <złoto>`. Gdy kamienia nie da się odmienić, zostaje w mianowniku po myślniku.
 * Nigdy nie jest pusty, bo nazwa jest wymagana. Pole „tytuł SEO” z panelu ma pierwszeństwo (strona karty).
 */
export function productSeoTitle({ name, stone, metal }: ProductSeoSource): string {
  const title = `Pierścionek ${name.trim()}`
  const stoneInstr = mainStoneInstrumental(stone)
  const stoneText = lcFirst(formatStone(stone ?? ''))
  const goldLoc = goldInLocative(metal)
  // Złoto w mianowniku tylko wtedy, gdy rozpoznany jest metal (jak w goldInLocative): „Złoty” z panelu → „złoto”.
  const gold = !goldLoc ? '' : goldLoc === 'złocie' ? 'złoto' : lcFirst(formatMetal(metal ?? ''))
  if (stoneInstr) return `${title} ${withPreposition(stoneInstr)}${gold ? `, ${gold}` : ''}`
  if (stoneText) return gold ? `${title} — ${stoneText}, ${gold}` : `${title} — ${stoneText}`
  if (goldLoc) return `${title} w ${goldLoc}`
  return title
}

/**
 * Opis strony pierścionka: krótki opis (`lead`), a gdy pusty zdanie złożone z nazwy, kamienia i złota. Kamień i złoto
 * są w mianowniku (po dwukropku), bo nazwy kamieni z katalogu nie dają się poprawnie odmienić automatycznie.
 */
export function productSeoDescription({ name, stone, metal, lead }: ProductSeoSource): string {
  const own = lead?.replace(/\s+/g, ' ').trim()
  if (own) return own
  const details = [lcFirst(formatStone(stone ?? '')), lcFirst(formatMetal(metal ?? ''))].filter(Boolean).join(', ')
  return `Pierścionek ${name.trim()}${details ? `: ${details}` : ''}. Ręcznie wykonany w pracowni Michała Nowaka w Busku-Zdroju.`
}

/** Adres strony pierścionka w serwisie (ścieżka). */
export const productPath = (slug: string) => `/pierscionki/${slug}`
