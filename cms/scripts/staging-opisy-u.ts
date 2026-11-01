/**
 * Jednolite opisy pierścionków na staging (zlecenie U): lead, opis i parametry z `seed/opisy/opisy-u.json`.
 *
 *   npm run staging:opisy              sprawdzenie: nic nie zapisuje, pokazuje plan (ile kart, które pola)
 *   npm run staging:opisy -- --apply   zapis zmienionych pól; karta opublikowana zostaje opublikowana, szkic – szkicem
 *
 * Karty szuka po id i nazwie (obie muszą się zgadzać). Pomija kartę zapisaną po eksporcie (`updatedAt` późniejsze niż
 * 2026-11-01T12:00:00Z), bo ktoś mógł ją poprawić ręcznie. Idempotentne: drugie uruchomienie niczego nie zmienia.
 * Działa tylko z NEON_BRANCH=staging (jak `staging:nazwy` i `staging:realizacje`).
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { EXPORT_CUTOFF, loadSpecs, planCard, type CardState } from './opisy-u-logic'

const applyChanges = process.argv.includes('--apply')

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:opisy musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
}

const specs = loadSpecs()
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
  const cards = new Map(found.docs.map((doc) => [doc.id, doc]))
  // Skrypt działa poza Next.js: odświeżanie strony (revalidateTag) rzuciłoby tu błąd, więc je wyłączamy i prosimy
  // na końcu o jeden zapis w panelu.
  const context = { skipFrontendRevalidation: true }

  const counts = { zmien: 0, juz: 0, pomin: 0, bledy: 0 }
  const fieldCounts = new Map<string, number>()
  for (const spec of specs) {
    const doc = cards.get(spec.id)
    const state: CardState | undefined = doc && {
      carats: doc.carats,
      clarity: doc.clarity,
      description: doc.description,
      id: doc.id,
      lead: doc.lead,
      metal: doc.metal,
      name: doc.name,
      status: doc._status,
      updatedAt: doc.updatedAt,
    }
    const plan = planCard(state, spec, EXPORT_CUTOFF)
    if (plan.action !== 'zmien') {
      counts[plan.action] += 1
      console.log(`${plan.action === 'juz' ? '=' : '!'} #${spec.id} ${spec.name}: ${plan.note}`)
      continue
    }
    for (const field of plan.fields) fieldCounts.set(field, (fieldCounts.get(field) ?? 0) + 1)
    if (!applyChanges) {
      counts.zmien += 1
      console.log(`~ #${spec.id} ${spec.name}: ${plan.note}`)
      continue
    }
    // Bez zmiany statusu: opublikowana karta dostaje nową opublikowaną wersję, szkic zostaje szkicem.
    const published = doc?._status === 'published'
    try {
      await payload.update({
        collection: 'products',
        id: spec.id,
        data: { ...plan.data, _status: published ? 'published' : 'draft' },
        draft: !published,
        overrideAccess: true,
        context,
      })
      counts.zmien += 1
      console.log(`~ #${spec.id} ${spec.name}: ${plan.note}${published ? ', opublikowana' : ' (szkic)'}`)
    } catch (error) {
      counts.bledy += 1
      console.log(`! #${spec.id} ${spec.name}: zapis nie przeszedł: ${problems(error)}`)
    }
  }

  const fields = [...fieldCounts].map(([field, n]) => `${field} ${n}`).join(', ') || '—'
  console.log(
    `Kart w opisy-u.json: ${specs.length}; do zmiany: ${counts.zmien}, już zgodnych: ${counts.juz}, pominiętych: ${counts.pomin}` +
      `${counts.bledy ? `, błędów zapisu: ${counts.bledy}` : ''}. Pola: ${fields}.`,
  )
  if (applyChanges) {
    if (counts.zmien) {
      console.log('Odświeżenie katalogu: skrypt nie może wołać revalidateTag – zapisz dowolną kartę w panelu (bez zmian),')
      console.log('wtedy lista /pierscionki i karty pokażą nowe teksty.')
    }
  } else {
    console.log('To było sprawdzenie. Zapis: npm run staging:opisy -- --apply')
  }
  if (counts.bledy) process.exitCode = 1
} finally {
  await payload.destroy()
}
// Połączenia (pula bazy) potrafią zatrzymać proces po zakończeniu pracy.
process.exit(process.exitCode ?? 0)
