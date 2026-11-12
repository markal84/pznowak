/**
 * Ceny pierścionków (pole „Cena (zł)” w panelu). Jedno miejsce na format, żeby lista, karta i nagłówek katalogu
 * pokazywały cenę tak samo.
 *
 * „od” przed kwotą: na razie zostaje (cena dotyczy kamienia ze zdjęć, a rozmiar, złoto i kamień mogą ją zmienić).
 * Jeśli Marcin zdecyduje inaczej, wystarczy zmienić `PRICE_PREFIX` (pusty tekst = sama kwota).
 */
export const PRICE_PREFIX = 'od'

/** Przywieszka na liście i karcie bez ceny w panelu, a także po wyborze innego kamienia (warianty są bez ceny). */
export const PRICE_ON_REQUEST_SHORT = 'Na zapytanie'

/**
 * Kwota po polsku: liczby czterocyfrowe bez odstępu (2949), od 10 000 z odstępem nierozdzielającym co trzy cyfry.
 * Bez `Intl`, bo grupowanie zależy od wersji ICU w Node i przeglądarce, a tekst musi być wszędzie ten sam.
 */
function amount(value: number): string {
  const digits = String(value)
  return digits.length <= 4 ? digits : digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0')
}

/** Cena z panelu, gdy jest sensowna (dodatnia liczba); inaczej `null`. */
export function normalizePrice(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null
}

/** „od 2949 zł” (spacje nierozdzielające, żeby kwota nie łamała się na końcu wiersza); bez ceny pusty tekst. */
export function formatPrice(price: number | null | undefined, prefix: string = PRICE_PREFIX): string {
  const value = normalizePrice(price)
  if (value === null) return ''
  const text = `${amount(value)}\u00a0zł`
  return prefix ? `${prefix}\u00a0${text}` : text
}

/** Najniższa cena z listy (nagłówek katalogu: „Pierścionek z kolekcji od … zł”); bez cen `null`. */
export function lowestPrice(items: readonly { price: number | null }[]): number | null {
  const prices = items.map(({ price }) => normalizePrice(price)).filter((p): p is number => p !== null)
  return prices.length ? Math.min(...prices) : null
}
