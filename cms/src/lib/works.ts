import type { Media, Product, Work } from '../payload-types'

/** Rodzaj realizacji i biżuterii: wartości z kolekcji `works` (src/collections/Works.ts). */
export type WorkKind = 'zamowienie' | 'przerobka'
export type WorkJewelryType = 'pierscionek' | 'obraczka' | 'kolczyki' | 'inne'

export const WORK_KIND_LABELS: Record<WorkKind, string> = {
  zamowienie: 'Na zamówienie',
  przerobka: 'Przeróbka',
}

/** Napis na przycisku w oknie realizacji zależy od rodzaju biżuterii. */
export const WORK_CTA_LABELS: Record<WorkJewelryType, string> = {
  pierscionek: 'Chcę podobny pierścionek',
  obraczka: 'Chcę podobną obrączkę',
  kolczyki: 'Chcę coś podobnego',
  inne: 'Chcę coś podobnego',
}

export type PublicWorkPhoto = {
  src: string
  alt: string
  width: number | null
  height: number | null
}

/** Film realizacji: `poster` to klatka przed odtworzeniem (okładka filmu albo, gdy jej nie ma, okładka realizacji). */
export type PublicWorkVideo = {
  src: string
  caption: string
  poster: string | null
}

export type PublicWork = {
  id: number
  slug: string
  title: string
  kind: WorkKind
  kindLabel: string
  jewelryType: WorkJewelryType
  ctaLabel: string
  year: number | null
  task: string
  whatWeDid: string
  duration: string
  featured: boolean
  /** Teksty czekają na potwierdzenie Michała: na podglądzie dostają żółtą ramkę, na produkcji nic się nie zmienia. */
  needsConfirmation: boolean
  photos: PublicWorkPhoto[]
  videos: PublicWorkVideo[]
  /** Pierścionek z katalogu (tylko opublikowany, niezarchiwizowany), do linku „Zobacz w katalogu”. */
  product: { slug: string; name: string } | null
}

function populated<T extends object>(value: number | T | null | undefined): T | null {
  return typeof value === 'object' && value !== null ? value : null
}

/** Wyłącznie dane potrzebne stronie, bez pól redakcyjnych i wersji. Realizacja bez żadnego zdjęcia daje `null`. */
export function serializePublicWork(work: Work): PublicWork | null {
  const photos = (work.photos ?? []).flatMap((photo): PublicWorkPhoto[] => {
    const media = populated<Media>(photo.image)
    if (!media?.url || !media.mimeType?.startsWith('image/')) return []
    return [{ src: media.url, alt: photo.alt, width: media.width ?? null, height: media.height ?? null }]
  })
  if (photos.length === 0) return null

  const videos = (work.videos ?? []).flatMap((entry): PublicWorkVideo[] => {
    const file = populated<Media>(entry.file)
    if (!file?.url || !file.mimeType?.startsWith('video/')) return []
    const poster = populated<Media>(entry.poster)
    return [{ src: file.url, caption: entry.caption, poster: poster?.url ?? photos[0].src }]
  })

  const product = populated<Product>(work.product)
  const published = product && product._status === 'published' && !product.archived
  const kind: WorkKind = work.kind ?? 'zamowienie'
  const jewelryType: WorkJewelryType = work.jewelryType ?? 'pierscionek'

  return {
    id: work.id,
    slug: work.slug ?? String(work.id),
    title: work.title,
    kind,
    kindLabel: WORK_KIND_LABELS[kind],
    jewelryType,
    ctaLabel: WORK_CTA_LABELS[jewelryType],
    year: work.year ?? null,
    task: work.task?.trim() ?? '',
    whatWeDid: work.whatWeDid?.trim() ?? '',
    duration: work.duration?.trim() ?? '',
    featured: Boolean(work.featured),
    needsConfirmation: Boolean(work.needsConfirmation),
    photos,
    videos,
    product: published && product.slug ? { slug: product.slug, name: product.name } : null,
  }
}

/** Realizacja z górnego okna, gdy nikt jeszcze nic nie kliknął: pierwsza wyróżniona wg kolejności, a bez wyróżnienia pierwsza. */
export function pickFeaturedWork<T extends { featured: boolean }>(works: readonly T[]): T | undefined {
  return works.find((work) => work.featured) ?? works[0]
}

/** Wybrana realizacja z adresu (`?r=slug`); nieznany albo pusty slug daje wyróżnioną. */
export function pickSelectedWork<T extends { slug: string; featured: boolean }>(
  works: readonly T[],
  slug: string | null | undefined,
): T | undefined {
  return (slug ? works.find((work) => work.slug === slug) : undefined) ?? pickFeaturedWork(works)
}
