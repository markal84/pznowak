import type { PayloadRequest } from 'payload'

type MediaEntry = { asset?: unknown; isPrimary?: boolean | null }

type ProductFormData = {
  media?: MediaEntry[] | null
}

const idOf = (asset: unknown): number | string | null => {
  if (typeof asset === 'number' || typeof asset === 'string') return asset
  if (asset && typeof asset === 'object' && 'id' in asset) return (asset as { id: number | string }).id
  return null
}

/**
 * Identyfikator zdjęcia do udostępniania dla przycisku „Wygeneruj” w zakładce SEO: zdjęcie główne, a gdy go nie ma,
 * pierwszy plik będący obrazem (filmy pomijamy). Zwraca pusty tekst, gdy pierścionek nie ma zdjęć.
 */
export async function firstProductImageId(doc: ProductFormData, req: PayloadRequest): Promise<number | string> {
  const entries = [...(doc.media ?? [])].sort((a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)))
  for (const entry of entries) {
    const id = idOf(entry.asset)
    if (id === null) continue
    const asset = entry.asset
    const mimeType =
      asset && typeof asset === 'object' && 'mimeType' in asset
        ? (asset as { mimeType?: string | null }).mimeType
        : (await req.payload.findByID({ collection: 'media', id, depth: 0, req })).mimeType
    if (mimeType?.startsWith('image/')) return id
  }
  return ''
}
