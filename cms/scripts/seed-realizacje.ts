/**
 * Realizacje na staging (zlecenie R): migracja bazy i 6 historii ze zdjęciami z `cms/seed/realizacje`.
 *
 *   npm run staging:realizacje              sprawdzenie: nic nie zapisuje, pokazuje, co zostałoby zrobione
 *   npm run staging:realizacje -- --apply   migracja + wgranie zdjęć + utworzenie realizacji
 *
 * Idempotentne: zdjęcia rozpoznaje po `legacySourceUrl` (`seed://realizacje/<plik>`), realizacje po adresie (slug).
 * Istniejącej realizacji nie nadpisuje, bo Michał mógł już poprawić teksty w panelu; drugie uruchomienie niczego nie dubluje.
 * Dane nie mają prawa trafić na produkcję: skrypt działa tylko z NEON_BRANCH=staging (jak `seed-staging.ts`).
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import type { Media } from '../src/payload-types'
import { SEED_WORKS } from './realizacje-data'

const applyChanges = process.argv.includes('--apply')
const photosDir = fileURLToPath(new URL('../seed/realizacje', import.meta.url))
const sourceKey = (file: string) => `seed://realizacje/${file}`

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:realizacje musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
}

// Sprawdzenie plików nie dotyka bazy: brakujące zdjęcie przerywa od razu.
const photoFiles = SEED_WORKS.flatMap((work) => work.photos.map((photo) => photo.file))
for (const file of photoFiles) await readFile(path.join(photosDir, file))
console.log(`Pliki: zdjęcia ${photoFiles.length} dla realizacji ${SEED_WORKS.length} są w cms/seed/realizacje.`)

const payload = await getPayload({ config: await config })

try {
  if (applyChanges) {
    console.log('Migracja bazy (tylko oczekujące)…')
    await payload.db.migrate()
  }

  let tableReady = true
  try {
    await payload.count({ collection: 'works', overrideAccess: true })
  } catch {
    tableReady = false
  }
  if (!tableReady) {
    console.log('Tabela „Realizacje” jeszcze nie istnieje: z --apply najpierw wykona się migracja.')
    if (!applyChanges) process.exit(0)
    throw new Error('Po migracji nie ma tabeli cms_works')
  }

  const existingWorks = await payload.find({
    collection: 'works',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    select: { slug: true },
  })
  const existingSlugs = new Set(existingWorks.docs.map((work) => work.slug))

  const findProductId = async (name: string): Promise<number | null> => {
    const found = await payload.find({
      collection: 'products',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { name: { equals: name } },
    })
    return found.docs[0]?.id ?? null
  }

  const ensureMedia = async (file: string, alt: string): Promise<Media> => {
    const existing = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { legacySourceUrl: { equals: sourceKey(file) } },
    })
    if (existing.docs[0]) return existing.docs[0]
    const data = await readFile(path.join(photosDir, file))
    return payload.create({
      collection: 'media',
      data: { alt, legacySourceUrl: sourceKey(file) },
      file: { data, mimetype: 'image/webp', name: file, size: data.byteLength },
      overrideAccess: true,
    })
  }

  let created = 0
  for (const [position, work] of SEED_WORKS.entries()) {
    if (existingSlugs.has(work.slug)) {
      console.log(`= ${work.slug}: już istnieje, bez zmian`)
      continue
    }
    const productId = work.productName ? await findProductId(work.productName) : null
    const productNote = work.productName ? (productId ? `link do „${work.productName}”` : `BRAK karty „${work.productName}”, bez linku`) : 'bez linku do katalogu'
    if (!applyChanges) {
      console.log(`+ ${work.slug}: zdjęcia: ${work.photos.length}, ${productNote}`)
      continue
    }
    const photos = []
    for (const photo of work.photos) {
      const media = await ensureMedia(photo.file, photo.alt)
      photos.push({ image: media.id, alt: photo.alt })
    }
    await payload.create({
      collection: 'works',
      data: {
        title: work.title,
        generateSlug: false,
        slug: work.slug,
        kind: work.kind,
        jewelryType: work.jewelryType,
        year: work.year,
        task: work.task,
        whatWeDid: work.whatWeDid,
        photos,
        product: productId,
        needsConfirmation: true,
        featured: Boolean(work.featured),
        position,
        _status: 'published',
      },
      draft: false,
      overrideAccess: true,
      // Skrypt działa poza Next.js: odświeżanie strony (revalidateTag) rzuciłoby tu błąd.
      context: { skipFrontendRevalidation: true },
    })
    created += 1
    console.log(`+ ${work.slug}: utworzona (zdjęcia: ${work.photos.length}, ${productNote})`)
  }

  if (applyChanges) {
    const total = await payload.count({ collection: 'works', overrideAccess: true, where: { _status: { equals: 'published' } } })
    console.log(`Gotowe: utworzono ${created}, opublikowanych realizacji na stagingu: ${total.totalDocs}.`)
    console.log('Strona trzyma listę realizacji w pamięci do godziny; zapis dowolnej realizacji w panelu odświeża ją od razu.')
  } else {
    console.log('To było sprawdzenie. Zapis: npm run staging:realizacje -- --apply')
  }
} finally {
  await payload.destroy()
}
// Połączenia (pula bazy, sharp) potrafią zatrzymać proces po zakończeniu pracy.
process.exit(process.exitCode ?? 0)
