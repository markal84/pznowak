/**
 * Połączenie Urania + Pyrrha + Nyx w jeden fason (zlecenie AB): dane i czysta logika planu (bez bazy), żeby dało się ją
 * sprawdzić testem. Używa tego `scripts/staging-polaczenie-ab.ts` (tylko staging) oraz `tests/int/polaczenie-ab.int.spec.ts`.
 *
 * Karta docelowa to Urania (topaz błękitny). Rubin (Pyrrha) i topaz London blue (Nyx) dołączają jako warianty kamienia
 * z PRAWDZIWYCH zdjęć i filmów tych kart: te same pliki Media, bez ponownego wgrywania i bez plakietki „Wizualizacja”.
 */
import { stoneSlug, type SwatchId } from '../src/lib/stone-variants'

export const TARGET = { slug: 'urania', name: 'Urania' } as const

export type MergeSpec = {
  /** Karta, która znika z katalogu (trafia do archiwum, adres przekierowuje na fason). */
  slug: string
  name: string
  /** Nazwa wariantu: tak jak w parametrach karty, z niej powstaje adres `?kamien=`. */
  stone: string
  swatch: SwatchId
  alt: string
}

export const MERGES: readonly MergeSpec[] = [
  {
    slug: 'pyrrha',
    name: 'Pyrrha',
    stone: 'Rubin i diamenty',
    swatch: 'czerwony',
    alt: 'Urania z rubinem i diamentami w żółtym złocie',
  },
  {
    slug: 'nyx',
    name: 'Nyx',
    stone: 'Topaz London blue i diamenty',
    swatch: 'londonblue',
    alt: 'Urania z topazem London blue i diamentami w żółtym złocie',
  },
]

/** Wartość `?kamien=` dla wariantu (to samo, co wpisane w `MERGED_RING_VARIANTS` przekierowań; pilnuje tego test). */
export const variantQuery = (merge: MergeSpec) => stoneSlug(merge.stone)

/**
 * Jeden opis dla fasonu (standard karty ze zlecenia U; `lintSpec` sprawdza to w teście). Zastępuje opis samej Uranii,
 * ale tylko jeśli karta ma jeszcze tekst ze zlecenia U (`legacyLead` / `legacyDescription`) albo już nowy.
 */
export const CARD_TEXT = {
  lead: 'Błękitny topaz z diamentami; ten sam fason także z rubinem i topazem London blue.',
  description: [
    'Błękitny topaz w oprawie z żółtego złota, rozświetlony drobnymi diamentami. Pierścionek ma lekki, świetlisty charakter, a jasny błękit kamienia dobrze współgra z ciepłym kolorem złota.',
    'Ten sam fason wykonujemy także z rubinem o głębokiej czerwieni albo z topazem London blue o ciemnym, stalowogranatowym odcieniu. Obie wersje pokazujemy na prawdziwych zdjęciach, pod galerią w sekcji „Zamów z innym kamieniem”.',
    'Kamienie oprawiamy ręcznie w naszej pracowni. Topaz ma twardość 8, rubin 9 w skali Mohsa. Model wykonamy w wybranym rozmiarze, także z innym kamieniem centralnym.',
  ].join('\n\n'),
} as const

const norm = (value: string | null | undefined) => (value ?? '').replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim().toLowerCase()

/* ------------------------------------------------------------------------------------------------------------------ */
/* Opis fasonu */

export type TextState = { name: string; lead?: string | null; description?: string | null }
export type TextPlan =
  | { action: 'zmien'; data: { lead: string; description: string }; note: string }
  | { action: 'juz' | 'pomin'; note: string }

/**
 * `known`: teksty, które karta ma prawo mieć przed zmianą (ze zlecenia U); inny tekst to ręczna poprawka w panelu
 * i zostaje bez zmian.
 */
export function planText(card: TextState, known: { lead: string; description: string }): TextPlan {
  if (card.name !== TARGET.name) return { action: 'pomin', note: `nazwa „${card.name}” nie zgadza się z „${TARGET.name}”` }
  const sameLead = norm(card.lead) === norm(CARD_TEXT.lead)
  const sameDescription = norm(card.description) === norm(CARD_TEXT.description)
  if (sameLead && sameDescription) return { action: 'juz', note: 'opis fasonu już zapisany' }
  const leadOk = sameLead || norm(card.lead) === norm(known.lead)
  const descriptionOk = sameDescription || norm(card.description) === norm(known.description)
  if (!leadOk || !descriptionOk) {
    return { action: 'pomin', note: 'lead albo opis zmienione ręcznie w panelu, nie nadpisuję (sprawdź tekst ręcznie)' }
  }
  return { action: 'zmien', data: { lead: CARD_TEXT.lead, description: CARD_TEXT.description }, note: 'opis fasonu (lead + opis)' }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Warianty z prawdziwych zdjęć */

type Asset = number | { id: number; mimeType?: string | null } | null | undefined
export const assetId = (asset: Asset): number | null => (typeof asset === 'object' && asset ? asset.id : (asset ?? null))

/**
 * Obrazy karty w kolejności galerii („Zdjęcia i filmy”), bez filmów i powtórzeń. Film idzie osobno (`videoId`).
 */
export function imageIds(media: readonly { asset?: Asset }[] | null | undefined): number[] {
  const ids: number[] = []
  for (const { asset } of media ?? []) {
    if (typeof asset !== 'object' || !asset?.mimeType?.startsWith('image/')) continue
    if (!ids.includes(asset.id)) ids.push(asset.id)
  }
  return ids
}

/** Film karty (pierwszy; karta może mieć najwyżej jeden). Trafia do pola „Film” wariantu: prawdziwy film pierścionka. */
export function videoId(media: readonly { asset?: Asset }[] | null | undefined): number | null {
  for (const { asset } of media ?? []) {
    if (typeof asset === 'object' && asset?.mimeType?.startsWith('video/')) return asset.id
  }
  return null
}

export type VariantState = { stone: string; isVisualization?: boolean | null; video?: unknown }
export type VariantPlan = { action: 'dodaj' | 'podmien' | 'film' | 'juz' | 'pomin'; note: string }

/**
 * Wariant rozpoznajemy po adresie `?kamien=`. Prawdziwe zdjęcia (`isVisualization: false`) zostają, jak są (ktoś mógł je
 * poprawić w panelu); jedyne, co do nich dopisujemy, to brakujący film karty źródłowej (`film`). Wizualizacja o tej
 * samej nazwie kamienia (zlecenia W/Y/AA) jest zastępowana prawdziwymi zdjęciami i filmem.
 */
export function planVariant(existing: readonly VariantState[], spec: MergeSpec, sourceImages: readonly number[], sourceVideo: number | null = null): VariantPlan {
  const found = existing.find((variant) => stoneSlug(variant.stone) === stoneSlug(spec.stone))
  const withFilm = sourceVideo === null ? '' : ' i film'
  if (found && found.isVisualization === false) {
    if (sourceVideo !== null && !found.video) return { action: 'film', note: `wariant „${spec.stone}” ma zdjęcia, dopisuję film karty ${spec.name}` }
    return { action: 'juz', note: `wariant „${spec.stone}” już jest (prawdziwe zdjęcia${found.video ? ' i film' : ''})` }
  }
  if (!sourceImages.length) {
    return { action: 'pomin', note: `karta ${spec.name} nie ma zdjęć w galerii, wariant „${spec.stone}” bez obrazów` }
  }
  if (found) {
    return { action: 'podmien', note: `wariant „${found.stone}” był wizualizacją, zastępuję ${sourceImages.length} zdjęciami${withFilm} karty ${spec.name}` }
  }
  return { action: 'dodaj', note: `dopisuję wariant „${spec.stone}” (${sourceImages.length} zdjęć${withFilm} karty ${spec.name})` }
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Archiwizacja i strona główna */

export type SourceState = { name: string; archived?: boolean | null; featuredOnHome?: boolean | null; homeOrder?: number | null }
export type ArchivePlan = { action: 'archiwizuj' | 'juz' | 'pomin'; note: string }

export function planArchive(card: SourceState | undefined, spec: MergeSpec): ArchivePlan {
  if (!card) return { action: 'pomin', note: `nie ma karty „${spec.slug}” na stagingu` }
  if (card.name !== spec.name) return { action: 'pomin', note: `nazwa „${card.name}” nie zgadza się z „${spec.name}”, zostawiam` }
  if (card.archived) return { action: 'juz', note: `${spec.name} już zarchiwizowana` }
  return { action: 'archiwizuj', note: `archiwizuję ${spec.name}` }
}

/**
 * Pyrrha i Nyx bywały „Na stronie głównej”. Po archiwizacji miejsce przejmuje Urania (z najwcześniejszą kolejnością
 * z nich), żeby sekcja „Wybrane pierścionki” nie straciła pierścionka. Jeśli Urania sama jest wybrana, zostaje bez zmian.
 */
export function featuredTransfer(target: SourceState, sources: readonly SourceState[]): { featuredOnHome: true; homeOrder: number } | null {
  if (target.featuredOnHome) return null
  const featured = sources.filter((source) => source.featuredOnHome)
  if (!featured.length) return null
  return { featuredOnHome: true, homeOrder: Math.min(...featured.map((source) => source.homeOrder ?? 0)) }
}
