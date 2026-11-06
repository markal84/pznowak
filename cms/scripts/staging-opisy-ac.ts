/**
 * Opisy fasonu na staging (zlecenie AC): lead i opis kart z wariantami kamienia z `seed/opisy/opisy-ac.json`.
 *
 *   npm run staging:opisy-ac              sprawdzenie: nic nie zapisuje, pokazuje plan
 *   npm run staging:opisy-ac -- --apply   zapis; karta opublikowana zostaje opublikowana, szkic – szkicem
 *   npm run staging:opisy-ac -- --apply --nadpisz=46,17,thalia
 *                                         jak wyżej, ale te karty nadpisuje także po ręcznej zmianie w panelu;
 *                                         ich stary tekst idzie na ekran i do seed/opisy/opisy-ac-kopia.json
 *
 * Karty szuka po id i nazwie. Nadpisuje tylko tekst ze zlecenia U (Urania: z AB); tekst poprawiony ręcznie w panelu
 * zostaje. Idempotentne. Działa tylko z NEON_BRANCH=staging.
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { AC_PATH, loadAcSpecs, planAc } from './opisy-ac-logic'

const applyChanges = process.argv.includes('--apply')
/** `--nadpisz=46,17,thalia`: id albo slugi kart, które Marcin świadomie każe nadpisać mimo ręcznej zmiany w panelu. */
const overwrite = new Set(
  (process.argv.find((arg) => arg.startsWith('--nadpisz='))?.slice('--nadpisz='.length) ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean),
)
const BACKUP_PATH = path.join(path.dirname(AC_PATH), 'opisy-ac-kopia.json')

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
  const bySlug = new Map(found.docs.map((doc) => [doc.slug, doc]))
  // Poza Next.js revalidateTag rzuciłby błąd; na końcu prośba o jeden zapis w panelu.
  const context = { skipFrontendRevalidation: true }

  const counts = { zmien: 0, juz: 0, pomin: 0, bledy: 0 }
  const backup: { id: number; name: string; lead: string; description: string }[] = []
  for (const spec of specs) {
    const doc = spec.id ? cards.get(spec.id) : bySlug.get(spec.slug ?? '')
    const id = doc?.id ?? spec.id
    const label = `#${id} ${spec.name}`
    let plan = planAc(doc && { id: doc.id, name: doc.name, lead: doc.lead, description: doc.description }, spec)
    const manual = plan.action === 'pomin' && doc?.name === spec.name
    if (manual) {
      // Pokaż, co jest teraz w panelu, żeby dało się zdecydować o nadpisaniu.
      console.log(`  ${label} – teraz w panelu:\n    lead: ${doc?.lead ?? ''}\n    opis: ${(doc?.description ?? '').replace(/\n+/g, ' ¶ ')}`)
      if ((overwrite.has(String(id)) || (spec.slug !== undefined && overwrite.has(spec.slug)))) {
        backup.push({ id, name: spec.name, lead: doc?.lead ?? '', description: doc?.description ?? '' })
        plan = { action: 'zmien', data: { lead: spec.lead, description: spec.description }, note: 'opis fasonu (nadpisany na prośbę, stary tekst w kopii)' }
      } else {
        console.log(`  Nadpisanie tej karty: dodaj --nadpisz=${id}`)
      }
    }
    if (plan.action !== 'zmien') {
      counts[plan.action] += 1
      console.log(`${plan.action === 'juz' ? '=' : '!'} ${label}: ${plan.note}`)
      continue
    }
    if (!applyChanges) {
      counts.zmien += 1
      console.log(`~ ${label}: ${plan.note}`)
      continue
    }
    const published = doc?._status === 'published'
    try {
      await payload.update({
        collection: 'products',
        id,
        data: { ...plan.data, _status: published ? 'published' : 'draft' },
        draft: !published,
        overrideAccess: true,
        context,
      })
      counts.zmien += 1
      console.log(`~ ${label}: ${plan.note}${published ? ', opublikowana' : ' (szkic)'}`)
    } catch (error) {
      counts.bledy += 1
      console.log(`! ${label}: zapis nie przeszedł: ${problems(error)}`)
    }
  }

  if (applyChanges && backup.length) {
    writeFileSync(BACKUP_PATH, `${JSON.stringify(backup, null, 2)}\n`)
    console.log(`Kopia nadpisanych tekstów: ${BACKUP_PATH}`)
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
