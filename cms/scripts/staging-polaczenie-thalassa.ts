/**
 * Thalassa jako zielony wariant Aiona na staging (lista PZ Nowak 5.2, wzorzec AB).
 *
 *   npm run staging:thalassa              sprawdzenie: nic nie zapisuje, pokazuje plan
 *   npm run staging:thalassa -- --apply   zapis
 *
 * Co robi (`--apply`), w tej kolejności:
 *  1. Aion: prawdziwe zdjęcia (i film) Thalassy jako wariant „Zielone i białe diamenty” (kółko zielone, bez plakietki
 *     „Wizualizacja”) w miejscu dawnej zielonej wizualizacji „Szmaragd i diamenty”; pliki Media Thalassy są używane
 *     ponownie, nic się nie wgrywa. Opis fasonu z jednym zdaniem o tym wariancie. Gdy Thalassa była „Na stronie
 *     głównej”, miejsce przejmuje Aion.
 *  2. Thalassa: archiwum (wycofana z publikacji, nie kasowana), dopiero po udanym zapisie Aiona.
 * Przekierowanie 308 (`/pierscionki/thalassa` → `/pierscionki/aion?kamien=zielone-i-biale-diamenty`) jest w kodzie
 * (`src/lib/legacy-redirects.ts`): działa po wdrożeniu kodu.
 *
 * Idempotentne: drugie uruchomienie niczego nie zmienia. Tekst poprawiony w panelu zostaje. Tylko NEON_BRANCH=staging.
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import type { Media, Product } from '../src/payload-types'
import {
  assetId,
  featuredTransfer,
  imageIds,
  MERGE,
  planArchive,
  planGreen,
  planText,
  TARGET,
  videoId,
} from './polaczenie-thalassa-logic'
import { knownTexts } from './opisy-ac-logic'

const applyChanges = process.argv.includes('--apply')

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:thalassa musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
}

const payload = await getPayload({ config: await config })

const problems = (error: unknown): string => {
  const errors = (error as { data?: { errors?: Array<{ path?: string; message?: string }> } })?.data?.errors
  if (errors?.length) return errors.map((e) => `${e.path ?? '?'}: ${e.message ?? '?'}`).join('; ')
  return error instanceof Error ? error.message : String(error)
}

try {
  if (applyChanges) {
    console.log('Migracja bazy (tylko oczekujące)…')
    await payload.db.migrate()
  }
  try {
    await payload.find({ collection: 'products', depth: 0, limit: 1, overrideAccess: true })
  } catch {
    console.log('Baza nie ma jeszcze wszystkich kolumn: z --apply najpierw wykona się migracja.')
    process.exit(0)
  }

  const found = await payload.find({
    collection: 'products',
    depth: 1,
    draft: true,
    limit: 10,
    overrideAccess: true,
    pagination: false,
    where: { slug: { in: [TARGET.slug, MERGE.slug] } },
  })
  const bySlug = new Map(found.docs.map((doc) => [doc.slug as string, doc]))
  // Skrypt działa poza Next.js: odświeżanie strony (revalidateTag) rzuciłoby tu błąd.
  const context = { skipFrontendRevalidation: true }

  const target = bySlug.get(TARGET.slug)
  if (!target) throw new Error(`Nie ma karty „${TARGET.slug}” na stagingu`)
  if (target.name !== TARGET.name) throw new Error(`Karta ${TARGET.slug} nazywa się „${target.name}”, oczekiwana „${TARGET.name}”`)
  if (target._status !== 'published' || target.archived) {
    throw new Error(`Karta ${TARGET.slug} nie jest opublikowana (${target._status}${target.archived ? ', archiwalna' : ''}), przerywam`)
  }
  const source = bySlug.get(MERGE.slug)

  type DocVariant = NonNullable<Product['stoneVariants']>[number]
  /** Wariant do zapisu: obrazy jako id (zapis z obiektami Media nie przechodzi). */
  const asInput = (variant: DocVariant) => ({
    ...variant,
    image: assetId(variant.image as number | Media) as number,
    moreImages: (variant.moreImages ?? []).map((asset) => assetId(asset as number | Media) as number),
    video: assetId(variant.video as number | Media | null | undefined),
  })

  const notes: string[] = []
  const data: Partial<Product> = {}

  // 1a. Opis fasonu.
  const text = planText(target, knownTexts(target.id, target.name))
  notes.push(`opis: ${text.note}`)
  if (text.action === 'zmien') Object.assign(data, text.data)

  // 1b. Zielony wariant z prawdziwych zdjęć Thalassy.
  if (!source) {
    notes.push(`! nie ma karty „${MERGE.slug}” na stagingu, wariant „${MERGE.stone}” pomijam`)
  } else if (source.name !== MERGE.name) {
    notes.push(`! karta ${MERGE.slug} nazywa się „${source.name}”, nie „${MERGE.name}”, wariant pomijam`)
  } else {
    const variants = (target.stoneVariants ?? []).map(asInput)
    const images = imageIds(source.media)
    const video = videoId(source.media)
    const { plan, removeAt } = planGreen(variants, images, video)
    notes.push(`wariant: ${plan.note}`)
    const entry = {
      stone: MERGE.stone,
      swatch: MERGE.swatch,
      image: images[0],
      moreImages: images.slice(1),
      video,
      alt: MERGE.alt,
      isVisualization: false,
    }
    if (plan.action === 'film') {
      data.stoneVariants = variants.map((variant) => (variant.stone === MERGE.stone ? { ...variant, video } : variant))
    } else if (plan.action === 'dodaj' || plan.action === 'podmien') {
      const rest = removeAt < 0 ? variants : variants.filter((_, i) => i !== removeAt)
      const at = plan.action === 'podmien' ? rest.findIndex((variant) => variant.stone.trim().toLowerCase() === MERGE.stone.toLowerCase()) : -1
      if (at >= 0) rest[at] = entry
      else rest.splice(removeAt < 0 ? rest.length : removeAt, 0, entry)
      data.stoneVariants = rest
    } else if (removeAt >= 0 && plan.action === 'juz') {
      // Prawdziwy wariant już jest, a zielona wizualizacja została: sprzątamy.
      data.stoneVariants = variants.filter((_, i) => i !== removeAt)
      notes.push(`usuwam wizualizację „${variants[removeAt].stone}”`)
    }
  }

  // 1c. Strona główna: miejsce Thalassy przejmuje Aion.
  if (source) {
    const featured = featuredTransfer(target, [source])
    if (featured) {
      Object.assign(data, featured)
      notes.push(`strona główna: Aion przejmuje miejsce (kolejność ${featured.homeOrder})`)
    }
  }

  let failed = false
  if (!Object.keys(data).length) {
    console.log(`= ${TARGET.slug}: ${notes.join('; ')}`)
  } else if (!applyChanges) {
    console.log(`~ ${TARGET.slug}: ${notes.join('; ')}`)
  } else {
    try {
      await payload.update({ collection: 'products', id: target.id, data: { ...data, _status: 'published' }, draft: false, overrideAccess: true, context })
      console.log(`~ ${TARGET.slug}: ${notes.join('; ')}, zapisane`)
    } catch (error) {
      failed = true
      console.log(`! ${TARGET.slug}: zapis nie przeszedł: ${problems(error)}; Thalassy nie archiwizuję`)
      process.exitCode = 1
    }
  }

  // 2. Archiwizacja Thalassy (po tym, jak Aion ma już jej wariant).
  const plan = planArchive(source, MERGE)
  if (plan.action !== 'archiwizuj') {
    console.log(`${plan.action === 'juz' ? '=' : '!'} ${MERGE.slug}: ${plan.note}`)
  } else if (!applyChanges) {
    console.log(`~ ${MERGE.slug}: ${plan.note}`)
  } else if (!failed) {
    const fresh = await payload.findByID({ collection: 'products', id: target.id, depth: 0, overrideAccess: true })
    if (!(fresh.stoneVariants ?? []).some((variant) => variant.stone === MERGE.stone && variant.isVisualization === false)) {
      console.log(`! ${MERGE.slug}: Aion nie ma wariantu „${MERGE.stone}” z prawdziwymi zdjęciami, nie archiwizuję`)
      process.exitCode = 1
    } else {
      try {
        await payload.update({
          collection: 'products',
          id: source!.id,
          data: { archived: true, featuredOnHome: false, _status: 'draft' },
          draft: false,
          overrideAccess: true,
          context,
        })
        console.log(`~ ${MERGE.slug}: ${plan.note}, wycofana z publikacji`)
      } catch (error) {
        console.log(`! ${MERGE.slug}: archiwizacja nie przeszła: ${problems(error)}`)
        process.exitCode = 1
      }
    }
  }

  if (applyChanges) {
    console.log('Gotowe. Strona trzyma listę pierścionków w pamięci do godziny; zapis dowolnej karty w panelu odświeża ją od razu.')
    console.log('Przekierowanie Thalassa → Aion działa po wdrożeniu kodu tego PR.')
  } else {
    console.log('To było sprawdzenie. Zapis: npm run staging:thalassa -- --apply')
  }
} finally {
  await payload.destroy()
}
process.exit(process.exitCode ?? 0)
