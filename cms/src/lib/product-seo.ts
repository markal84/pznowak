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
 * Tytuł strony pierścionka: `<nazwa> — <kamień> w <złoto>`, bez brakujących części. Nigdy nie jest pusty, bo nazwa
 * jest wymagana. Bez kamienia: `<nazwa> — pierścionek w <złoto>`.
 */
export function productSeoTitle({ name, stone, metal }: ProductSeoSource): string {
  const title = name.trim()
  const stoneText = lcFirst(formatStone(stone ?? ''))
  const gold = goldInLocative(metal)
  if (stoneText && gold) return `${title} — ${stoneText} w ${gold}`
  if (stoneText) return `${title} — ${stoneText}`
  if (gold) return `${title} — pierścionek w ${gold}`
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
