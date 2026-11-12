/**
 * Nowe opisy realizacji na stagingu (12.11.2026): zamiast streszczeń postów z Facebooka teksty, które czytają się jak historia.
 *
 *   npm run staging:realizacje-opisy                  sprawdzenie: nic nie zapisuje, pokazuje stary i nowy tekst
 *   npm run staging:realizacje-opisy -- --apply       zapis
 *   npm run staging:realizacje-opisy -- --apply --wymus   zapis także tam, gdzie ktoś zmienił tekst w panelu
 *
 * Teksty są w `scripts/realizacje-data.ts` (`title`, `task`, `whatWeDid`). Pole zmieniamy tylko wtedy, gdy w bazie jest
 * dokładnie poprzednia wersja z seeda (`previousTexts`); ręcznie poprawiony tekst zostaje, chyba że jest `--wymus`.
 * Adres (slug) realizacji się nie zmienia. Zapis przez `payload.update`, więc panel (najnowsza wersja) widzi to samo co strona.
 * Działa tylko z NEON_BRANCH=staging.
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { SEED_WORKS } from './realizacje-data'
import { planTexts } from './realizacje-logic'

const applyChanges = process.argv.includes('--apply')
const force = process.argv.includes('--wymus')

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:realizacje-opisy musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
}

const LABELS = { title: 'Tytuł', task: 'Zadanie', whatWeDid: 'Co zrobiliśmy' } as const
const payload = await getPayload({ config: await config })

try {
  const { docs } = await payload.find({ collection: 'works', depth: 0, limit: 200, overrideAccess: true, draft: true, pagination: false })
  const bySlug = new Map(docs.map((doc) => [doc.slug, doc]))
  let updated = 0
  let manual = 0

  for (const work of SEED_WORKS) {
    const existing = bySlug.get(work.slug)
    if (!existing) {
      console.log(`? ${work.slug}: nie ma takiej realizacji na stagingu, pomijam`)
      continue
    }
    const plans = planTexts(existing, work, force)
    const changes: Record<string, string> = {}
    for (const plan of plans) {
      if (plan.action === 'aktualne') continue
      if (plan.action === 'reczne') {
        manual += 1
        console.log(`! ${work.slug} / ${LABELS[plan.field]}: zmienione w panelu, zostawiam (podmiana: --wymus)`)
        console.log(`    teraz: ${plan.current}`)
        console.log(`    nowy:  ${plan.wanted}`)
        continue
      }
      changes[plan.field] = plan.wanted
      console.log(`~ ${work.slug} / ${LABELS[plan.field]}`)
      console.log(`    było: ${plan.current}`)
      console.log(`    jest: ${plan.wanted}`)
    }
    if (!Object.keys(changes).length) {
      if (plans.every((plan) => plan.action === 'aktualne')) console.log(`= ${work.slug}: teksty już aktualne`)
      continue
    }
    if (applyChanges) {
      await payload.update({
        collection: 'works',
        id: existing.id,
        data: { ...changes, slug: existing.slug, generateSlug: false },
        draft: false,
        overrideAccess: true,
        context: { skipFrontendRevalidation: true },
      })
      updated += 1
    }
  }

  const others = docs.filter((doc) => !SEED_WORKS.some((work) => work.slug === doc.slug))
  for (const doc of others) console.log(`· ${doc.slug}: realizacja dodana w panelu, skrypt jej nie dotyka`)

  if (applyChanges) {
    console.log(`Gotowe: zaktualizowano realizacji ${updated}, pominięte pola zmienione ręcznie: ${manual}.`)
    console.log('Strona trzyma listę realizacji w pamięci do godziny; zapis dowolnej realizacji w panelu odświeża ją od razu.')
  } else {
    console.log('To było sprawdzenie. Zapis: npm run staging:realizacje-opisy -- --apply')
  }
} finally {
  await payload.destroy()
}
process.exit(process.exitCode ?? 0)
