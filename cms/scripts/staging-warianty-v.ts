/**
 * „Zamów z innym kamieniem” na staging (zlecenie V): migracja bazy, obrazy wariantów do Media, pole `stoneVariants`
 * na kartach z `seed/warianty/warianty.json` i poprawki danych kart (Leto → morganit, Aion → różowe szafiry; zbędne warianty z `removeStones`).
 *
 *   npm run staging:warianty              sprawdzenie: nic nie zapisuje, pokazuje plan
 *   npm run staging:warianty -- --apply   migracja + wgranie obrazów + zapis wariantów i poprawek
 *   npm run staging:warianty -- --apply --podmien-obraz aion:"Szafir granatowy i diamenty"
 *                                         tylko to: wgrywa nowy plik wariantu z seeda i podmienia obraz tego jednego wariantu
 *                                         (bez --apply sam plan); nic innego na kartach nie rusza
 *
 * Idempotentne: obrazy rozpoznaje po `legacySourceUrl` (`seed://warianty/<plik>`), warianty po obrazie albo nazwie
 * kamienia (istniejących nie nadpisuje, ręcznie dodane w panelu zostają), poprawki kart tylko przy dawnym kamieniu.
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
  replacementKey,
  SOURCE_PREFIX,
  sourceKey,
  type VariantSpec,
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
console.log(`Pliki: ${variantCount} obrazów wariantów dla ${specs.length} kart są w cms/seed/warianty/obrazy.`)

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
    await payload.find({ collection: 'products', depth: 0, limit: 1, overrideAccess: true, select: { stoneVariants: true } })
  } catch {
    tableReady = false
  }
  if (!tableReady) {
    console.log('Tabela wariantów jeszcze nie istnieje: z --apply najpierw wykona się migracja.')
    if (!applyChanges) process.exit(0)
    throw new Error('Po migracji nie ma tabeli cms_products_stone_variants')
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

  const ensureMedia = async (variant: VariantSpec): Promise<Media> => {
    const existing = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { legacySourceUrl: { equals: sourceKey(variant.file) } },
    })
    if (existing.docs[0]) return existing.docs[0]
    const data = await readFile(path.join(IMAGES_DIR, variant.file))
    return payload.create({
      collection: 'media',
      data: { alt: variant.alt, legacySourceUrl: sourceKey(variant.file) },
      file: { data, mimetype: 'image/webp', name: variant.file, size: data.byteLength },
      overrideAccess: true,
    })
  }
  // Skrypt działa poza Next.js: odświeżanie strony (revalidateTag) rzuciłoby tu błąd.
  const context = { skipFrontendRevalidation: true }
  const mediaId = (asset: number | Media | null | undefined) => (typeof asset === 'object' && asset ? asset.id : asset)

  if (replaceTarget) {
    const spec = specs.find((s) => s.slug === replaceTarget.slug)
    const variant = spec && findReplaceTarget(spec.variants, replaceTarget.stone)
    if (!spec || !variant) throw new Error(`Nie ma w warianty.json wariantu „${replaceTarget.stone}” karty ${replaceTarget.slug}`)
    const doc = bySlug.get(spec.slug)
    if (!doc) throw new Error(`${spec.slug}: nie ma karty o tym adresie na stagingu`)
    const index = (doc.stoneVariants ?? []).findIndex((v) => findReplaceTarget([v], variant.stone))
    if (index < 0) throw new Error(`${spec.slug}: karta nie ma jeszcze wariantu „${variant.stone}” (najpierw zwykły staging:warianty --apply)`)
    const data = await readFile(path.join(IMAGES_DIR, variant.file))
    const key = replacementKey(variant.file, createHash('sha1').update(data).digest('hex').slice(0, 10))
    const current = doc.stoneVariants![index]
    const currentKey = typeof current.image === 'object' && current.image ? current.image.legacySourceUrl : null
    if (currentKey === key) {
      console.log(`= ${spec.slug}: obraz „${variant.stone}” jest już podmieniony`)
    } else if (!applyChanges) {
      console.log(`~ ${spec.slug}: podmienię obraz wariantu „${variant.stone}” na ${variant.file} (${Math.round(data.byteLength / 1024)} KB)`)
      console.log('To było sprawdzenie. Zapis: dodaj --apply')
    } else {
      const found = await payload.find({ collection: 'media', depth: 0, limit: 1, overrideAccess: true, where: { legacySourceUrl: { equals: key } } })
      const media =
        found.docs[0] ??
        (await payload.create({
          collection: 'media',
          data: { alt: variant.alt, legacySourceUrl: key },
          file: { data, mimetype: 'image/webp', name: variant.file, size: data.byteLength },
          overrideAccess: true,
        }))
      const stoneVariants = (doc.stoneVariants ?? []).map((v, i) => ({ ...v, image: i === index ? media.id : (mediaId(v.image) as number) }))
      await payload.update({ collection: 'products', id: doc.id, data: { stoneVariants, _status: 'published' }, draft: false, overrideAccess: true, context })
      console.log(`~ ${spec.slug}: obraz wariantu „${variant.stone}” podmieniony (Media ${media.id}), reszta karty bez zmian`)
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
    const current = docVariants.map((variant) => {
      const media = typeof variant.image === 'object' ? variant.image : null
      const key = media?.legacySourceUrl ?? ''
      return { file: key.startsWith(SOURCE_PREFIX) ? key.slice(SOURCE_PREFIX.length) : null, stone: variant.stone }
    })
    const missing = missingVariants(current, spec.variants)
    if (spec.variants.length) {
      notes.push(
        missing.length
          ? `warianty: dopisuję ${missing.map((v) => v.stone).join(', ')} (jest ${current.length})`
          : `warianty: wszystkie ${spec.variants.length} już są`,
      )
    }
    if ((missing.length || removed) && applyChanges) {
      const added = []
      for (const variant of missing) {
        const media = await ensureMedia(variant)
        added.push({ stone: variant.stone, swatch: variant.swatch, image: media.id, alt: variant.alt, isVisualization: variant.isVisualization })
      }
      data.stoneVariants = [
        ...docVariants.map((variant) => ({ ...variant, image: mediaId(variant.image) as number })),
        ...added,
      ]
    }

    if (!Object.keys(data).length && !missing.length && !removed) {
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
