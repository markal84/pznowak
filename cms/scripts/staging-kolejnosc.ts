/**
 * Jednorazowe uporządkowanie pola „Kolejność” pierścionków na staging: zamienia powtórzone i dziurawe wartości
 * (9, 9, 9; brak 6, 8) na 0, 1, 2 … po kolei. Zachowuje obecną kolejność w katalogu; remisy rozstrzyga numer karty.
 * Ustawia tę samą liczbę w karcie i w jej najnowszej wersji (lista w panelu czyta najnowsze wersje), więc naprawia też
 * stan po wcześniejszym zapisie, który zmienił tylko karty, a panel dalej pokazywał stare liczby.
 *
 *   npm run staging:kolejnosc            sprawdzenie: nic nie zapisuje, pokazuje plan
 *   npm run staging:kolejnosc -- --apply zapisuje nowe wartości (bez nowych wersji i bez zmiany statusu kart)
 *
 * Działa tylko z NEON_BRANCH=staging.
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { planNormalize, writeSortOrder } from '../src/lib/sort-order'

const applyChanges = process.argv.includes('--apply')

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:kolejnosc musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
}

type Row = { id: number | string; name?: null | string; sortOrder?: null | number }

const payload = await getPayload({ config: await config })
try {
  const found = await payload.find({
    collection: 'products',
    depth: 0,
    draft: false,
    pagination: false,
    overrideAccess: true,
    select: { name: true, sortOrder: true },
  })
  const docs = found.docs as Row[]
  const latest = await payload.db.findVersions({
    collection: 'products',
    limit: 0,
    pagination: false,
    where: { latest: { equals: true } },
  })
  const panelValue = new Map<string, null | number | undefined>()
  for (const version of latest.docs) {
    panelValue.set(String(version.parent), (version.version as { sortOrder?: null | number })?.sortOrder)
  }

  const target = new Map(docs.map((doc) => [doc.id, typeof doc.sortOrder === 'number' ? doc.sortOrder : 0]))
  for (const change of planNormalize(docs)) target.set(change.id, change.to)

  const plan = docs
    .map((doc) => ({ doc, to: target.get(doc.id)!, panel: panelValue.get(String(doc.id)) }))
    .filter(({ doc, to, panel }) => doc.sortOrder !== to || (panelValue.has(String(doc.id)) && panel !== to))

  for (const { doc, to, panel } of plan) {
    console.log(`~ ${doc.name}: karta ${doc.sortOrder ?? '-'}, panel ${panel ?? '-'} → ${to}`)
  }
  console.log(`Kart: ${docs.length}, wersji „latest”: ${latest.docs.length}, do poprawy: ${plan.length}.`)
  if (!plan.length) console.log('= wszystko unikalne i zgodne z panelem')
  else if (!applyChanges) console.log('Sprawdzenie, nic nie zapisane. Zapis: npm run staging:kolejnosc -- --apply')
  else {
    for (const { doc, to } of plan) await writeSortOrder(payload, doc.id, to)
    const check = await payload.db.findVersions({
      collection: 'products',
      limit: 0,
      pagination: false,
      where: { latest: { equals: true } },
    })
    const counts = new Map<number, number>()
    const ids = new Set(docs.map((doc) => String(doc.id)))
    for (const version of check.docs) {
      if (!ids.has(String(version.parent))) continue
      const value = (version.version as { sortOrder?: null | number })?.sortOrder ?? 0
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    const dup = [...counts].filter(([, n]) => n > 1)
    console.log(`Zapisane: ${plan.length} kart. Duplikaty w panelu po zapisie: ${dup.length ? dup.map(([v, n]) => `${v}×${n}`).join(', ') : 'brak'}.`)
  }
} finally {
  await payload.destroy()
}
process.exit(process.exitCode ?? 0)
