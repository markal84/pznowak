/**
 * Realizacje na staging (zlecenie R): migracja bazy i 6 historii ze zdjęciami z `cms/seed/realizacje`.
 *
 *   npm run staging:realizacje              sprawdzenie: nic nie zapisuje, pokazuje, co zostałoby zrobione
 *   npm run staging:realizacje -- --apply   migracja + wgranie zdjęć + utworzenie realizacji
 *
 * Idempotentne: zdjęcia rozpoznaje po `legacySourceUrl` (`seed://realizacje/<plik>`), realizacje po adresie (slug).
 * Istniejącej realizacji nie nadpisuje, bo Michał mógł już poprawić teksty w panelu; drugie uruchomienie niczego nie dubluje.
 * Wyjątki (tylko gdy nikt tego ręcznie nie zmieniał): dopina brakujący link do karty katalogu i poprawia układ zdjęć
 * wprowadzony błędnie przez pierwszą wersję seeda (patrz `previousPhotos` w `realizacje-data.ts`).
 * Dane nie mają prawa trafić na produkcję: skrypt działa tylko z NEON_BRANCH=staging (jak `seed-staging.ts`).
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import type { Media } from '../src/payload-types'
import { SEED_WORKS, type SeedWork } from './realizacje-data'
import { matchProduct, planPhotos, type CatalogProduct, type ProductMatch } from './realizacje-logic'

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
    depth: 1,
    limit: 100,
    overrideAccess: true,
    pagination: false,
  })
  const existingBySlug = new Map(existingWorks.docs.map((work) => [work.slug, work]))

  // Karty katalogu raz: dopasowanie po id posta z Facebooka siedzi w JSON-ie, więc filtrujemy tu, nie w zapytaniu.
  const catalog = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
  })
  const catalogProducts: CatalogProduct[] = catalog.docs.map((product) => ({
    id: product.id,
    name: product.name,
    status: product._status,
    archived: product.archived,
    facebookPayload: product.source?.facebookPayload,
  }))
  const describeProduct = (work: SeedWork, match: ProductMatch) => {
    if (!work.product) return 'bez linku do katalogu'
    if (match) return `link do „${match.product.name}” (po ${match.by === 'post' ? 'poście z Facebooka' : 'nazwie'})`
    return `BEZ linku: nie ma opublikowanej karty (${work.product.postIds?.length ? 'post ' + work.product.postIds.join(' / ') + ', ' : ''}nazwa „${work.product.name ?? '-'}”)`
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
  const buildPhotos = async (photos: SeedWork['photos']) => {
    const result = []
    for (const photo of photos) {
      const media = await ensureMedia(photo.file, photo.alt)
      result.push({ image: media.id, alt: photo.alt })
    }
    return result
  }
  // Skrypt działa poza Next.js: odświeżanie strony (revalidateTag) rzuciłoby tu błąd.
  const context = { skipFrontendRevalidation: true }

  let created = 0
  let updated = 0
  for (const [position, work] of SEED_WORKS.entries()) {
    const match = matchProduct(catalogProducts, work.product)
    const productNote = describeProduct(work, match)
    const existing = existingBySlug.get(work.slug)

    if (!existing) {
      if (!applyChanges) {
        console.log(`+ ${work.slug}: zdjęcia: ${work.photos.length}, ${productNote}`)
        continue
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
          photos: await buildPhotos(work.photos),
          product: match?.product.id ?? null,
          needsConfirmation: true,
          featured: Boolean(work.featured),
          position,
          _status: 'published',
        },
        draft: false,
        overrideAccess: true,
        context,
      })
      created += 1
      console.log(`+ ${work.slug}: utworzona (zdjęcia: ${work.photos.length}, ${productNote})`)
      continue
    }

    // Istniejącej realizacji nie nadpisujemy. Wyjątki, oba tylko wtedy, gdy nikt nie zmieniał tego ręcznie:
    // (1) puste „Powiązany pierścionek” uzupełniamy znalezioną kartą, (2) zdjęcia ułożone jak w pierwszej wersji seeda
    // przestawiamy na obecny układ (tanzanit: okładką są zdjęcia „po”).
    const changes: Record<string, unknown> = {}
    const notes: string[] = []
    let willChange = false
    if (!existing.product && match) {
      changes.product = match.product.id
      willChange = true
      notes.push(`dopięty link do „${match.product.name}” (po ${match.by === 'post' ? 'poście z Facebooka' : 'nazwie'})`)
    }
    const current = (existing.photos ?? []).map((photo) => {
      const media = typeof photo.image === 'object' ? photo.image : null
      const file = media?.legacySourceUrl?.startsWith('seed://realizacje/') ? media.legacySourceUrl.slice('seed://realizacje/'.length) : null
      return { file, alt: photo.alt }
    })
    const plan = planPhotos(current, work)
    if (plan === 'przestaw') {
      willChange = true
      if (applyChanges) changes.photos = await buildPhotos(work.photos)
      notes.push('zdjęcia przestawione na nowy układ')
    } else if (plan === 'reczne' && work.previousPhotos) {
      notes.push('zdjęcia zmienione ręcznie w panelu, zostawiam (nowy układ z seeda: okładką zdjęcia „po”)')
    }

    if (!willChange) {
      console.log(`= ${work.slug}: już istnieje${notes.length ? ', ' + notes.join('; ') : ', bez zmian'}`)
      continue
    }
    if (!applyChanges) {
      console.log(`~ ${work.slug}: ${notes.join('; ')}`)
      continue
    }
    await payload.update({ collection: 'works', id: existing.id, data: changes, draft: false, overrideAccess: true, context })
    updated += 1
    console.log(`~ ${work.slug}: ${notes.join('; ')}`)
  }

  if (applyChanges) {
    const total = await payload.count({ collection: 'works', overrideAccess: true, where: { _status: { equals: 'published' } } })
    console.log(`Gotowe: utworzono ${created}, poprawiono ${updated}, opublikowanych realizacji na stagingu: ${total.totalDocs}.`)
    console.log('Strona trzyma listę realizacji w pamięci do godziny; zapis dowolnej realizacji w panelu odświeża ją od razu.')
  } else {
    console.log('To było sprawdzenie. Zapis: npm run staging:realizacje -- --apply')
  }
} finally {
  await payload.destroy()
}
// Połączenia (pula bazy, sharp) potrafią zatrzymać proces po zakończeniu pracy.
process.exit(process.exitCode ?? 0)
