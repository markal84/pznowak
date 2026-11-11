/**
 * Zdjęcia pierścionków na dłoni na staging: jedno ujęcie z `seed/dlon/dlon.json` dopisane na koniec galerii karty.
 *
 *   npm run staging:dlon                     sprawdzenie: nic nie zapisuje, pokazuje plan
 *   npm run staging:dlon -- --apply          dopisuje zdjęcia na dłoni
 *   npm run staging:dlon -- --cofnij         plan cofnięcia: które karty stracą zdjęcie na dłoni
 *   npm run staging:dlon -- --cofnij --apply usuwa z galerii wszystkie zdjęcia na dłoni (też te wgrane ręcznie jako *-dlon.jpg)
 *
 * Idempotentne: karta, która ma już zdjęcie na dłoni (z seeda albo ręcznie `<nazwa>-dlon.jpg`), zostaje bez zmian;
 * obraz rozpoznaje po `legacySourceUrl` (`seed://dlon/<plik>`) i wgrywa raz. Cofnięcie zdejmuje tylko wpisy z galerii,
 * pliki zostają w Media, więc ponowne `--apply` niczego nie wgrywa drugi raz. Reszta karty i status bez zmian.
 * Po zapisie odśwież katalog: zapisz dowolną kartę w panelu (skrypt działa poza Next.js, bez odświeżania strony).
 * Działa tylko z NEON_BRANCH=staging.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import type { Media } from '../src/payload-types'
import { checkImages, handAlt, IMAGES_DIR, loadSpecs, planAdd, sourceKey, withoutHand, type HandSpec } from './dlon-logic'

const applyChanges = process.argv.includes('--apply')
const undo = process.argv.includes('--cofnij')

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:dlon musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
}

const specs = loadSpecs()
if (!undo) {
  const imageProblems = checkImages(specs)
  if (imageProblems.length) throw new Error(`Zdjęcia na dłoni:\n${imageProblems.join('\n')}`)
}

const payload = await getPayload({ config: await config })
const context = { skipFrontendRevalidation: true }
const mediaId = (asset: number | Media) => (typeof asset === 'object' ? asset.id : asset)

const ensureMedia = async (spec: HandSpec): Promise<Media> => {
  const key = sourceKey(spec.file)
  const existing = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { legacySourceUrl: { equals: key } },
  })
  if (existing.docs[0]) return existing.docs[0]
  const data = await readFile(path.join(IMAGES_DIR, spec.file))
  return payload.create({
    collection: 'media',
    data: { alt: handAlt(spec.name), legacySourceUrl: key },
    file: { data, mimetype: 'image/webp', name: spec.file, size: data.byteLength },
    overrideAccess: true,
  })
}

try {
  const found = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  })
  const save = (id: number, media: { asset: number | Media; alt?: string | null; isPrimary?: boolean | null }[], status: string) =>
    payload.update({
      collection: 'products',
      id,
      data: {
        media: media.map((entry) => ({ asset: mediaId(entry.asset), alt: entry.alt, isPrimary: entry.isPrimary })),
        _status: status === 'draft' ? 'draft' : 'published',
      },
      draft: status === 'draft',
      overrideAccess: true,
      context,
    })

  let changed = 0
  if (undo) {
    for (const doc of found.docs) {
      const { kept, removed } = withoutHand(doc.media as { asset: number | Media }[] | null)
      if (!removed) continue
      changed += 1
      console.log(`- ${doc.name}: zdejmuję ${removed} zdjęcie na dłoni z galerii`)
      if (applyChanges) await save(doc.id, kept, doc._status ?? 'published')
    }
  } else {
    const byName = new Map(found.docs.map((doc) => [doc.name.trim().toLowerCase(), doc]))
    for (const spec of specs) {
      const doc = byName.get(spec.name.toLowerCase())
      const plan = planAdd(doc as { media?: { asset: number | Media }[] | null } | undefined)
      const mark = plan.action === 'dodaj' ? '+' : plan.action === 'juz' ? '=' : '!'
      console.log(`${mark} ${spec.name}: ${plan.note}`)
      if (plan.action !== 'dodaj' || !doc) continue
      changed += 1
      if (!applyChanges) continue
      const media = await ensureMedia(spec)
      await save(doc.id, [...(doc.media ?? []), { asset: media, alt: handAlt(spec.name), isPrimary: false }], doc._status ?? 'published')
    }
  }

  const verb = undo ? 'do cofnięcia' : 'do dopisania'
  if (!applyChanges) console.log(`Sprawdzenie: ${changed} kart ${verb}. Zapis: dodaj --apply.`)
  else console.log(`Zapisane: ${changed} kart. Odśwież katalog: zapisz dowolną kartę w panelu.`)
} finally {
  await payload.destroy()
}
// Połączenia (pula bazy) potrafią zatrzymać proces po zakończeniu pracy.
process.exit(process.exitCode ?? 0)
