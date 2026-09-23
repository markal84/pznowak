import { revalidatePath, revalidateTag } from 'next/cache'
import type { PayloadRequest } from 'payload'

type PublicationDocument = {
  _status?: null | string
  slug?: null | string
}

export function publicationAffectsFrontend(
  doc: PublicationDocument,
  previousDoc?: null | PublicationDocument,
): boolean {
  return doc._status === 'published' || previousDoc?._status === 'published'
}

function revalidateProductSlugs(...slugs: (null | string | undefined)[]) {
  for (const slug of new Set(slugs.filter((value): value is string => Boolean(value)))) {
    revalidatePath(`/katalog/${slug}`)
  }
}

export function revalidateFrontend(
  kind: 'product' | 'gallery' | 'site-content',
  doc?: PublicationDocument,
  previousDoc?: null | PublicationDocument,
): void {
  if (kind === 'product') {
    revalidateTag('products', { expire: 0 })
    revalidatePath('/')
    revalidatePath('/katalog')
    revalidateProductSlugs(doc?.slug, previousDoc?.slug)
    return
  }
  if (kind === 'gallery') {
    revalidateTag('gallery', { expire: 0 })
    revalidatePath('/galeria')
    return
  }
  revalidateTag('site-content', { expire: 0 })
  revalidatePath('/', 'layout')
  revalidatePath('/')
  revalidatePath('/o-nas')
  revalidatePath('/kontakt')
}

export function revalidateAfterChange(
  kind: 'product' | 'gallery' | 'site-content',
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
  kind: 'product' | 'gallery',
  doc: PublicationDocument,
  req: PayloadRequest,
): void {
  if (req.context.skipFrontendRevalidation || doc._status !== 'published') {
    return
  }
  revalidateFrontend(kind, doc)
}
