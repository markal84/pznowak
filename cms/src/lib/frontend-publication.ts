import { revalidatePath, revalidateTag } from 'next/cache'
import type { PayloadRequest } from 'payload'

type PublicationDocument = {
  _status?: null | string
  slug?: null | string
}

export type PublicationKind = 'product' | 'gallery' | 'work' | 'guide' | 'site-content'

export function publicationAffectsFrontend(
  doc: PublicationDocument,
  previousDoc?: null | PublicationDocument,
): boolean {
  return doc._status === 'published' || previousDoc?._status === 'published'
}

function revalidateProductSlugs(...slugs: (null | string | undefined)[]) {
  for (const slug of new Set(slugs.filter((value): value is string => Boolean(value)))) {
    revalidatePath(`/pierscionki/${slug}`)
  }
}

export function revalidateFrontend(
  kind: PublicationKind,
  doc?: PublicationDocument,
  previousDoc?: null | PublicationDocument,
): void {
  if (kind === 'product') {
    revalidateTag('products', { expire: 0 })
    // Realizacje linkują do pierścionków z katalogu („Zobacz w katalogu”), więc zmiana pierścionka odświeża też je.
    revalidateTag('works', { expire: 0 })
    revalidatePath('/')
    revalidatePath('/pierscionki')
    revalidatePath('/na-zamowienie')
    revalidatePath('/naprawy')
    revalidatePath('/realizacje')
    revalidateProductSlugs(doc?.slug, previousDoc?.slug)
    return
  }
  if (kind === 'gallery') {
    revalidateTag('gallery', { expire: 0 })
    revalidatePath('/realizacje')
    return
  }
  if (kind === 'work') {
    revalidateTag('works', { expire: 0 })
    revalidatePath('/realizacje')
    return
  }
  if (kind === 'guide') {
    // Poradniki: lista, strona poradnika, kafelki (strona główna, „Na zamówienie”, „Czytaj dalej”) i mapa strony.
    revalidateTag('guides', { expire: 0 })
    revalidatePath('/poradniki', 'layout')
    revalidatePath('/')
    revalidatePath('/na-zamowienie')
    revalidatePath('/sitemap.xml')
    return
  }
  // Teksty stron i pasek z komunikatem (src/globals/SiteContent.ts): pasek jest w układzie całej strony.
  revalidateTag('site-content', { expire: 0 })
  revalidatePath('/', 'layout')
  revalidatePath('/')
  revalidatePath('/pracownia')
  revalidatePath('/kontakt')
}

export function revalidateAfterChange(
  kind: PublicationKind,
  doc: PublicationDocument,
  previousDoc: null | PublicationDocument | undefined,
  req: PayloadRequest,
): void {
  if (req.context.skipFrontendRevalidation || !publicationAffectsFrontend(doc, previousDoc)) {
    return
  }
  revalidateFrontend(kind, doc, previousDoc)
}

export function revalidateAfterDelete(
  kind: Exclude<PublicationKind, 'site-content'>,
  doc: PublicationDocument,
  req: PayloadRequest,
): void {
  if (req.context.skipFrontendRevalidation || doc._status !== 'published') {
    return
  }
  revalidateFrontend(kind, doc)
}
