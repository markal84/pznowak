import type { ArrayFieldValidation, PayloadRequest } from 'payload'

type ProductMediaAsset =
  | number
  | {
      id?: number
      mimeType?: null | string
    }

export type ProductMediaEntry = {
  asset?: null | ProductMediaAsset
  isPrimary?: boolean | null
}

export type ProductWorkflowData = {
  _status?: 'draft' | 'published'
  archived?: boolean | null
  publishedAt?: string | null
}

async function resolveMimeType(
  asset: ProductMediaAsset,
  req: PayloadRequest,
): Promise<null | string> {
  if (typeof asset === 'object') {
    return asset.mimeType ?? null
  }

  const media = await req.payload.findByID({
    collection: 'media',
    id: asset,
    depth: 0,
    overrideAccess: true,
  })

  return media.mimeType ?? null
}

export async function validatePublishedProductMedia(
  entries: ProductMediaEntry[] | null | undefined,
  req: PayloadRequest,
): Promise<string | true> {
  if (!entries?.length) {
    return 'Opublikowany pierścionek musi mieć co najmniej jedno zdjęcie.'
  }

  const resolved = await Promise.all(
    entries.map(async (entry) => ({
      isPrimary: Boolean(entry.isPrimary),
      mimeType: entry.asset ? await resolveMimeType(entry.asset, req) : null,
    })),
  )

  if (resolved.some(({ mimeType }) => !mimeType)) {
    return 'Każdy wpis mediów musi wskazywać istniejący plik.'
  }

  const images = resolved.filter(({ mimeType }) => mimeType?.startsWith('image/'))
  const videos = resolved.filter(({ mimeType }) => mimeType?.startsWith('video/'))
  const primaryImages = images.filter(({ isPrimary }) => isPrimary)

  if (images.length === 0) {
    return 'Opublikowany pierścionek musi mieć co najmniej jedno zdjęcie.'
  }

  if (resolved.some(({ isPrimary, mimeType }) => isPrimary && !mimeType?.startsWith('image/'))) {
    return 'Tylko zdjęcie może być oznaczone jako główne.'
  }

  if (primaryImages.length !== 1) {
    return 'Opublikowany pierścionek musi mieć dokładnie jedno zdjęcie główne.'
  }

  if (videos.length > 1) {
    return 'Pierścionek może mieć najwyżej jeden film.'
  }

  return true
}

export const validateProductMedia: ArrayFieldValidation = async (value, { data, req }) => {
  const product = data as ProductWorkflowData | undefined

  if (product?._status !== 'published' || product.archived) {
    return true
  }

  return validatePublishedProductMedia(value as ProductMediaEntry[] | null | undefined, req)
}

export function applyArchiveStatus<T extends ProductWorkflowData>(data: T): T {
  if (data.archived) {
    return {
      ...data,
      _status: 'draft',
    }
  }

  return data
}

/**
 * Data pierwszej publikacji (plakietka „Nowość” na liście przez 7 dni). Wpisuje się sama, gdy karta jest publikowana,
 * a pole jest puste w zapisie i w poprzedniej wersji. Ręcznie wpisana albo wyczyszczona data zostaje, jak ją zapisano:
 * wyczyszczenie przy kolejnej publikacji nie wraca (pole było już wypełnione w poprzedniej wersji).
 */
export function applyFirstPublishedAt<T extends ProductWorkflowData>(
  data: T,
  originalDoc?: ProductWorkflowData | null,
  now: Date = new Date(),
): T {
  if (data._status !== 'published') return data
  if (data.publishedAt || originalDoc?.publishedAt) return data
  // Karta była już opublikowana (wcześniejszy zapis), a ktoś wyczyścił datę: nie wpisuj jej z powrotem.
  if (originalDoc?._status === 'published') return data
  return { ...data, publishedAt: now.toISOString() }
}
