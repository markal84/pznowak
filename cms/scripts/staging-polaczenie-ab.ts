/**
 * Jeden fason zamiast trzech na staging (zlecenie AB): Urania + Pyrrha + Nyx.
 *
 *   npm run staging:polaczenie              sprawdzenie: nic nie zapisuje, pokazuje plan
 *   npm run staging:polaczenie -- --apply   zapis
 *
 * Co robi (`--apply`), w tej kolejności:
 *  1. Urania: warianty „Rubin i diamenty” (prawdziwe zdjęcia i film Pyrrhy) i „Topaz London blue i diamenty” (zdjęcia i film
 *     Nyx), bez plakietki „Wizualizacja”; pliki Media tych kart są używane ponownie, nic się nie wgrywa. Jeden opis fasonu.
 *     Gdy Pyrrha albo Nyx była „Na stronie głównej”, miejsce przejmuje Urania.
 *  2. Pyrrha i Nyx: archiwum (wycofane z publikacji, nie kasowane). Dopiero po udanym zapisie Uranii, żeby przy błędzie
 *     żaden pierścionek nie zniknął ze strony.
 * Przekierowania 308 (`/pierscionki/pyrrha` → `/pierscionki/urania?kamien=rubin-i-diamenty` itd.) są w kodzie
 * (`src/lib/legacy-redirects.ts`), nie w bazie: działają po wdrożeniu kodu.
 *
 * Idempotentne: drugie uruchomienie niczego nie zmienia. Tekst, który ktoś poprawił w panelu, zostaje (komunikat „pomin”).
 * Działa tylko z NEON_BRANCH=staging (jak `seed-staging.ts` i `staging-warianty-v.ts`).
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import type { Media, Product } from '../src/payload-types'
import { stoneSlug } from '../src/lib/stone-variants'
import { loadSpecs as loadOpisySpecs } from './opisy-u-logic'
import {
  assetId,
  featuredTransfer,
  imageIds,
  videoId,
  MERGES,
  planArchive,
  planText,
  planVariant,
  TARGET,
} from './polaczenie-ab-logic'

const applyChanges = process.argv.includes('--apply')

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:polaczenie musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
}

const payload = await getPayload({ config: await config })

const problems = (error: unknown): string => {
  const errors = (error as { data?: { errors?: Array<{ path?: string; message?: string }> } })?.data?.errors
  if (errors?.length) return errors.map((e) => `${e.path ?? '?'}: ${e.message ?? '?'}`).join('; ')
  return error instanceof Error ? error.message : String(error)
}

try {
  const slugs = [TARGET.slug, ...MERGES.map((merge) => merge.slug)]
  const found = await payload.find({
    collection: 'products',
    depth: 1,
    draft: true,
    limit: 50,
    overrideAccess: true,
    pagination: false,
    where: { slug: { in: slugs } },
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

  // 1a. Opis fasonu. Dozwolony wyjściowy tekst to ten ze zlecenia U.
  const known = loadOpisySpecs().find((spec) => spec.id === target.id)
  if (!known?.lead || !known.description) throw new Error(`opisy-u.json nie ma tekstu karty id ${target.id} (Urania)`)
  const text = planText(target, { lead: known.lead, description: known.description })
  notes.push(`opis: ${text.note}`)
  if (text.action === 'zmien') Object.assign(data, text.data)

  // 1b. Warianty z prawdziwych zdjęć kart Pyrrha i Nyx.
  const existing = target.stoneVariants ?? []
  let variants = existing.map(asInput)
  let variantsChanged = false
  for (const merge of MERGES) {
    const source = bySlug.get(merge.slug)
    if (!source) {
      notes.push(`! nie ma karty „${merge.slug}” na stagingu, wariant „${merge.stone}” pomijam`)
      continue
    }
    if (source.name !== merge.name) {
      notes.push(`! karta ${merge.slug} nazywa się „${source.name}”, nie „${merge.name}”, wariant „${merge.stone}” pomijam`)
      continue
    }
    const images = imageIds(source.media)
    const video = videoId(source.media)
    const plan = planVariant(variants, merge, images, video)
    notes.push(`wariant: ${plan.note}`)
    if (plan.action === 'film') {
      variants = variants.map((variant) => (stoneSlug(variant.stone) === stoneSlug(merge.stone) ? { ...variant, video } : variant))
      variantsChanged = true
      continue
    }
    if (plan.action !== 'dodaj' && plan.action !== 'podmien') continue
    const entry = {
      stone: merge.stone,
      swatch: merge.swatch,
      image: images[0],
      moreImages: images.slice(1),
      video,
      alt: merge.alt,
      isVisualization: false,
    }
    const at = variants.findIndex((variant) => stoneSlug(variant.stone) === stoneSlug(merge.stone))
    variants = plan.action === 'dodaj' || at < 0 ? [...variants, entry] : variants.map((variant, i) => (i === at ? entry : variant))
    variantsChanged = true
  }
  if (variantsChanged) data.stoneVariants = variants

  // 1c. Strona główna: miejsce Pyrrhy i Nyx przejmuje Urania.
  const sources = MERGES.map((merge) => bySlug.get(merge.slug)).filter((doc): doc is Product => Boolean(doc))
  const featured = featuredTransfer(target, sources)
  if (featured) {
    Object.assign(data, featured)
    notes.push(`strona główna: Urania przejmuje miejsce (kolejność ${featured.homeOrder})`)
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
      console.log(`! ${TARGET.slug}: zapis nie przeszedł: ${problems(error)}; Pyrrhy i Nyx nie archiwizuję`)
      process.exitCode = 1
    }
  }

  // 2. Archiwizacja Pyrrhy i Nyx (po tym, jak Urania ma już ich warianty).
  const targetHasVariants = (doc: Product, stone: string) =>
    (doc.stoneVariants ?? []).some((variant) => variant.stone === stone)
  for (const merge of MERGES) {
    const source = bySlug.get(merge.slug)
    const plan = planArchive(source, merge)
    if (plan.action !== 'archiwizuj') {
      console.log(`${plan.action === 'juz' ? '=' : '!'} ${merge.slug}: ${plan.note}`)
      continue
    }
    if (!applyChanges) {
      console.log(`~ ${merge.slug}: ${plan.note}`)
      continue
    }
    if (failed) continue
    // Przy `--apply` Urania jest już zapisana; bez wariantu (np. brak zdjęć karty) karty nie wycofujemy.
    const fresh = await payload.findByID({ collection: 'products', id: target.id, depth: 0, overrideAccess: true })
    if (!targetHasVariants(fresh, merge.stone)) {
      console.log(`! ${merge.slug}: Urania nie ma wariantu „${merge.stone}”, nie archiwizuję`)
      process.exitCode = 1
      continue
    }
    try {
      await payload.update({
        collection: 'products',
        id: source!.id,
        data: { archived: true, featuredOnHome: false, _status: 'draft' },
        draft: false,
        overrideAccess: true,
        context,
      })
      console.log(`~ ${merge.slug}: ${plan.note}, wycofana z publikacji`)
    } catch (error) {
      console.log(`! ${merge.slug}: archiwizacja nie przeszła: ${problems(error)}`)
      process.exitCode = 1
    }
  }

  if (applyChanges) {
    console.log('Gotowe. Strona trzyma listę pierścionków w pamięci do godziny; zapis dowolnej karty w panelu odświeża ją od razu.')
    console.log('Przekierowania Pyrrha/Nyx → Urania działają po wdrożeniu kodu tego PR.')
  } else {
    console.log('To było sprawdzenie. Zapis: npm run staging:polaczenie -- --apply')
  }
} finally {
  await payload.destroy()
}
// Połączenia (pula bazy) potrafią zatrzymać proces po zakończeniu pracy.
process.exit(process.exitCode ?? 0)
