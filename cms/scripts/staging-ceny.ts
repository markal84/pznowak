/**
 * Ceny pierścionków: pole „Cena (zł)” z pliku w `seed/ceny/` (domyślnie `ceny-olx.json`).
 *
 *   npm run staging:ceny                                   sprawdzenie: nic nie zapisuje, pokazuje plan
 *   npm run staging:ceny -- --plik ceny-michal-2026-11-23.json            to samo dla innego pliku
 *   npm run staging:ceny -- --plik ceny-michal-2026-11-23.json --apply    zapis
 *
 * Karta opublikowana zostaje opublikowana, szkic – szkicem. Karta opublikowana z niezapisaną wersją roboczą
 * (np. nowe zdjęcia czekające na publikację) dostaje cenę tylko w wersji roboczej, żeby nie zgubić tamtych zmian;
 * cena wejdzie na stronę po opublikowaniu tej wersji w panelu.
 *
 * Kartę szuka po nazwie (bez wielkości liter). Pomija nazwę, której nie ma albo która ma kilka kart, i kartę, która ma już
 * inną cenę (ktoś mógł ją wpisać ręcznie). Idempotentne: drugie uruchomienie niczego nie zmienia.
 * Wymaga migracji `20261106_100112_ceny_pierscionkow` (kolumna `price`). Działa tylko na żywej bazie (NEON_BRANCH=production, zob. db-guard.ts).
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import path from 'node:path'

import { loadPrices, planPrice, PRICES_DIR, type PriceCard } from './ceny-logic'
import { requireLiveDatabase } from './db-guard'

const applyChanges = process.argv.includes('--apply')

requireLiveDatabase('staging-ceny')

const fileArg = process.argv.indexOf('--plik')
const fileName = fileArg >= 0 ? process.argv[fileArg + 1] : undefined
if (fileArg >= 0 && (!fileName || fileName.includes('/') || !fileName.endsWith('.json'))) {
  console.error('--plik: podaj nazwę pliku .json z seed/ceny, np. --plik ceny-michal-2026-11-23.json')
  process.exit(1)
}
const { ceny, bezKarty } = loadPrices(fileName ? path.join(PRICES_DIR, fileName) : undefined)
console.log(`Plik: seed/ceny/${fileName ?? 'ceny-olx.json'}`)
const payload = await getPayload({ config: await config })

const problems = (error: unknown): string => {
  const errors = (error as { data?: { errors?: Array<{ path?: string; message?: string }> } })?.data?.errors
  if (errors?.length) return errors.map((e) => `${e.path ?? '?'}: ${e.message ?? '?'}`).join('; ')
  return error instanceof Error ? error.message : String(error)
}

try {
  const found = await payload.find({
    collection: 'products',
    depth: 0,
    draft: true,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  })
  const cards: PriceCard[] = found.docs.map((doc) => ({ id: doc.id, name: doc.name, price: doc.price, status: doc._status }))
  const byId = new Map(found.docs.map((doc) => [doc.id, doc]))
  // Tabela główna (draft: false) trzyma ostatnią opublikowaną kartę; najnowsza wersja (draft: true) może być roboczą.
  const main = await payload.find({
    collection: 'products',
    depth: 0,
    draft: false,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  })
  const publishedIds = new Set(main.docs.filter((doc) => doc._status === 'published').map((doc) => doc.id))
  // Skrypt działa poza Next.js: odświeżanie strony (revalidateTag) rzuciłoby tu błąd, więc je wyłączamy.
  const context = { skipFrontendRevalidation: true }

  const counts = { zmien: 0, juz: 0, pomin: 0, bledy: 0 }
  for (const spec of ceny) {
    const plan = planPrice(cards, spec)
    const extra = spec.uwaga ? ` [${spec.uwaga}]` : ''
    if (plan.action !== 'zmien') {
      counts[plan.action] += 1
      const id = plan.action === 'juz' ? ` #${plan.id}` : ''
      console.log(`${plan.action === 'juz' ? '=' : '!'}${id} ${spec.name}: ${plan.note}${extra}`)
      continue
    }
    const published = byId.get(plan.id)?._status === 'published'
    const workingDraft = !published && publishedIds.has(plan.id)
    const state = published ? '' : workingDraft ? ' (WERSJA ROBOCZA: cena wejdzie po opublikowaniu w panelu)' : ' (szkic)'
    if (!applyChanges) {
      counts.zmien += 1
      console.log(`~ #${plan.id} ${spec.name}: ${plan.note}${state}${extra}`)
      continue
    }
    try {
      // Bez zmiany statusu: opublikowana karta dostaje nową opublikowaną wersję, szkic zostaje szkicem.
      await payload.update({
        collection: 'products',
        id: plan.id,
        data: { price: plan.price, _status: published ? 'published' : 'draft' },
        draft: !published,
        overrideAccess: true,
        context,
      })
      counts.zmien += 1
      console.log(`~ #${plan.id} ${spec.name}: ${plan.note}${published ? ', opublikowana' : state}${extra}`)
    } catch (error) {
      counts.bledy += 1
      console.log(`! #${plan.id} ${spec.name}: zapis nie przeszedł: ${problems(error)}`)
    }
  }

  console.log(
    `Cen w pliku: ${ceny.length}; do zapisu: ${counts.zmien}, już są: ${counts.juz}, pominiętych: ${counts.pomin}` +
      `${counts.bledy ? `, błędów zapisu: ${counts.bledy}` : ''}.`,
  )
  for (const item of bezKarty) console.log(`? bez karty: „${item.olx}” ${item.price} zł – ${item.pytanie}`)
  if (applyChanges) {
    if (counts.zmien) {
      console.log('Odświeżenie katalogu: skrypt nie może wołać revalidateTag – zapisz dowolną kartę w panelu (bez zmian),')
      console.log('wtedy lista /pierscionki i karty pokażą ceny.')
    }
  } else {
    console.log(`To było sprawdzenie. Zapis: npm run staging:ceny -- ${fileName ? `--plik ${fileName} ` : ''}--apply`)
  }
  if (counts.bledy) process.exitCode = 1
} finally {
  await payload.destroy()
}
// Połączenia (pula bazy) potrafią zatrzymać proces po zakończeniu pracy.
process.exit(process.exitCode ?? 0)
