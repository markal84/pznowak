/**
 * „Ten model” na staging: tekst tylko dla jednej karty z `seed/opisy/ten-model.json` (na początek 6 kart bliźniaczych).
 *
 *   npm run staging:ten-model              sprawdzenie: zapora jakości + plan, nic nie zapisuje
 *   npm run staging:ten-model -- --apply   zapis; karta opublikowana zostaje opublikowana, szkic – szkicem
 *   npm run staging:ten-model -- --apply --nadpisz=43,42
 *                                          nadpisuje też tekst wpisany ręcznie w panelu
 *
 * Przed dopisaniem kolejnych kart: seed/opisy/ten-model.md (najpierw obejrzeć wszystkie zdjęcia i filmy karty).
 * Zapisuje tylko do pustego pola. Gdy zapora (długość, liczby, podobieństwo) zgłosi problem, nic nie zapisuje.
 * Idempotentne. Działa tylko na żywej bazie (NEON_BRANCH=production, zob. db-guard.ts).
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { requireLiveDatabase } from './db-guard'
import { lintTenModel, loadTenModel, planTenModel, type OtherText } from './ten-model-logic'

const applyChanges = process.argv.includes('--apply')
const overwrite = new Set(
  (process.argv.find((arg) => arg.startsWith('--nadpisz='))?.slice('--nadpisz='.length) ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean),
)

requireLiveDatabase('staging-ten-model')

const specs = loadTenModel()
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

  // Zapora na danych z bazy: liczby tylko z karty, tekst inny niż opisy wszystkich kart i inne „Ten model”.
  let blocked = 0
  for (const spec of specs) {
    const doc = cards.get(spec.id)
    const facts = [doc?.name, doc?.stone, doc?.carats, doc?.lead, doc?.description].filter(Boolean).join('\n')
    const others: OtherText[] = [
      ...found.docs.flatMap((other) => [
        { label: `opis ${other.name}`, text: other.description ?? '' },
        { label: `lead ${other.name}`, text: other.lead ?? '' },
        ...(other.id !== spec.id ? [{ label: `„Ten model” ${other.name}`, text: other.uniqueNote ?? '' }] : []),
      ]),
      ...specs.filter((s) => s.id !== spec.id).map((s) => ({ label: `„Ten model” ${s.name} (plik)`, text: s.text })),
    ]
    for (const issue of lintTenModel(spec, facts, others)) {
      blocked += 1
      console.log(`! #${issue.id} ${issue.name}: ${issue.problem}`)
    }
  }
  if (blocked) {
    console.log(`Zapora: ${blocked} problemów, nic nie zapisuję. Popraw seed/opisy/ten-model.json.`)
    process.exitCode = 1
  } else {
    const context = { skipFrontendRevalidation: true }
    const counts = { zmien: 0, juz: 0, pomin: 0, bledy: 0 }
    for (const spec of specs) {
      const doc = cards.get(spec.id)
      const label = `#${spec.id} ${spec.name}`
      const plan = planTenModel(doc, spec, overwrite.has(String(spec.id)))
      if (plan.action !== 'zmien') {
        counts[plan.action] += 1
        console.log(`${plan.action === 'juz' ? '=' : '!'} ${label}: ${plan.note}`)
        if (plan.action === 'pomin' && doc?.uniqueNote) console.log(`  teraz w panelu: ${doc.uniqueNote}\n  Nadpisanie: --nadpisz=${spec.id}`)
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
          id: spec.id,
          data: { uniqueNote: plan.text, _status: published ? 'published' : 'draft' },
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
    console.log(
      `Kart w ten-model.json: ${specs.length}; do zmiany: ${counts.zmien}, już zgodnych: ${counts.juz}, pominiętych: ${counts.pomin}` +
        `${counts.bledy ? `, błędów zapisu: ${counts.bledy}` : ''}.`,
    )
    if (applyChanges) {
      if (counts.zmien) console.log('Odświeżenie katalogu: zapisz dowolną kartę w panelu (bez zmian), wtedy karty pokażą nowe teksty.')
    } else {
      console.log('To było sprawdzenie. Zapis: npm run staging:ten-model -- --apply')
    }
    if (counts.bledy) process.exitCode = 1
  }
} finally {
  await payload.destroy()
}
process.exit(process.exitCode ?? 0)
