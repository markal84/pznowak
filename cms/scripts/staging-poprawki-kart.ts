/**
 * Poprawki pól kart znalezione przy przeglądzie zdjęć do „Ten model” (26.11.2026, zob. seed/opisy/ten-model.md).
 *
 *   npm run staging:poprawki-kart              sprawdzenie, nic nie zapisuje
 *   npm run staging:poprawki-kart -- --apply   zapis; karta opublikowana zostaje opublikowana, szkic – szkicem
 *
 * Zmienia pole tylko wtedy, gdy w bazie jest dokładnie stary tekst (albo już nowy). Ręczne zmiany z panelu zostają.
 * Idempotentne. Działa tylko na żywej bazie (NEON_BRANCH=production, zob. db-guard.ts).
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { requireLiveDatabase } from './db-guard'

type Field = 'metal' | 'stone' | 'stoneCut' | 'description'
type Fix = { id: number; name: string; field: Field; from: string; to: string; why: string }

/** Zamiana fragmentu (opis) albo całej wartości pola. */
const FIXES: Fix[] = [
  {
    id: 37,
    name: 'Leucothea',
    field: 'description',
    from: 'w której kamień centralny w szlifie szmaragdowym otacza dwanaście mniejszych diamentów.',
    to: 'w której kamień centralny w szlifie szmaragdowym trzymają cztery łapki, a wzdłuż szyny biegnie dwanaście mniejszych diamentów.',
    why: 'na zdjęciach diamenty są na szynie, nie wokół kamienia',
  },
  {
    id: 38,
    name: 'Amphitrite',
    field: 'metal',
    from: 'Białe',
    to: 'Żółte z białym',
    why: 'na zdjęciach szyna jest żółta, wierzch biały',
  },
  {
    id: 38,
    name: 'Amphitrite',
    field: 'description',
    from: 'Pierścionek w stylu art déco z białego złota.',
    to: 'Pierścionek w stylu art déco z wierzchem z białego złota na szynie z żółtego złota.',
    why: 'na zdjęciach szyna jest żółta, wierzch biały',
  },
  {
    id: 12,
    name: 'Thalia',
    field: 'description',
    from: 'Na zdjęciach w centrum jest topaz London Blue w głębokim, stalowym błękicie.',
    to: 'Na zdjęciach w centrum jest szafir w głębokim, stalowym błękicie.',
    why: 'Thalia = szafir (ustalenie 16.11), opis mówił o topazie',
  },
  {
    id: 12,
    name: 'Thalia',
    field: 'stone',
    from: 'Szafir London blue i diamenty',
    to: 'Szafir i diamenty',
    why: '„London blue” to nazwa odmiany topazu, nie szafiru',
  },
  {
    id: 41,
    name: 'Rhodope',
    field: 'stoneCut',
    from: 'owalny',
    to: 'okragly',
    why: 'na zdjęciach kamień jest okrągły',
  },
]

const applyChanges = process.argv.includes('--apply')
requireLiveDatabase('staging-poprawki-kart')
const payload = await getPayload({ config: await config })

try {
  const counts = { zmien: 0, juz: 0, pomin: 0, bledy: 0 }
  const ids = [...new Set(FIXES.map((fix) => fix.id))]
  for (const id of ids) {
    const doc = (await payload.findByID({ collection: 'products', id, depth: 0, draft: true, overrideAccess: true })) as unknown as Record<
      string,
      unknown
    > & { name: string; _status?: string }
    const data: Partial<Record<Field, string>> = {}
    for (const fix of FIXES.filter((f) => f.id === id)) {
      const label = `#${id} ${fix.name}, ${fix.field}`
      if (doc.name !== fix.name) {
        counts.pomin += 1
        console.log(`! ${label}: nazwa „${doc.name}” zamiast „${fix.name}”, pomijam`)
        continue
      }
      const current = String(data[fix.field] ?? doc[fix.field] ?? '')
      const whole = fix.field !== 'description'
      if (whole ? current === fix.to : current.includes(fix.to)) {
        counts.juz += 1
        console.log(`= ${label}: już poprawione`)
        continue
      }
      if (whole ? current !== fix.from : !current.includes(fix.from)) {
        counts.pomin += 1
        console.log(`! ${label}: w bazie jest inny tekst niż oczekiwany, nie ruszam\n  teraz: ${current}`)
        continue
      }
      data[fix.field] = whole ? fix.to : current.replace(fix.from, fix.to)
      counts.zmien += 1
      console.log(`~ ${label}: „${fix.from}” → „${fix.to}” (${fix.why})`)
    }
    if (!applyChanges || !Object.keys(data).length) continue
    const published = doc._status === 'published'
    try {
      await payload.update({
        collection: 'products',
        id,
        // Pola z FIXES to tekst albo wartość z listy szlifów (STONE_CUT_OPTIONS).
        data: { ...data, _status: published ? 'published' : 'draft' } as never,
        draft: !published,
        overrideAccess: true,
        context: { skipFrontendRevalidation: true },
      })
      console.log(`  zapisane${published ? ', opublikowana' : ' (szkic)'}`)
    } catch (error) {
      counts.bledy += 1
      console.log(`! #${id}: zapis nie przeszedł: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  console.log(`Poprawek: ${FIXES.length}; do zmiany: ${counts.zmien}, już zgodnych: ${counts.juz}, pominiętych: ${counts.pomin}.`)
  if (!applyChanges) console.log('To było sprawdzenie. Zapis: npm run staging:poprawki-kart -- --apply')
  else if (counts.zmien) console.log('Odświeżenie katalogu: zapisz dowolną kartę w panelu (bez zmian).')
  if (counts.bledy) process.exitCode = 1
} finally {
  await payload.destroy()
}
process.exit(process.exitCode ?? 0)
