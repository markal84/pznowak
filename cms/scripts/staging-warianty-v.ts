/**
 * „Zamów z innym kamieniem” na staging (zlecenie V): migracja bazy, obrazy wariantów do Media, pole `stoneVariants`
 * na kartach z `seed/warianty/warianty.json` i poprawki danych kart (Leto → morganit, Aion → różowe szafiry; zbędne warianty z `removeStones`).
 *
 *   npm run staging:warianty              sprawdzenie: nic nie zapisuje, pokazuje plan
 *   npm run staging:warianty -- --apply   migracja + wgranie obrazów + zapis wariantów i poprawek
 *   npm run staging:warianty -- --apply --podmien-obraz aion:"Szafir granatowy i diamenty"
 *                                         tylko to: wgrywa na nowo pliki wariantu z seeda (np. poprawiony obraz o tej samej
 *                                         nazwie) i podmienia obrazy tego jednego wariantu (bez --apply sam plan); nic innego nie rusza
 *
 * Idempotentne: obrazy rozpoznaje po `legacySourceUrl` (`seed://warianty/<plik>`), warianty po pierwszym obrazie albo
 * nazwie kamienia (ręcznie dodane w panelu zostają), poprawki kart tylko przy dawnym kamieniu.
 * Zlecenie Y: wariant ma listę obrazów (`files`: „Obraz” + „Kolejne obrazy”, w kolejności zdjęć karty). Istniejący wariant
 * dostaje nową listę z JSON-a tylko wtedy, gdy wszystkie jego obrazy są z seeda (obraz wgrany w panelu zostaje); nazwa,
 * kolor kółka i alt wariantu bez zmian.
 * Kolejność ze zleceniem U: jeśli opisy U nie są jeszcze zapisane na kartach, które ten skrypt zmienia, zatrzymuje się
 * (zapis zmieniłby `updatedAt`, a `staging:opisy` pominąłby wtedy te karty jako poprawione ręcznie).
 * Działa tylko z NEON_BRANCH=staging (jak `seed-staging.ts` i `seed-realizacje.ts`).
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import type { Media, Product } from '../src/payload-types'
import { loadSpecs as loadOpisySpecs, planCard as planOpisCard } from './opisy-u-logic'
import {
  checkImages,
  findReplaceTarget,
  fixMediaAlts,
  IMAGES_DIR,
  keptVariants,
  loadSpecs,
  missingVariants,
  parseReplaceArg,
  planCardFix,
  planVariantImages,
  replacementKey,
  seedFile,
  sourceKey,
  type CurrentVariant,
} from './warianty-v-logic'

const applyChanges = process.argv.includes('--apply')
const replaceIndex = process.argv.indexOf('--podmien-obraz')
const replaceTarget = replaceIndex >= 0 ? parseReplaceArg(process.argv[replaceIndex + 1]) : null

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:warianty musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
}

// Sprawdzenie plików nie dotyka bazy: brakujący albo za duży obraz przerywa od razu.
const specs = loadSpecs()
const imageProblems = checkImages(specs)
if (imageProblems.length) throw new Error(`Obrazy wariantów:\n${imageProblems.join('\n')}`)
const variantCount = specs.reduce((sum, spec) => sum + spec.variants.length, 0)
const imageCount = specs.reduce((sum, spec) => sum + spec.variants.reduce((n, v) => n + v.files.length, 0), 0)
console.log(`Pliki: ${imageCount} obrazów ${variantCount} wariantów dla ${specs.length} kart są w cms/seed/warianty/obrazy.`)

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

  let tableReady = true
  try {
    // Pełny odczyt karty: dotyka też tabeli „Kolejnych obrazów” (Y, cms_products_rels), nie tylko wariantów (V).
    await payload.find({ collection: 'products', depth: 0, limit: 1, overrideAccess: true })
  } catch {
    tableReady = false
  }
  if (!tableReady) {
    console.log('Tabele wariantów (V) albo kolejnych obrazów (Y) jeszcze nie istnieją: z --apply najpierw wykona się migracja.')
    if (!applyChanges) process.exit(0)
    throw new Error('Po migracji nadal brak tabel cms_products_stone_variants / cms_products_rels')
  }

  const found = await payload.find({
    collection: 'products',
    depth: 1,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    where: { slug: { in: specs.map((spec) => spec.slug) } },
  })
  const bySlug = new Map(found.docs.map((doc) => [doc.slug as string, doc]))

  // Strażnik kolejności ze zleceniem U (patrz komentarz na górze).
  const opisy = new Map(loadOpisySpecs().map((spec) => [spec.id, spec]))
  const waitingForU = found.docs.filter((doc) => {
    const spec = opisy.get(doc.id)
    return spec && planOpisCard({ ...doc, status: doc._status }, spec).action === 'zmien'
  })
  if (waitingForU.length) {
    const names = waitingForU.map((doc) => doc.name).join(', ')
    console.log(`! Opisy ze zlecenia U nie są jeszcze zapisane na: ${names}. Najpierw: npm run staging:opisy -- --apply`)
    if (applyChanges) throw new Error('Przerwane: najpierw staging:opisy (zlecenie U), potem staging:warianty')
  }

  /** Media obrazu z seeda (`key` = `legacySourceUrl`; domyślnie `seed://warianty/<plik>`), wgrane raz. */
  const ensureMedia = async (file: string, alt: string, key: string = sourceKey(file)): Promise<Media> => {
    const existing = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { legacySourceUrl: { equals: key } },
    })
    if (existing.docs[0]) return existing.docs[0]
    const data = await readFile(path.join(IMAGES_DIR, file))
    return payload.create({
      collection: 'media',
      data: { alt, legacySourceUrl: key },
      file: { data, mimetype: 'image/webp', name: file, size: data.byteLength },
      overrideAccess: true,
    })
  }
  // Skrypt działa poza Next.js: odświeżanie strony (revalidateTag) rzuciłoby tu błąd.
  const context = { skipFrontendRevalidation: true }
  const mediaId = (asset: number | Media | null | undefined) => (typeof asset === 'object' && asset ? asset.id : asset)
  type DocVariant = NonNullable<Product['stoneVariants']>[number]
  /** Wariant do zapisu: obrazy jako id (zapis z obiektami Media nie przechodzi), „Kolejne obrazy” zostają. */
  const asInput = (variant: DocVariant) => ({
    ...variant,
    image: mediaId(variant.image) as number,
    moreImages: (variant.moreImages ?? []).map((asset) => mediaId(asset) as number),
  })
  const keyOf = (asset: number | Media | null | undefined) => (typeof asset === 'object' && asset ? asset.legacySourceUrl : null)
  /** Pliki z seeda obrazów wariantu (główny, potem kolejne); `null` = obraz spoza seeda. */
  const currentOf = (variant: DocVariant): CurrentVariant => ({
    stone: variant.stone,
    files: [variant.image, ...(variant.moreImages ?? [])].map((asset) => seedFile(keyOf(asset))),
  })

  if (replaceTarget) {
    const spec = specs.find((s) => s.slug === replaceTarget.slug)
    const variant = spec && findReplaceTarget(spec.variants, replaceTarget.stone)
    if (!spec || !variant) throw new Error(`Nie ma w warianty.json wariantu „${replaceTarget.stone}” karty ${replaceTarget.slug}`)
    const doc = bySlug.get(spec.slug)
    if (!doc) throw new Error(`${spec.slug}: nie ma karty o tym adresie na stagingu`)
    const index = (doc.stoneVariants ?? []).findIndex((v) => findReplaceTarget([v], variant.stone))
    if (index < 0) throw new Error(`${spec.slug}: karta nie ma jeszcze wariantu „${variant.stone}” (najpierw zwykły staging:warianty --apply)`)
    // Klucz z skrótem treści: poprawiony plik o tej samej nazwie to nowe Media, niezmieniony – to samo co poprzednio.
    const keys = await Promise.all(
      variant.files.map(async (file) =>
        replacementKey(file, createHash('sha1').update(await readFile(path.join(IMAGES_DIR, file))).digest('hex').slice(0, 10)),
      ),
    )
    const current = doc.stoneVariants![index]
    const currentKeys = [current.image, ...(current.moreImages ?? [])].map(keyOf)
    if (currentKeys.length === keys.length && currentKeys.every((key, i) => key === keys[i])) {
      console.log(`= ${spec.slug}: obrazy „${variant.stone}” są już podmienione`)
    } else if (!applyChanges) {
      console.log(`~ ${spec.slug}: podmienię obrazy wariantu „${variant.stone}” na ${variant.files.join(', ')}`)
      console.log('To było sprawdzenie. Zapis: dodaj --apply')
    } else {
      const media: Media[] = []
      for (const [i, file] of variant.files.entries()) media.push(await ensureMedia(file, variant.alt, keys[i]))
      const stoneVariants = (doc.stoneVariants ?? []).map((v, i) =>
        i === index ? { ...asInput(v), image: media[0].id, moreImages: media.slice(1).map((m) => m.id) } : asInput(v),
      )
      await payload.update({ collection: 'products', id: doc.id, data: { stoneVariants, _status: 'published' }, draft: false, overrideAccess: true, context })
      console.log(`~ ${spec.slug}: obrazy wariantu „${variant.stone}” podmienione (Media ${media.map((m) => m.id).join(', ')}), reszta karty bez zmian`)
    }
    await payload.destroy()
    process.exit(0)
  }

  let changed = 0
  for (const spec of specs) {
    const doc = bySlug.get(spec.slug)
    if (!doc) {
      console.log(`! ${spec.slug}: nie ma karty o tym adresie na stagingu, pomijam`)
      continue
    }
    if (doc.name !== spec.name) {
      console.log(`! ${spec.slug}: nazwa „${doc.name}” nie zgadza się z „${spec.name}”, pomijam`)
      continue
    }
    if (doc._status !== 'published') {
      console.log(`! ${spec.slug}: karta nie jest opublikowana (${doc._status}), pomijam`)
      continue
    }

    const data: Partial<Product> = {}
    const notes: string[] = []

    if (spec.card) {
      const plan = planCardFix(doc, spec.card)
      notes.push(`dane: ${plan.note}`)
      if (plan.action === 'zmien') {
        Object.assign(data, plan.data)
        if (plan.mediaAlt) {
          data.media = fixMediaAlts(doc.media ?? [], spec.card).map((entry) => ({ ...entry, asset: mediaId(entry.asset) as number }))
        }
      }
    }

    const docVariants = keptVariants(doc.stoneVariants ?? [], spec.removeStones)
    const removed = (doc.stoneVariants ?? []).length - docVariants.length
    if (removed) notes.push(`warianty: usuwam ${spec.removeStones.join(', ')}`)
    const current = docVariants.map(currentOf)
    const missing = missingVariants(current, spec.variants)
    // Obrazy istniejących wariantów z JSON-a (Y: cała galeria zamiast jednego obrazu).
    const imagePlans = docVariants.map((variant, i) => {
      const target = spec.variants.find((v) => missingVariants([current[i]], [v]).length === 0)
      return target ? { target, plan: planVariantImages(current[i], target) } : null
    })
    const swaps = imagePlans.filter((entry) => entry?.plan.action === 'podmien').length
    if (spec.variants.length) {
      notes.push(
        missing.length
          ? `warianty: dopisuję ${missing.map((v) => v.stone).join(', ')} (jest ${current.length})`
          : `warianty: wszystkie ${spec.variants.length} już są`,
      )
    }
    for (const entry of imagePlans) if (entry && entry.plan.action !== 'zostaw') notes.push(`obrazy: ${entry.plan.note}`)
    if ((missing.length || removed || swaps) && applyChanges) {
      const kept = []
      for (const [i, variant] of docVariants.entries()) {
        const entry = imagePlans[i]
        if (entry?.plan.action !== 'podmien') {
          kept.push(asInput(variant))
          continue
        }
        const media: Media[] = []
        for (const file of entry.target.files) media.push(await ensureMedia(file, variant.alt ?? entry.target.alt))
        kept.push({ ...asInput(variant), image: media[0].id, moreImages: media.slice(1).map((m) => m.id) })
      }
      const added = []
      for (const variant of missing) {
        const media: Media[] = []
        for (const file of variant.files) media.push(await ensureMedia(file, variant.alt))
        added.push({
          stone: variant.stone,
          swatch: variant.swatch,
          image: media[0].id,
          moreImages: media.slice(1).map((m) => m.id),
          alt: variant.alt,
          isVisualization: variant.isVisualization,
        })
      }
      data.stoneVariants = [...kept, ...added]
    }

    if (!Object.keys(data).length && !missing.length && !removed && !swaps) {
      console.log(`= ${spec.slug}: ${notes.join('; ')}`)
      continue
    }
    if (!applyChanges) {
      console.log(`~ ${spec.slug}: ${notes.join('; ')}`)
      continue
    }
    try {
      await payload.update({
        collection: 'products',
        id: doc.id,
        data: { ...data, _status: 'published' },
        draft: false,
        overrideAccess: true,
        context,
      })
      changed += 1
      console.log(`~ ${spec.slug}: ${notes.join('; ')}, zapisane`)
    } catch (error) {
      console.log(`! ${spec.slug}: zapis nie przeszedł: ${problems(error)}`)
      process.exitCode = 1
    }
  }

  if (applyChanges) {
    console.log(`Gotowe: zmienione karty: ${changed}.`)
    console.log('Strona trzyma listę pierścionków w pamięci do godziny; zapis dowolnej karty w panelu odświeża ją od razu.')
  } else {
    console.log('To było sprawdzenie. Zapis: npm run staging:warianty -- --apply')
  }
} finally {
  await payload.destroy()
}
// Połączenia (pula bazy, sharp) potrafią zatrzymać proces po zakończeniu pracy.
process.exit(process.exitCode ?? 0)
