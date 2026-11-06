/**
 * Ceny pierścionków z OLX na staging: pole „Cena (zł)” z `seed/ceny/ceny-olx.json`.
 *
 *   npm run staging:ceny              sprawdzenie: nic nie zapisuje, pokazuje plan (która karta, jaka cena)
 *   npm run staging:ceny -- --apply   zapis cen; karta opublikowana zostaje opublikowana, szkic – szkicem
 *
 * Kartę szuka po nazwie (bez wielkości liter). Pomija nazwę, której nie ma albo która ma kilka kart, i kartę, która ma już
 * inną cenę (ktoś mógł ją wpisać ręcznie). Idempotentne: drugie uruchomienie niczego nie zmienia.
 * Wymaga migracji `20261106_100112_ceny_pierscionkow` (kolumna `price`). Działa tylko z NEON_BRANCH=staging.
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { loadPrices, planPrice, type PriceCard } from './ceny-logic'

const applyChanges = process.argv.includes('--apply')

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:ceny musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
}

const { ceny, bezKarty } = loadPrices()
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
    if (!applyChanges) {
      counts.zmien += 1
      console.log(`~ #${plan.id} ${spec.name}: ${plan.note}${published ? '' : ' (szkic)'}${extra}`)
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
      console.log(`~ #${plan.id} ${spec.name}: ${plan.note}${published ? ', opublikowana' : ' (szkic)'}${extra}`)
    } catch (error) {
      counts.bledy += 1
      console.log(`! #${plan.id} ${spec.name}: zapis nie przeszedł: ${problems(error)}`)
    }
  }

  console.log(
    `Cen w ceny-olx.json: ${ceny.length}; do zapisu: ${counts.zmien}, już są: ${counts.juz}, pominiętych: ${counts.pomin}` +
      `${counts.bledy ? `, błędów zapisu: ${counts.bledy}` : ''}.`,
  )
  for (const item of bezKarty) console.log(`? bez karty: „${item.olx}” ${item.price} zł – ${item.pytanie}`)
  if (applyChanges) {
    if (counts.zmien) {
      console.log('Odświeżenie katalogu: skrypt nie może wołać revalidateTag – zapisz dowolną kartę w panelu (bez zmian),')
      console.log('wtedy lista /pierscionki i karty pokażą ceny.')
    }
  } else {
    console.log('To było sprawdzenie. Zapis: npm run staging:ceny -- --apply')
  }
  if (counts.bledy) process.exitCode = 1
} finally {
  await payload.destroy()
}
// Połączenia (pula bazy) potrafią zatrzymać proces po zakończeniu pracy.
process.exit(process.exitCode ?? 0)
