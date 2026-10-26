/**
 * Kontrola produkcyjnego buildu (zlecenie I, pkt 7): pobiera strony z działającego serwera i kończy się błędem,
 * jeśli w HTML zostały znaczniki „do uzupełnienia” (`[TERMIN…]`, `[X…]`, `[asortyment…]` i inne `[…]`).
 *
 *   VERCEL_ENV=production npm run build && VERCEL_ENV=production npm run start -- -p 3100
 *   npm run check:placeholders -- http://localhost:3100
 *
 * Środowisko produkcyjne musi być ustawione już przy `next build` (strony zapisują się przy budowaniu).
 * Na wdrożeniu podglądowym skrypt celowo zgłasza znaczniki (mają tam być widoczne).
 */
import { findPlaceholders } from '../src/lib/placeholders'

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '')
const PAGES = ['/', '/pierscionki', '/obraczki', '/na-zamowienie', '/naprawy', '/realizacje', '/pracownia', '/kontakt']

async function get(path: string): Promise<string> {
  const response = await fetch(base + path)
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`)
  return response.text()
}

const catalog = await get('/pierscionki')
const products = [...new Set([...catalog.matchAll(/href="(\/pierscionki\/[^"/?#]+)"/g)].map((m) => m[1]))].slice(0, 6)

let failed = 0
for (const path of [...PAGES, ...products]) {
  const html = path === '/pierscionki' ? catalog : await get(path)
  const found = findPlaceholders(html)
  if (found.length > 0 || html.includes('data-todo')) {
    failed += 1
    console.error(`✗ ${path}: ${[...new Set(found)].join(' | ') || 'znacznik data-todo'}`)
  } else {
    console.log(`✓ ${path}`)
  }
}
if (failed > 0) {
  console.error(`\n${failed} stron(y) ze znacznikami „do uzupełnienia”.`)
  process.exit(1)
}
