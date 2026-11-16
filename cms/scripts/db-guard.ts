// Bezpieczniki skryptów bazodanowych (od 17.11.2026 nazwy w Neonie są uporządkowane):
//   gałąź „production” = żywa baza pznowak.pl (endpoint ep-nameless-butterfly), plik backend/.env.production.local
//   gałąź „archiwum-2026-11” = stara baza sprzed przeprowadzki, plik backend/.env.local (NEON_BRANCH=archiwum)
// Sprawdzamy i nazwę z pliku .env, i endpoint w adresie bazy: sama nazwa już raz wprowadziła w błąd.
import { isLiveDatabase, LIVE_ENDPOINT } from './live-db'

/** Skrypt treści (karty, opisy, ceny, realizacje): działa tylko na żywej bazie i tylko z NEON_BRANCH=production. */
export function requireLiveDatabase(name: string): void {
  if (process.env.NEON_BRANCH !== 'production' || !isLiveDatabase()) {
    throw new Error(
      `${name}: to skrypt żywej bazy. Wymaga NEON_BRANCH=production i endpointu ${LIVE_ENDPOINT} (backend/.env.production.local).`,
    )
  }
}

/** Dane testowe (seed, sprzątanie zgłoszeń, testy bazodanowe): nigdy na żywej bazie, tylko na gałęzi NEON_BRANCH=test. */
export function refuseLiveDatabase(name: string): void {
  if (isLiveDatabase()) throw new Error(`STOP: ${name} nie może działać na żywej bazie (${LIVE_ENDPOINT}).`)
  if (process.env.NEON_BRANCH !== 'test') {
    throw new Error(`${name}: tylko na osobnej gałęzi testowej Neon (NEON_BRANCH=test). Takiej gałęzi dziś nie ma.`)
  }
}
