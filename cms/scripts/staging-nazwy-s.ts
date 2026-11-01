/**
 * Imiona nowych pierścionków na staging (zlecenie S): 11 szkiców z importu z FB dostaje imiona z mitologii i zostaje opublikowanych.
 *
 *   npm run staging:nazwy              sprawdzenie: nic nie zapisuje, pokazuje plan
 *   npm run staging:nazwy -- --apply   zmiana nazwy + adresu, dopisanie dotychczasowej nazwy do opisu, publikacja
 *
 * Karty szuka po id i dotychczasowej nazwie (obie muszą się zgadzać, inaczej pomija z komunikatem).
 * Gdy publikacja nie przechodzi walidacji (np. brak zdjęcia), zostawia szkic z nową nazwą i wypisuje, czego brakuje.
 * Idempotentne: drugie uruchomienie niczego nie zmienia. Adresy szkiców nie były publiczne, więc bez przekierowań.
 * Działa tylko z NEON_BRANCH=staging (jak `seed-staging.ts` i `seed-realizacje.ts`).
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { NAME_SPECS, planRename, type CardState } from './nazwy-s-logic'

const applyChanges = process.argv.includes('--apply')

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:nazwy musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
}

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
  const slugOwners = new Map(found.docs.map((doc) => [doc.slug as string, doc.id]))
  // Skrypt działa poza Next.js: odświeżanie strony (revalidateTag) rzuciłoby tu błąd.
  const context = { skipFrontendRevalidation: true }

  let changed = 0
  let drafts = 0
  for (const spec of NAME_SPECS) {
    const doc = cards.get(spec.id)
    const state: CardState | undefined = doc && {
      archived: doc.archived,
      description: doc.description,
      id: doc.id,
      name: doc.name,
      slug: doc.slug as string,
      status: doc._status,
    }
    const plan = planRename(state, spec, slugOwners)
    if (plan.action !== 'zmien') {
      console.log(`${plan.action === 'juz' ? '=' : '!'} #${spec.id} ${spec.newName}: ${plan.note}`)
      continue
    }
    if (!applyChanges) {
      console.log(`~ #${spec.id}: ${plan.note}; opis zaczyna się od „${plan.data.description.split('\n')[0]}”`)
      continue
    }
    const data = { ...plan.data, generateSlug: false }
    try {
      await payload.update({ collection: 'products', id: spec.id, data: { ...data, _status: 'published' }, draft: false, overrideAccess: true, context })
      changed += 1
      console.log(`~ #${spec.id}: ${plan.note}, opublikowana`)
    } catch (error) {
      await payload.update({ collection: 'products', id: spec.id, data: { ...data, _status: 'draft' }, draft: true, overrideAccess: true, context })
      changed += 1
      drafts += 1
      console.log(`~ #${spec.id}: ${plan.note}, ZOSTAŁA SZKICEM, brakuje: ${problems(error)}`)
    }
  }

  const moissanites = found.docs.filter((doc) => /moissanit/iu.test(doc.name))
  for (const doc of moissanites) {
    console.log(`? #${doc.id} „${doc.name}” (${doc._status}): moissanity mają dostać imiona Aethra (2 ct) i Hesperia (1 ct), ustaw ręcznie w panelu`)
  }

  if (applyChanges) {
    console.log(`Gotowe: zmieniono ${changed} kart${drafts ? `, w tym ${drafts} zostało szkicem (patrz wyżej)` : ''}.`)
  } else {
    console.log('To było sprawdzenie. Zapis: npm run staging:nazwy -- --apply')
  }
} finally {
  await payload.destroy()
}
// Połączenia (pula bazy) potrafią zatrzymać proces po zakończeniu pracy.
process.exit(process.exitCode ?? 0)
