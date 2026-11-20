import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { GUIDE_SEED } from '../content/guides-seed'
import type { GuideBodyBlock, GuideDocument, GuideLayoutBlock } from './guide-types'

export type { GuideDocument, GuideLayoutBlock, GuideBodyBlock } from './guide-types'

/**
 * Poradniki pracowni (/poradniki). Treść jest w Payload (Strona → Poradniki, src/collections/Guides.ts); tu są
 * odczyt opublikowanych poradników i pomocnicze funkcje adresów i dat.
 *
 * Gdy baza nie ma jeszcze żadnego opublikowanego poradnika albo jest niedostępna (np. kod wdrożony przed migracją),
 * strona pokazuje treść z src/content/guides-seed.ts: tę samą, którą `npm run tresci:przenies` wpisuje do panelu.
 */

/** Dane kafelka, listy, mapy strony i danych strukturalnych. */
export type Guide = Pick<
  GuideDocument,
  'slug' | 'title' | 'short' | 'description' | 'topic' | 'published' | 'updated' | 'minutes'
>

export const GUIDES_PATH = '/poradniki'

export const guidePath = (slug: string) => `${GUIDES_PATH}/${slug}`

/** „15 listopada 2026” z daty `RRRR-MM-DD` (bez `Intl`, żeby tekst był ten sam na serwerze i w przeglądarce). */
export function guideDateLabel(date: string): string {
  const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']
  const [year, month, day] = date.split('-').map(Number)
  return `${day} ${months[month - 1]} ${year}`
}

type Raw = Record<string, unknown>

const str = (value: unknown) => (typeof value === 'string' ? value : '')

/** Dokument z Payload → kształt używany przez stronę (bez pól technicznych, bloki z `blockType`). */
export function serializeGuide(doc: Raw): GuideDocument {
  return {
    slug: str(doc.slug),
    title: str(doc.title),
    short: str(doc.short),
    description: str(doc.description),
    metaTitle: str(doc.metaTitle) || null,
    topic: str(doc.topic),
    published: str(doc.published),
    updated: str(doc.updated),
    minutes: typeof doc.minutes === 'number' ? doc.minutes : 1,
    order: typeof doc.order === 'number' ? doc.order : 10,
    lead: str(doc.lead),
    layout: (Array.isArray(doc.layout) ? doc.layout : []) as GuideLayoutBlock[],
    faq: (Array.isArray(doc.faq) ? doc.faq : [])
      .map((item) => ({ question: str((item as Raw).question), answer: str((item as Raw).answer) }))
      .filter((item) => item.question && item.answer),
  }
}

const readPublishedGuides = unstable_cache(
  async (): Promise<GuideDocument[]> => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'guides',
      depth: 0,
      draft: false,
      limit: 100,
      overrideAccess: false,
      pagination: false,
      sort: 'order',
      where: { _status: { equals: 'published' } },
    })
    const guides = result.docs.map((doc) => serializeGuide(doc as unknown as Raw))
    // Pusta lista = treść jeszcze nieprzeniesiona. Rzucamy, żeby pusty wynik nie trafił do pamięci podręcznej.
    if (guides.length === 0) throw new Error('Brak opublikowanych poradników w bazie')
    return guides
  },
  ['published-guides', 'v1'],
  { tags: ['guides'], revalidate: 3600 },
)

const bySortOrder = (a: GuideDocument, b: GuideDocument) => a.order - b.order

/** Opublikowane poradniki w kolejności z panelu. */
export async function getGuideDocuments(): Promise<GuideDocument[]> {
  try {
    return await readPublishedGuides()
  } catch (error) {
    if (!(error instanceof Error && error.message === 'Brak opublikowanych poradników w bazie')) {
      console.error('Poradniki: nie udało się odczytać z Payload, zostaje treść z kodu.', error)
    }
    return [...GUIDE_SEED].sort(bySortOrder)
  }
}

/** Lista poradników do kafelków, listy, mapy strony (bez treści). */
export async function getGuides(): Promise<Guide[]> {
  return (await getGuideDocuments()).map(({ slug, title, short, description, topic, published, updated, minutes }) => ({
    slug,
    title,
    short,
    description,
    topic,
    published,
    updated,
    minutes,
  }))
}

export async function getGuide(slug: string): Promise<GuideDocument | null> {
  return (await getGuideDocuments()).find((guide) => guide.slug === slug) ?? null
}

/** Pozycje spisu treści z sekcji poradnika (sekcja z przykładami cen tylko wtedy, gdy są przykłady). */
export function guideSections(
  guide: Pick<GuideDocument, 'layout' | 'faq'>,
  options: { hasPriceExamples: boolean },
): { id: string; label: string }[] {
  const sections = guide.layout.flatMap((block) => {
    if (block.blockType === 'stone') return [{ id: block.anchor, label: block.name }]
    if (block.blockType === 'priceExamples' && !options.hasPriceExamples) return []
    return [{ id: block.anchor, label: block.tocLabel?.trim() || block.heading }]
  })
  return guide.faq.length > 0 ? [...sections, { id: 'pytania', label: 'Częste pytania' }] : sections
}

/** Czy treść poradnika używa danego bloku osadzonego (np. przykładów z kolekcji, które wymagają listy pierścionków). */
export function guideUsesBlock(guide: Pick<GuideDocument, 'layout'>, types: (GuideLayoutBlock['blockType'] | GuideBodyBlock['blockType'])[]): boolean {
  const wanted = new Set<string>(types)
  const inBody = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return false
    const value = node as { type?: string; fields?: { blockType?: string }; children?: unknown[] }
    if (value.type === 'block' && value.fields?.blockType && wanted.has(value.fields.blockType)) return true
    return Array.isArray(value.children) && value.children.some(inBody)
  }
  return guide.layout.some(
    (block) => wanted.has(block.blockType) || (block.blockType === 'section' && inBody(block.content?.root)),
  )
}
