/**
 * Zdjęcia pierścionków na dłoni (11.11.2026): jedno ujęcie na dłoni dopisane na koniec galerii karty („Zdjęcia i filmy”),
 * żeby klient od razu widział skalę. Logika bez bazy; zapis robi `scripts/staging-dlon.ts`.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const SEED_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../seed/dlon')
export const IMAGES_DIR = path.join(SEED_DIR, 'obrazy')
export const MAX_IMAGE_BYTES = 300 * 1024
export const SOURCE_PREFIX = 'seed://dlon/'

export type HandSpec = { name: string; file: string; source?: string }
export type HandMedia = { filename?: string | null; legacySourceUrl?: string | null }
export type GalleryEntry<A> = { asset: A; alt?: string | null; isPrimary?: boolean | null }

export const sourceKey = (file: string): string => `${SOURCE_PREFIX}${file}`
export const handAlt = (name: string): string => `Pierścionek ${name} na dłoni`

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
