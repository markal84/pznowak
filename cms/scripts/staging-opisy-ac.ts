/**
 * Opisy fasonu na staging (zlecenie AC): lead i opis kart z wariantami kamienia z `seed/opisy/opisy-ac.json`.
 *
 *   npm run staging:opisy-ac              sprawdzenie: nic nie zapisuje, pokazuje plan
 *   npm run staging:opisy-ac -- --apply   zapis; karta opublikowana zostaje opublikowana, szkic – szkicem
 *
 * Karty szuka po id i nazwie. Nadpisuje tylko tekst ze zlecenia U (Urania: z AB); tekst poprawiony ręcznie w panelu
 * zostaje. Idempotentne. Działa tylko z NEON_BRANCH=staging.
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { loadAcSpecs, planAc } from './opisy-ac-logic'

const applyChanges = process.argv.includes('--apply')

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:opisy-ac musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
}

const specs = loadAcSpecs()
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
  // Poza Next.js revalidateTag rzuciłby błąd; na końcu prośba o jeden zapis w panelu.
  const context = { skipFrontendRevalidation: true }

  const counts = { zmien: 0, juz: 0, pomin: 0, bledy: 0 }
  for (const spec of specs) {
    const doc = cards.get(spec.id)
    const plan = planAc(doc && { id: doc.id, name: doc.name, lead: doc.lead, description: doc.description }, spec)
    if (plan.action !== 'zmien') {
      counts[plan.action] += 1
      console.log(`${plan.action === 'juz' ? '=' : '!'} #${spec.id} ${spec.name}: ${plan.note}`)
      continue
    }
    if (!applyChanges) {
      counts.zmien += 1
      console.log(`~ #${spec.id} ${spec.name}: ${plan.note}`)
      continue
    }
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

  console.log(
    `Kart w opisy-ac.json: ${specs.length}; do zmiany: ${counts.zmien}, już zgodnych: ${counts.juz}, pominiętych: ${counts.pomin}` +
      `${counts.bledy ? `, błędów zapisu: ${counts.bledy}` : ''}.`,
  )
  if (applyChanges) {
    if (counts.zmien) console.log('Odświeżenie katalogu: zapisz dowolną kartę w panelu (bez zmian), wtedy karty pokażą nowe teksty.')
  } else {
    console.log('To było sprawdzenie. Zapis: npm run staging:opisy-ac -- --apply')
  }
  if (counts.bledy) process.exitCode = 1
} finally {
  await payload.destroy()
}
process.exit(process.exitCode ?? 0)
