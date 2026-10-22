/**
 * Zapisuje tabelę przekierowań w docs/seo/przekierowania.md na podstawie src/lib/legacy-redirects.ts.
 * Użycie: `npm run seo:redirects-doc` (test tests/int/legacy-redirects.int.spec.ts pilnuje zgodności).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import {
  GSC_INDEXED_PATHS,
  LEGACY_REDIRECTS,
  LEGACY_UNCHANGED_PAGES,
  LEGACY_WITHOUT_COUNTERPART,
} from '../src/lib/legacy-redirects'

const docPath = fileURLToPath(new URL('../../docs/seo/przekierowania.md', import.meta.url))
const START = '<!-- tabela:start -->'
const END = '<!-- tabela:end -->'
const BRAK_ODPOWIEDNIKA_START = '<!-- brak:start -->'
const BRAK_ODPOWIEDNIKA_END = '<!-- brak:end -->'

const gsc = new Set<string>(GSC_INDEXED_PATHS)
const originLabel = { static: 'mapa witryny', wordpress: 'WordPress' } as const

export function redirectsTable(): string {
  const rows = [
    '| Stary adres | Nowy adres | Źródło adresu | W Google | Powód |',
    '| --- | --- | --- | --- | --- |',
    ...LEGACY_UNCHANGED_PAGES.map(
      (path) => `| \`${path}\` | \`${path}\` | mapa witryny | ${gsc.has(path) ? 'tak' : 'nie'} | Ten sam adres; wersja ze skośnikiem na końcu (\`${path === '/' ? '/' : path + '/'}\`) ${path === '/' ? 'to ta sama strona' : 'idzie jednym skokiem na adres bez skośnika'}. |`,
    ),
    ...LEGACY_REDIRECTS.map(
      ({ from, to, origin, reason }) =>
        `| \`${from}\` | \`${to}\` | ${originLabel[origin]} | ${gsc.has(from) ? 'tak' : 'nie'} | ${reason} |`,
    ),
  ]
  return rows.join('\n')
}

export function withoutCounterpartTable(): string {
  return [
    '| Stary adres | Co z nim |',
    '| --- | --- |',
    ...LEGACY_WITHOUT_COUNTERPART.map(({ path, note }) => `| \`${path}\` | 404. ${note} |`),
  ].join('\n')
}

function replaceBetween(text: string, start: string, end: string, body: string): string {
  const from = text.indexOf(start)
  const to = text.indexOf(end)
  if (from === -1 || to === -1) throw new Error(`Brak znaczników ${start} / ${end} w ${docPath}`)
  return `${text.slice(0, from + start.length)}\n${body}\n${text.slice(to)}`
}

const text = await readFile(docPath, 'utf8')
let next = replaceBetween(text, START, END, redirectsTable())
next = replaceBetween(next, BRAK_ODPOWIEDNIKA_START, BRAK_ODPOWIEDNIKA_END, withoutCounterpartTable())
await writeFile(docPath, next)
console.log(`Zapisano ${docPath}`)
