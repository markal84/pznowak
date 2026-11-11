/**
 * Zdjęcia pierścionków na dłoni (11.11.2026): jedno ujęcie na dłoni dopisane na koniec galerii karty („Zdjęcia i filmy”),
 * żeby klient od razu widział skalę. Logika bez bazy; zapis robi `scripts/staging-dlon.ts`.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { stoneSlug } from '../src/lib/stone-variants'

export const SEED_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../seed/dlon')
export const IMAGES_DIR = path.join(SEED_DIR, 'obrazy')
export const MAX_IMAGE_BYTES = 300 * 1024
export const SOURCE_PREFIX = 'seed://dlon/'

/**
 * `kamien`: zdjęcie trafia do wariantu karty (adres wariantu = `stoneSlug(stone)`, jak `?kamien=`), a nie do galerii
 * oryginału. Tak jest przy kartach połączonych w jeden fason (Nyx → Urania, Eirene → Harmonia, Taygete → Iris).
 */
export type HandSpec = { name: string; file: string; kamien?: string; source?: string }
export type HandMedia = { filename?: string | null; legacySourceUrl?: string | null }
export type GalleryEntry<A> = { asset: A; alt?: string | null; isPrimary?: boolean | null }

export const sourceKey = (file: string): string => `${SOURCE_PREFIX}${file}`
export const handAlt = (name: string, stone?: string): string =>
  stone ? `Pierścionek ${name} (${stone.toLowerCase()}) na dłoni` : `Pierścionek ${name} na dłoni`

export function loadSpecs(file: string = path.join(SEED_DIR, 'dlon.json')): HandSpec[] {
  return JSON.parse(readFileSync(file, 'utf8')) as HandSpec[]
}

export function checkImages(specs: readonly HandSpec[], dir: string = IMAGES_DIR): string[] {
  const problems: string[] = []
  for (const spec of specs) {
    const file = path.join(dir, spec.file)
    if (!existsSync(file)) problems.push(`${spec.name}: brak pliku seed/dlon/obrazy/${spec.file}`)
    else if (!spec.file.endsWith('.webp')) problems.push(`${spec.name}: ${spec.file} nie jest webp`)
    else if (statSync(file).size > MAX_IMAGE_BYTES) problems.push(`${spec.name}: ${spec.file} ma ponad 300 KB`)
  }
  return problems
}

/**
 * Czy plik galerii to zdjęcie na dłoni: wgrane tym skryptem (`seed://dlon/…`) albo ręcznie w panelu pod nazwą
 * `<pierścionek>-dlon.jpg` (tak Marcin wgrał pierwsze cztery 11.11). Payload dokleja `-1`, `-2` przy powtórzonej nazwie.
 */
export function isHandMedia(media: HandMedia | number | null | undefined): boolean {
  if (!media || typeof media !== 'object') return false
  if (media.legacySourceUrl?.startsWith(SOURCE_PREFIX)) return true
  return /-dlon(-\d+)?\.(jpe?g|png|webp|heic)$/i.test(media.filename ?? '')
}

export type AddPlan = { action: 'dodaj' | 'juz' | 'brak'; note: string }

export function planAdd<A extends HandMedia | number>(
  card: { media?: readonly GalleryEntry<A>[] | null } | undefined,
): AddPlan {
  if (!card) return { action: 'brak', note: 'nie ma takiej karty na stagingu, pomijam' }
  if ((card.media ?? []).some((entry) => isHandMedia(entry.asset))) {
    return { action: 'juz', note: 'ma już zdjęcie na dłoni, bez zmian' }
  }
  return { action: 'dodaj', note: `dopisuję zdjęcie na dłoni jako ${(card.media ?? []).length + 1}. plik galerii` }
}

/** Galeria bez zdjęć na dłoni (cofnięcie). Reszta w tej samej kolejności, zdjęcie główne bez zmian. */
export function withoutHand<A extends HandMedia | number>(media: readonly GalleryEntry<A>[] | null | undefined) {
  const all = media ?? []
  const kept = all.filter((entry) => !isHandMedia(entry.asset))
  return { kept, removed: all.length - kept.length }
}

export type VariantImages<A> = { stone?: string | null; image?: A | null; moreImages?: readonly A[] | null }

/** Wariant o adresie `kamien` (porównanie jak w `?kamien=`). */
export function findVariant<V extends { stone?: string | null }>(variants: readonly V[] | null | undefined, kamien: string) {
  return (variants ?? []).find((variant) => stoneSlug(variant.stone ?? '') === kamien)
}

export function planAddToVariant<A extends HandMedia | number>(
  card: { stoneVariants?: readonly VariantImages<A>[] | null } | undefined,
  kamien: string,
): AddPlan {
  if (!card) return { action: 'brak', note: 'nie ma takiej karty na stagingu, pomijam' }
  const variant = findVariant(card.stoneVariants, kamien)
  if (!variant) return { action: 'brak', note: `karta nie ma wariantu „${kamien}” (najpierw staging:warianty?), pomijam` }
  const images = [variant.image, ...(variant.moreImages ?? [])]
  if (images.some((asset) => isHandMedia(asset ?? null))) {
    return { action: 'juz', note: `wariant „${variant.stone}” ma już zdjęcie na dłoni, bez zmian` }
  }
  return { action: 'dodaj', note: `dopisuję zdjęcie na dłoni na koniec wariantu „${variant.stone}”` }
}

/** Warianty bez zdjęć na dłoni w „Kolejnych obrazach” (cofnięcie). Pierwszy obraz wariantu zostaje. */
export function variantsWithoutHand<A extends HandMedia | number, V extends VariantImages<A>>(variants: readonly V[] | null | undefined) {
  let removed = 0
  const kept = (variants ?? []).map((variant) => {
    const more = variant.moreImages ?? []
    const rest = more.filter((asset) => !isHandMedia(asset))
    removed += more.length - rest.length
    return { ...variant, moreImages: rest }
  })
  return { kept, removed }
}
