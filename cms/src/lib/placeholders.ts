import { isIndexable } from './indexing'

/**
 * Znaczniki „do uzupełnienia” (np. `[TERMIN, np. 4–6 tygodni]`, `od [X] zł`) widać tylko poza produkcją:
 * na podglądach Vercela i lokalnie. Produkcja (`SITE_ENV` albo `VERCEL_ENV` = `production`, jak w `indexing.ts`)
 * dostaje neutralną wersję tekstu albo pomija zdanie, wiersz lub całą sekcję. Dla każdego miejsca wersję
 * produkcyjną wybiera się przy użyciu: `byEnv(podgląd, produkcja)` albo `<DoUzupelnienia fallback={…}>`.
 *
 * Wywołuj w trakcie renderowania (nie w stałej modułu), żeby test mógł przełączyć środowisko.
 * Wartość trafia do stron zapisanych przy budowaniu, więc środowisko musi być ustawione już podczas `next build`.
 * Test: `tests/int/placeholders.int.spec.ts` oraz `npm run check:placeholders` (sprawdza HTML działającego serwera).
 */
export function showPlaceholders(): boolean {
  return !isIndexable()
}

/** Wartość dla podglądu albo dla produkcji. Dla tekstów w propsach i danych; w JSX wygodniejsze jest `<DoUzupelnienia>`. */
export function byEnv<T>(preview: T, production: T): T {
  return showPlaceholders() ? preview : production
}

/**
 * Wyszukuje w HTML znaczniki „do uzupełnienia” widoczne dla klienta: nawiasy kwadratowe z treścią w tekście
 * strony (bez skryptów, stylów i atrybutów). Używane przez test i skrypt kontrolny produkcji.
 */
export function findPlaceholders(html: string): string[] {
  const text = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
  return [...text.matchAll(/\[[^\]\n]{1,160}\]/g)].map((m) => m[0])
}
