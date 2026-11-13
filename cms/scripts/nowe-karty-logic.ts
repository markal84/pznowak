/**
 * Nowe karty pierścionków jako szkice na staging (Hesperia z andaluzytem, Selene z opalem; Kama 06.11, Marcin 07.11).
 * Dane: `seed/nowe-karty/nowe-karty.json`, zdjęcia: `seed/nowe-karty/obrazy/` oraz opcjonalnie zdjęcia od Kamili
 * skopiowane z iMessage do `docs/od-kamili/2026-11-06/`. Używa tego `scripts/staging-nowe-karty.ts` i
 * `tests/int/nowe-karty.int.spec.ts`.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { OPISY_DIR } from './opisy-u-logic'

export const NOWE_KARTY_DIR = path.resolve(OPISY_DIR, '../nowe-karty')
export const NOWE_KARTY_PATH = path.join(NOWE_KARTY_DIR, 'nowe-karty.json')
export const PHOTOS_DIR = path.join(NOWE_KARTY_DIR, 'obrazy')
/** Folder w repo, do którego Marcin kopiuje zdjęcia Kamili z iMessage (punkt 6.3 listy). */
export const KAMILA_DIR = path.resolve(OPISY_DIR, '../../../docs/od-kamili/2026-11-06')

/** Folder z filmami z eksportu FB (poza gitem); można zmienić zmienną NOWE_KARTY_FILMY albo opcją `--filmy`. */
export const FILMY_DIR = path.resolve(OPISY_DIR, '../../../data/facebook/media')

export type NewCardPhoto = { file: string; alt: string }
/** Film karty: plik mp4 z `FILMY_DIR` (nie wchodzi do gita) i opis; trafia do `media` karty po zdjęciach. */
export type NewCardVideo = { file: string; alt: string }
/**
 * Wariant kamienia zakładany razem z nową kartą (pole `stoneVariants`): pierwsze zdjęcie to „Obraz”, reszta to
 * „Kolejne obrazy”. `isVisualization: false` przy prawdziwych zdjęciach (np. Ariadne z tanzanitem, Kama 13.11).
 */
export type NewCardVariant = { stone: string; swatch: string; isVisualization?: boolean; photos: NewCardPhoto[] }
export type NewCardSpec = {
  slug: string
  name: string
  lead: string
  description: string
  price: number | null
  metal: string
  stone: string
  photos: NewCardPhoto[]
  /** Nazwy plików z iMessage bez rozszerzenia (np. IMG_0056); brakujące są pomijane. */
  photosFromKamila: string[]
  /** Opcjonalny film karty (zlecenie: film Hesperii). */
  video?: NewCardVideo
  /** Opcjonalne warianty kamienia; zakładane tylko przy tworzeniu karty. */
  variants?: NewCardVariant[]
}

const KEYS = ['slug', 'name', 'lead', 'description', 'price', 'metal', 'stone', 'photos', 'photosFromKamila', 'video', 'variants']

export function loadNewCards(source: string = NOWE_KARTY_PATH): NewCardSpec[] {
  const raw: unknown = JSON.parse(readFileSync(source, 'utf8'))
  if (!Array.isArray(raw)) throw new Error('nowe-karty.json: oczekiwana lista kart')
  return raw.map((entry, index) => {
    const item = entry as Record<string, unknown>
    const where = `nowe-karty.json, pozycja ${index + 1}`
    for (const key of ['slug', 'name', 'lead', 'description', 'metal', 'stone']) {
      if (typeof item[key] !== 'string' || !(item[key] as string).trim()) throw new Error(`${where}: brak tekstowego „${key}”`)
    }
    if (!/^[a-z-]+$/.test(item.slug as string)) throw new Error(`${where}: slug tylko z małych liter i myślników`)
    if (item.price !== null && (typeof item.price !== 'number' || !Number.isInteger(item.price) || item.price <= 0)) {
      throw new Error(`${where}: cena to pełne złote albo null`)
    }
    if (!Array.isArray(item.photos) || item.photos.length === 0) throw new Error(`${where}: karta musi mieć zdjęcie`)
    for (const photo of item.photos as Record<string, unknown>[]) {
      if (typeof photo.file !== 'string' || typeof photo.alt !== 'string' || !photo.alt.trim()) {
        throw new Error(`${where}: zdjęcie potrzebuje „file” i „alt”`)
      }
    }
    if (!Array.isArray(item.photosFromKamila) || item.photosFromKamila.some((name) => typeof name !== 'string')) {
      throw new Error(`${where}: „photosFromKamila” to lista nazw`)
    }
    if (item.video !== undefined) {
      const video = item.video as Record<string, unknown>
      if (typeof video?.file !== 'string' || !/\.mp4$/i.test(video.file) || typeof video.alt !== 'string' || !video.alt.trim()) {
        throw new Error(`${where}: film potrzebuje „file” (.mp4) i „alt”`)
      }
    }
    if (item.variants !== undefined) {
      if (!Array.isArray(item.variants)) throw new Error(`${where}: „variants” to lista`)
      for (const variant of item.variants as Record<string, unknown>[]) {
        if (typeof variant.stone !== 'string' || !variant.stone.trim() || typeof variant.swatch !== 'string' || !variant.swatch.trim()) {
          throw new Error(`${where}: wariant potrzebuje „stone” i „swatch”`)
        }
        if (!Array.isArray(variant.photos) || variant.photos.length === 0) throw new Error(`${where}: wariant musi mieć zdjęcie`)
        for (const photo of variant.photos as Record<string, unknown>[]) {
          if (typeof photo.file !== 'string' || typeof photo.alt !== 'string' || !photo.alt.trim()) {
            throw new Error(`${where}: zdjęcie wariantu potrzebuje „file” i „alt”`)
          }
        }
      }
    }
    const extra = Object.keys(item).filter((key) => !KEYS.includes(key))
    if (extra.length) throw new Error(`${where}: nieznane pola ${extra.join(', ')}`)
    return item as NewCardSpec
  })
}

/** Klucz zdjęcia w polu `legacySourceUrl` mediów: po nim skrypt poznaje, że plik jest już wgrany. */
export const photoKey = (file: string) => `nowe-karty/${file}`

export type PlannedPhoto = { key: string; file: string; fullPath: string; alt: string; mimetype: string }

const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

/**
 * Zdjęcia karty: własne z `obrazy/` i te zdjęcia Kamili, które leżą już w `kamilaDir` (jpg/png/webp; HEIC trzeba
 * najpierw przekonwertować). Zwraca też, czego brakuje, żeby skrypt mógł to pokazać.
 */
export function collectPhotos(
  spec: NewCardSpec,
  { photosDir = PHOTOS_DIR, kamilaDir = KAMILA_DIR }: { photosDir?: string; kamilaDir?: string } = {},
): { photos: PlannedPhoto[]; missing: string[] } {
  const photos: PlannedPhoto[] = []
  const missing: string[] = []
  for (const photo of spec.photos) {
    const fullPath = path.join(photosDir, photo.file)
    const mimetype = MIME[path.extname(photo.file).toLowerCase()]
    if (!mimetype || !existsSync(fullPath)) {
      missing.push(photo.file)
      continue
    }
    photos.push({ key: photoKey(photo.file), file: photo.file, fullPath, alt: photo.alt, mimetype })
  }
  const kamilaFiles = existsSync(kamilaDir) ? readdirSync(kamilaDir) : []
  for (const [index, base] of spec.photosFromKamila.entries()) {
    const match = kamilaFiles.find((file) => {
      const ext = path.extname(file).toLowerCase()
      return path.basename(file, path.extname(file)).toLowerCase() === base.toLowerCase() && MIME[ext]
    })
    if (!match) {
      const heic = kamilaFiles.find((file) => file.toLowerCase().startsWith(`${base.toLowerCase()}.hei`))
      missing.push(heic ? `${heic} (HEIC, przekonwertuj na JPG)` : `${base} (od Kamili)`)
      continue
    }
    photos.push({
      key: photoKey(`od-kamili/${match}`),
      file: match,
      fullPath: path.join(kamilaDir, match),
      alt: `Pierścionek ${spec.name}, zdjęcie z pracowni ${index + 1}`,
      mimetype: MIME[path.extname(match).toLowerCase()],
    })
  }
  return { photos, missing }
}

export type PlannedVariant = { stone: string; swatch: string; isVisualization: boolean; photos: PlannedPhoto[] }

/** Zdjęcia wariantów z `obrazy/`. Wariant, któremu brakuje choć jednego zdjęcia, jest pomijany (i zgłoszony). */
export function collectVariants(
  spec: NewCardSpec,
  { photosDir = PHOTOS_DIR }: { photosDir?: string } = {},
): { variants: PlannedVariant[]; missing: string[] } {
  const variants: PlannedVariant[] = []
  const missing: string[] = []
  for (const variant of spec.variants ?? []) {
    const photos: PlannedPhoto[] = []
    for (const photo of variant.photos) {
      const fullPath = path.join(photosDir, photo.file)
      const mimetype = MIME[path.extname(photo.file).toLowerCase()]
      if (!mimetype || !existsSync(fullPath)) missing.push(`${photo.file} (wariant ${variant.stone})`)
      else photos.push({ key: photoKey(photo.file), file: photo.file, fullPath, alt: photo.alt, mimetype })
    }
    if (photos.length === variant.photos.length) {
      variants.push({ stone: variant.stone, swatch: variant.swatch, isVisualization: variant.isVisualization ?? true, photos })
    }
  }
  return { variants, missing }
}

/**
 * Film karty z `videoDir`. Brak pliku to nie błąd: skrypt pokazuje to w planie, a kartę zakłada bez filmu
 * (film dopnie przy następnym uruchomieniu, gdy plik się pojawi).
 */
export function collectVideo(
  spec: NewCardSpec,
  { videoDir = FILMY_DIR }: { videoDir?: string } = {},
): { video: PlannedPhoto | null; missing: string | null } {
  if (!spec.video) return { video: null, missing: null }
  const fullPath = path.join(videoDir, spec.video.file)
  if (!existsSync(fullPath)) return { video: null, missing: `${spec.video.file} (film, szukam w ${videoDir})` }
  return {
    video: { key: photoKey(`film/${spec.video.file}`), file: spec.video.file, fullPath, alt: spec.video.alt, mimetype: 'video/mp4' },
    missing: null,
  }
}

export type ExistingCard = { id: number; name: string; status: 'draft' | 'published' | null | undefined; photoKeys: string[] }
export type NewCardPlan =
  | { action: 'utworz'; photos: PlannedPhoto[]; note: string }
  | { action: 'dodaj'; photos: PlannedPhoto[]; note: string }
  /** Karta opublikowana: dopinamy wyłącznie film (media produktu), bez ruszania reszty i statusu. */
  | { action: 'film'; photos: PlannedPhoto[]; note: string }
  | { action: 'juz' | 'pomin'; note: string }

export function planNewCard(existing: ExistingCard | undefined, spec: NewCardSpec, photos: PlannedPhoto[]): NewCardPlan {
  if (!existing) {
    if (!photos.length) return { action: 'pomin', note: 'brak zdjęć, karty nie zakładam' }
    return { action: 'utworz', photos, note: `nowy szkic, zdjęć: ${photos.length}${spec.price ? `, cena ${spec.price} zł` : ', bez ceny'}` }
  }
  if (existing.name !== spec.name) return { action: 'pomin', note: `slug „${spec.slug}” ma już karta „${existing.name}”` }
  if (existing.status === 'published') {
    // Opublikowanej karty nie dotykamy poza filmem: zdjęcia i teksty zostają, jak są (zdjęcia dodaje się w panelu).
    const film = photos.filter((photo) => photo.mimetype.startsWith('video/') && !existing.photoKeys.includes(photo.key))
    if (film.length) return { action: 'film', photos: film, note: `film do dopięcia: tak (${film[0].file}); karta opublikowana, reszty nie ruszam` }
    return { action: 'juz', note: 'karta opublikowana; film do dopięcia: nie (jest już albo nie podano pliku)' }
  }
  const fresh = photos.filter((photo) => !existing.photoKeys.includes(photo.key))
  if (!fresh.length) return { action: 'juz', note: 'karta już jest, wszystkie zdjęcia na miejscu' }
  return { action: 'dodaj', photos: fresh, note: `dopinam zdjęcia: ${fresh.map((photo) => photo.file).join(', ')}` }
}
