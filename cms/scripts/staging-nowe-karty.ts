/**
 * Nowe karty pierścionków jako szkice na staging: `seed/nowe-karty/nowe-karty.json` (Hesperia z andaluzytem, Selene z opalem).
 *
 *   npm run staging:nowe-karty              sprawdzenie: nic nie zapisuje, pokazuje plan i brakujące zdjęcia
 *   npm run staging:nowe-karty -- --apply   zapis: zakłada szkice, wgrywa zdjęcia i film (prefiks mediów stagingu)
 *   opcja --filmy <katalog> (albo NOWE_KARTY_FILMY): gdzie leżą mp4 z eksportu FB (domyślnie data/facebook/media w repo)
 *
 * Kartę szuka po slugu. Istniejącej nie nadpisuje tekstów; do szkicu dopina tylko zdjęcia, których jeszcze nie ma
 * (np. zdjęcia Kamili skopiowane później do docs/od-kamili/2026-11-06/). Opublikowanej karty nie rusza.
 * Idempotentne. Działa tylko z NEON_BRANCH=staging. Publikuje Marcin w panelu, po obejrzeniu.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { collectPhotos, collectVideo, FILMY_DIR, KAMILA_DIR, loadNewCards, planNewCard, type PlannedPhoto } from './nowe-karty-logic'

const applyChanges = process.argv.includes('--apply')
const filmyArg = process.argv.indexOf('--filmy')
const videoDir = path.resolve((filmyArg >= 0 ? process.argv[filmyArg + 1] : undefined) ?? process.env.NOWE_KARTY_FILMY ?? FILMY_DIR)

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:nowe-karty musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
}

const specs = loadNewCards()
const payload = await getPayload({ config: await config })

const problems = (error: unknown): string => {
  const errors = (error as { data?: { errors?: Array<{ path?: string; message?: string }> } })?.data?.errors
  if (errors?.length) return errors.map((e) => `${e.path ?? '?'}: ${e.message ?? '?'}`).join('; ')
  return error instanceof Error ? error.message : String(error)
}

type MediaRef = number | { id: number; legacySourceUrl?: string | null } | null | undefined
const mediaId = (ref: MediaRef) => (typeof ref === 'object' && ref ? ref.id : ref ?? null)

try {
  const found = await payload.find({
    collection: 'products',
    depth: 1,
    draft: true,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  })
  const bySlug = new Map(found.docs.map((doc) => [doc.slug, doc]))
  let nextSort = Math.max(0, ...found.docs.map((doc) => doc.sortOrder ?? 0)) + 1
  const context = { skipFrontendRevalidation: true }

  const ensureMedia = async (photo: PlannedPhoto): Promise<number> => {
    const existing = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { legacySourceUrl: { equals: photo.key } },
    })
    if (existing.docs[0]) return existing.docs[0].id
    const data = await readFile(photo.fullPath)
    const media = await payload.create({
      collection: 'media',
      data: { alt: photo.alt, legacySourceUrl: photo.key },
      file: { data, mimetype: photo.mimetype, name: photo.file, size: data.byteLength },
      overrideAccess: true,
    })
    return media.id
  }

  const counts = { zmien: 0, juz: 0, pomin: 0, bledy: 0 }
  for (const spec of specs) {
    const doc = bySlug.get(spec.slug)
    // Karta opublikowana: zdjęć nie sprawdzamy (nie dopinamy ich), liczy się tylko film.
    const published = doc?._status === 'published'
    const { photos: stills, missing } = published ? { photos: [], missing: [] as string[] } : collectPhotos(spec)
    const { video, missing: missingVideo } = collectVideo(spec, { videoDir })
    if (missingVideo) missing.push(missingVideo)
    const photos = video ? [...stills, video] : stills
    const existing = doc && {
      id: doc.id,
      name: doc.name,
      status: doc._status,
      photoKeys: (doc.media ?? [])
        .map((entry) => (typeof entry.asset === 'object' && entry.asset ? entry.asset.legacySourceUrl : null))
        .filter((key): key is string => Boolean(key)),
    }
    const plan = planNewCard(existing, spec, photos)
    const label = `${spec.name} (${spec.slug})`
    if (missing.length) console.log(`  ${label}: brak zdjęć: ${missing.join(', ')}`)
    if (plan.action !== 'utworz' && plan.action !== 'dodaj' && plan.action !== 'film') {
      counts[plan.action] += 1
      console.log(`${plan.action === 'juz' ? '=' : '!'} ${label}: ${plan.note}`)
      continue
    }
    counts.zmien += 1
    if (!applyChanges) {
      console.log(`${plan.action === 'utworz' ? '+' : '~'} ${label}: ${plan.note}`)
      continue
    }
    try {
      const newEntries = []
      for (const photo of plan.photos) newEntries.push({ asset: await ensureMedia(photo), alt: photo.alt, isPrimary: false })
      if (plan.action === 'utworz') {
        newEntries[0].isPrimary = true
        const created = await payload.create({
          collection: 'products',
          data: {
            name: spec.name,
            generateSlug: false,
            slug: spec.slug,
            lead: spec.lead,
            description: spec.description,
            price: spec.price,
            metal: spec.metal,
            stone: spec.stone,
            media: newEntries,
            sortOrder: nextSort++,
            _status: 'draft',
          },
          draft: true,
          overrideAccess: true,
          context,
        })
        console.log(`+ ${label}: ${plan.note} – szkic #${created.id}`)
      } else if (plan.action === 'film') {
        // Opublikowana karta: tylko dopisanie filmu do mediów, status zostaje „opublikowana” (bez nowej wersji roboczej).
        const current = (doc?.media ?? []).map((entry) => ({
          asset: mediaId(entry.asset as MediaRef) as number,
          alt: entry.alt,
          isPrimary: entry.isPrimary,
        }))
        await payload.update({
          collection: 'products',
          id: doc!.id,
          data: { media: [...current, ...newEntries], _status: 'published' },
          draft: false,
          overrideAccess: true,
          context,
        })
        console.log(`~ ${label}: ${plan.note} (karta #${doc!.id}, status bez zmian)`)
      } else {
        const current = (doc?.media ?? []).map((entry) => ({
          asset: mediaId(entry.asset as MediaRef) as number,
          alt: entry.alt,
          isPrimary: entry.isPrimary,
        }))
        await payload.update({
          collection: 'products',
          id: doc!.id,
          data: { media: [...current, ...newEntries], _status: 'draft' },
          draft: true,
          overrideAccess: true,
          context,
        })
        console.log(`~ ${label}: ${plan.note} (szkic #${doc!.id})`)
      }
    } catch (error) {
      counts.zmien -= 1
      counts.bledy += 1
      console.log(`! ${label}: zapis nie przeszedł: ${problems(error)}`)
    }
  }

  console.log(
    `Kart w nowe-karty.json: ${specs.length}; do zapisu: ${counts.zmien}, już gotowych: ${counts.juz}, pominiętych: ${counts.pomin}` +
      `${counts.bledy ? `, błędów zapisu: ${counts.bledy}` : ''}.`,
  )
  console.log(`Zdjęcia Kamili czytam z: ${KAMILA_DIR}; filmy z: ${videoDir}`)
  if (!applyChanges) console.log('To było sprawdzenie. Zapis: npm run staging:nowe-karty -- --apply')
  else if (counts.zmien) console.log('Nowe karty są szkicami: obejrzyj je w panelu (Pierścionki) i opublikuj, gdy pasują. Film dopięty do opublikowanej karty widać od razu.')
  if (counts.bledy) process.exitCode = 1
} finally {
  await payload.destroy()
}
process.exit(process.exitCode ?? 0)
