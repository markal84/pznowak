/**
 * Zdjęcia pierścionków na dłoni na staging: jedno ujęcie z `seed/dlon/dlon.json` dopisane na koniec galerii karty
 * albo, przy wpisie z `kamien`, na koniec obrazów wariantu (karty połączone w jeden fason: Nyx → Urania,
 * Eirene → Harmonia, Taygete → Iris).
 *
 *   npm run staging:dlon                     sprawdzenie: nic nie zapisuje, pokazuje plan
 *   npm run staging:dlon -- --apply          dopisuje zdjęcia na dłoni
 *   npm run staging:dlon -- --cofnij         plan cofnięcia: które karty stracą zdjęcie na dłoni
 *   npm run staging:dlon -- --cofnij --apply usuwa z galerii i wariantów wszystkie zdjęcia na dłoni (też wgrane ręcznie jako *-dlon.jpg)
 *
 * Idempotentne: karta albo wariant, które mają już zdjęcie na dłoni (z seeda albo ręcznie `<nazwa>-dlon.jpg`), zostają bez
 * zmian; obraz rozpoznaje po `legacySourceUrl` (`seed://dlon/<plik>`) i wgrywa raz. Cofnięcie zdejmuje tylko wpisy, pliki
 * zostają w Media, więc ponowne `--apply` niczego nie wgrywa drugi raz. Reszta karty i status bez zmian.
 * Kolejność: wariant Iris z oliwinem powstaje w `staging:warianty`, więc najpierw ten skrypt, potem `staging:dlon`.
 * Po zapisie odśwież katalog: zapisz dowolną kartę w panelu (skrypt działa poza Next.js, bez odświeżania strony).
 * Działa tylko z NEON_BRANCH=staging.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import type { Media, Product } from '../src/payload-types'
import {
  checkImages,
  findVariant,
  handAlt,
  IMAGES_DIR,
  loadSpecs,
  planAdd,
  planAddToVariant,
  sourceKey,
  variantsWithoutHand,
  withoutHand,
  type HandSpec,
} from './dlon-logic'

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
type Asset = number | Media
type DocVariant = NonNullable<Product['stoneVariants']>[number]
const mediaId = (asset: Asset | null | undefined) => (typeof asset === 'object' && asset ? asset.id : asset)
const variantInput = (variant: DocVariant) => ({
  ...variant,
  image: mediaId(variant.image) as number,
  moreImages: (variant.moreImages ?? []).map((asset) => mediaId(asset) as number),
  video: mediaId(variant.video) ?? null,
})

const ensureMedia = async (spec: HandSpec, alt: string): Promise<Media> => {
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
    data: { alt, legacySourceUrl: key },
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
  const save = (doc: Product, data: Pick<Product, 'media' | 'stoneVariants'>) =>
    payload.update({
      collection: 'products',
      id: doc.id,
      data: { ...data, _status: doc._status === 'draft' ? 'draft' : 'published' },
      draft: doc._status === 'draft',
      overrideAccess: true,
      context,
    })
  const galleryInput = (media: { asset: Asset; alt?: string | null; isPrimary?: boolean | null }[]) =>
    media.map((entry) => ({ asset: mediaId(entry.asset) as number, alt: entry.alt, isPrimary: entry.isPrimary }))

  let changed = 0
  if (undo) {
    for (const doc of found.docs) {
      const gallery = withoutHand(doc.media as { asset: Asset }[] | null)
      const variants = variantsWithoutHand(doc.stoneVariants as DocVariant[] | null)
      const removed = gallery.removed + variants.removed
      if (!removed) continue
      changed += 1
      console.log(`- ${doc.name}: zdejmuję zdjęcia na dłoni (${gallery.removed} z galerii, ${variants.removed} z wariantów)`)
      if (applyChanges) {
        await save(doc, {
          media: galleryInput(gallery.kept as { asset: Asset }[]),
          stoneVariants: (variants.kept as DocVariant[]).map(variantInput),
        })
      }
    }
  } else {
    const byName = new Map(found.docs.map((doc) => [doc.name.trim().toLowerCase(), doc]))
    for (const spec of specs) {
      const doc = byName.get(spec.name.toLowerCase())
      const label = spec.kamien ? `${spec.name} ?kamien=${spec.kamien}` : spec.name
      const plan = spec.kamien
        ? planAddToVariant(doc as { stoneVariants?: DocVariant[] | null } | undefined, spec.kamien)
        : planAdd(doc as { media?: { asset: Asset }[] | null } | undefined)
      const mark = plan.action === 'dodaj' ? '+' : plan.action === 'juz' ? '=' : '!'
      console.log(`${mark} ${label}: ${plan.note}${doc?._status === 'draft' ? ' (szkic)' : ''}`)
      if (plan.action !== 'dodaj' || !doc) continue
      changed += 1
      if (!applyChanges) continue
      if (spec.kamien) {
        const target = findVariant(doc.stoneVariants, spec.kamien)!
        const media = await ensureMedia(spec, handAlt(spec.name, target.stone))
        await save(doc, {
          stoneVariants: (doc.stoneVariants ?? []).map((variant) => {
            const input = variantInput(variant)
            return variant === target ? { ...input, moreImages: [...input.moreImages, media.id] } : input
          }),
        })
      } else {
        const media = await ensureMedia(spec, handAlt(spec.name))
        await save(doc, {
          media: galleryInput([...(doc.media ?? []), { asset: media, alt: handAlt(spec.name), isPrimary: false }] as {
            asset: Asset
          }[]),
        })
      }
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
