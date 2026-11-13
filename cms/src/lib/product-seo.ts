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

/** Rzeczownik w narzędniku („diament” → „diamentem”, „perła” → „perłą”, „diamenty” → „diamentami”). */
function nounInstrumental(word: string): string {
  if (/y$/.test(word) && word.length > 4) return `${word.slice(0, -1)}ami`
  if (/a$/.test(word)) return `${word.slice(0, -1)}ą`
  if (/[kg]$/.test(word)) return `${word}iem`
  return `${word}em`
}

/** Przymiotnik w narzędniku, zgodny z rodzajem rzeczownika („niebieski” → „niebieskim”, „biała” → „białą”). */
function adjectiveInstrumental(word: string, feminine: boolean): string {
  if (feminine) return word.replace(/a$/, 'ą')
  return word.replace(/[yi]$/, (end) => `${end}m`)
}

/**
 * Kamień główny (pierwszy z listy) w narzędniku, do zwrotu „z …”: „Diament niebieski, Diament” → „niebieskim diamentem”,
 * „Topaz London Blue” → „topazem London Blue”. Kamienie boczne są pomijane (tytuł ma być krótki). Pusty tekst, gdy
 * zapisu nie da się bezpiecznie odmienić (cyfry, nawiasy, więcej niż dwa słowa).
 */
export function mainStoneInstrumental(stone: string | null | undefined): string {
  const main = (stone ?? '').split(/,|\s+i\s+|\s+oraz\s+|\+/i)[0]?.trim() ?? ''
  if (!main || /[^\p{L}\s-]/u.test(main)) return ''
  const [noun, ...rest] = main.split(/\s+/)
  const nounLower = noun.toLowerCase()
  const feminine = /a$/.test(nounLower)
  const instr = nounInstrumental(nounLower)
  if (!rest.length) return instr
  const tail = rest.join(' ')
  // Polski przymiotnik po rzeczowniku („diament niebieski”) idzie przed rzeczownik; nazwa własna („London Blue”) zostaje za nim.
  if (rest.length === 1 && /^\p{Ll}+(y|i|a)$/u.test(tail)) return `${adjectiveInstrumental(tail, feminine)} ${instr}`
  if (/^london blue$/i.test(tail)) return `${instr} London Blue`
  if (rest.length > 2) return ''
  return `${instr} ${tail}`
}

/** „z” albo „ze” przed zbitką spółgłosek: „ze szmaragdem”, ale „z szafirem”, „z diamentem”. */
function withPreposition(phrase: string): string {
  return /^(?:sz|rz|[sśzźż](?!z))[^aeiouyąęó]/i.test(phrase) ? `ze ${phrase}` : `z ${phrase}`
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
