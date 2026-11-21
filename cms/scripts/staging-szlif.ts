/**
 * Szlif kamienia głównego na żywej bazie: pole „Szlif kamienia głównego” z `seed/parametry/szlif-ze-zdjec.json`.
 *
 *   npm run staging:szlif              sprawdzenie: nic nie zapisuje, pokazuje plan
 *   npm run staging:szlif -- --apply   zapis; karta opublikowana zostaje opublikowana, szkic – szkicem
 *
 * Kartę szuka po adresie (slug). Wpisuje tylko w puste pole, ręcznie wpisanego szlifu nie rusza. Idempotentne.
 * Wymaga migracji `20261121_090000_parametry_pierscionka`. Działa tylko na żywej bazie (zob. db-guard.ts).
 */
import { getPayload } from 'payload'

import type { Product } from '../src/payload-types'
import config from '../src/payload.config'
import { requireLiveDatabase } from './db-guard'
import { loadCuts, planCut, type CutCard } from './szlif-logic'

const applyChanges = process.argv.includes('--apply')

requireLiveDatabase('staging-szlif')

const cuts = loadCuts()
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
  const cards: CutCard[] = found.docs.map((doc) => ({ id: doc.id, slug: doc.slug, stoneCut: doc.stoneCut }))
  const byId = new Map(found.docs.map((doc) => [doc.id, doc]))
  // Skrypt działa poza Next.js: odświeżanie strony (revalidateTag) rzuciłoby tu błąd, więc je wyłączamy.
  const context = { skipFrontendRevalidation: true }

  const counts = { zmien: 0, juz: 0, pomin: 0, bledy: 0 }
  for (const spec of cuts) {
    const plan = planCut(cards, spec)
    if (plan.action !== 'zmien') {
      counts[plan.action] += 1
      const id = plan.id ? ` #${plan.id}` : ''
      console.log(`${plan.action === 'juz' ? '=' : '!'}${id} ${spec.slug}: ${plan.note}`)
      continue
    }
    const published = byId.get(plan.id)?._status === 'published'
    if (!applyChanges) {
      counts.zmien += 1
      console.log(`~ #${plan.id} ${spec.slug}: ${plan.note}${published ? '' : ' (szkic)'}`)
      continue
    }
    try {
      await payload.update({
        collection: 'products',
        id: plan.id,
        data: { stoneCut: plan.stoneCut as NonNullable<Product['stoneCut']>, _status: published ? 'published' : 'draft' },
        draft: !published,
        overrideAccess: true,
        context,
      })
      counts.zmien += 1
      console.log(`~ #${plan.id} ${spec.slug}: ${plan.note}${published ? ', opublikowana' : ' (szkic)'}`)
    } catch (error) {
      counts.bledy += 1
      console.log(`! #${plan.id} ${spec.slug}: zapis nie przeszedł: ${problems(error)}`)
    }
  }

  console.log(
    `Szlifów w pliku: ${cuts.length}; do zapisu: ${counts.zmien}, już są: ${counts.juz}, pominiętych: ${counts.pomin}` +
      `${counts.bledy ? `, błędów zapisu: ${counts.bledy}` : ''}.`,
  )
  if (applyChanges) {
    if (counts.zmien) console.log('Odświeżenie katalogu: zapisz dowolną kartę w panelu (bez zmian), wtedy karty pokażą szlif.')
  } else {
    console.log('To było sprawdzenie. Zapis: npm run staging:szlif -- --apply')
  }
  if (counts.bledy) process.exitCode = 1
} finally {
  await payload.destroy()
}
// Połączenia (pula bazy) potrafią zatrzymać proces po zakończeniu pracy.
process.exit(process.exitCode ?? 0)
