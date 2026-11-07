/**
 * Jeden fason zamiast trzech na staging (lista PZ Nowak, sekcja 5, pkt 1): Harmonia + Eirene + Leto.
 *
 *   npm run staging:harmonia              sprawdzenie: nic nie zapisuje, pokazuje plan
 *   npm run staging:harmonia -- --apply   zapis
 *
 * Co robi (`--apply`), w tej kolejności:
 *  1. Harmonia: wariant „Turmalin malinowy i diamenty” (prawdziwe zdjęcia i film Eirene, bez plakietki „Wizualizacja”;
 *     pliki Media są używane ponownie, nic się nie wgrywa) oraz opis fasonu z `seed/opisy/opisy-ac.json` (to samo
 *     `planAc` co `staging:opisy-ac`; tekst poprawiony ręcznie w panelu zostaje). Gdy Eirene albo Leto była „Na stronie
 *     głównej”, miejsce przejmuje Harmonia.
 *  2. Eirene i Leto: archiwum (wycofane z publikacji, nie kasowane). Dopiero po udanym zapisie Harmonii, żeby przy błędzie
 *     żaden pierścionek nie zniknął ze strony. Leto ma te same zdjęcia co Harmonia, więc nie dostaje wariantu.
 * Przekierowania 308 (`/pierscionki/eirene` → `/pierscionki/harmonia?kamien=turmalin-malinowy-i-diamenty`,
 * `/pierscionki/leto` → `/pierscionki/harmonia`) są w kodzie (`src/lib/legacy-redirects.ts`): działają po wdrożeniu kodu.
 *
 * Idempotentne: drugie uruchomienie niczego nie zmienia. Działa tylko z NEON_BRANCH=staging.
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import type { Media, Product } from '../src/payload-types'
import { stoneSlug } from '../src/lib/stone-variants'
import { knownTexts, loadAcSpecs, planAc } from './opisy-ac-logic'
import { assetId, featuredTransfer, imageIds, planArchive, planVariant, videoId } from './polaczenie-ab-logic'
import { SOURCES, TARGET, VARIANT_MERGES } from './polaczenie-harmonia-logic'

const applyChanges = process.argv.includes('--apply')

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:harmonia musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
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
    // Kolumna filmu wariantu (migracja AB) musi istnieć, zanim cokolwiek odczytamy.
    await payload.find({ collection: 'products', depth: 0, limit: 1, overrideAccess: true })
  } catch {
    console.log('Brakuje kolumny filmu wariantu (migracja AB): z --apply najpierw wykona się migracja.')
    process.exit(0)
  }

  const slugs = [TARGET.slug, ...SOURCES.map((source) => source.slug)]
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

  // 1a. Opis fasonu z opisy-ac.json; „znane” teksty (z U, sprzed połączenia) wolno nadpisać, ręczne poprawki zostają.
  const spec = loadAcSpecs().find((entry) => entry.name === TARGET.name)
  if (!spec) throw new Error(`opisy-ac.json nie ma opisu karty ${TARGET.name}`)
  const text = planAc(target, spec, knownTexts(spec.id, spec.name))
  notes.push(`opis: ${text.note}`)
  if (text.action === 'zmien') Object.assign(data, text.data)

  // 1b. Warianty z prawdziwych zdjęć kart źródłowych (Eirene).
  const existing = target.stoneVariants ?? []
  let variants = existing.map(asInput)
  let variantsChanged = false
  for (const merge of VARIANT_MERGES) {
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

  // 1c. Strona główna: miejsce Eirene i Leto przejmuje Harmonia.
  const sources = SOURCES.map((source) => bySlug.get(source.slug)).filter((doc): doc is Product => Boolean(doc))
  const featured = featuredTransfer(target, sources)
  if (featured) {
    Object.assign(data, featured)
    notes.push(`strona główna: Harmonia przejmuje miejsce (kolejność ${featured.homeOrder})`)
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
      console.log(`! ${TARGET.slug}: zapis nie przeszedł: ${problems(error)}; Eirene i Leto nie archiwizuję`)
      process.exitCode = 1
    }
  }

  // 2. Archiwizacja Eirene i Leto (po tym, jak Harmonia ma już wariant Eirene).
  const targetHasVariants = (doc: Product, stone: string) =>
    (doc.stoneVariants ?? []).some((variant) => variant.stone === stone)
  for (const merge of SOURCES) {
    const source = bySlug.get(merge.slug)
    const plan = planArchive(source, { ...merge, stone: merge.stone ?? '', swatch: 'bialy', alt: '' })
    if (plan.action !== 'archiwizuj') {
      console.log(`${plan.action === 'juz' ? '=' : '!'} ${merge.slug}: ${plan.note}`)
      continue
    }
    if (!applyChanges) {
      console.log(`~ ${merge.slug}: ${plan.note}`)
      continue
    }
    if (failed) continue
    // Przy `--apply` Harmonia jest już zapisana; bez wariantu (np. brak zdjęć karty) karty nie wycofujemy.
    const fresh = await payload.findByID({ collection: 'products', id: target.id, depth: 0, overrideAccess: true })
    if (merge.stone && !targetHasVariants(fresh, merge.stone)) {
      console.log(`! ${merge.slug}: ${TARGET.name} nie ma wariantu „${merge.stone}”, nie archiwizuję`)
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
    console.log('Przekierowania Eirene/Leto → Harmonia działają po wdrożeniu kodu tego PR.')
  } else {
    console.log('To było sprawdzenie. Zapis: npm run staging:harmonia -- --apply')
  }
} finally {
  await payload.destroy()
}
// Połączenia (pula bazy) potrafią zatrzymać proces po zakończeniu pracy.
process.exit(process.exitCode ?? 0)
