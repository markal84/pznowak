import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { PAGE_TEXT_DEFAULTS, type PageFaqItem, type PageTexts } from '../content/page-texts'

export type Announcement = { text: string; linkUrl: string | null; linkLabel: string; until: string | null }

export type ResolvedPageTexts = PageTexts & { announcement: Announcement | null }

type Raw = Record<string, unknown> | null | undefined

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null)

/** Pola z panelu na wierzchu wartości domyślnych: puste pole (albo brak bazy) = dotychczasowy tekst strony. */
function mergeSection<T extends Record<string, unknown>>(defaults: T, raw: Raw): T {
  const result: Record<string, unknown> = { ...defaults }
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = raw?.[key]
    if (Array.isArray(fallback)) {
      const items = Array.isArray(value) ? value.flatMap((item) => faqItem(item)) : []
      result[key] = items.length > 0 ? items : fallback
    } else {
      result[key] = text(value) ?? fallback
    }
  }
  return result as T
}

function faqItem(raw: unknown): PageFaqItem[] {
  const item = raw as Raw
  const question = text(item?.question)
  const answer = text(item?.answer)
  if (!question || !answer) return []
  return [
    {
      question,
      answer,
      ...(text(item?.previewNote) ? { previewNote: text(item?.previewNote)! } : {}),
      ...(item?.previewOnly ? { previewOnly: true } : {}),
    },
  ]
}

function announcement(raw: Raw): Announcement | null {
  const value = text(raw?.text)
  if (!value) return null
  return {
    text: value,
    linkUrl: text(raw?.linkUrl),
    linkLabel: text(raw?.linkLabel) ?? 'Szczegóły',
    until: text(raw?.until),
  }
}

/** Teksty z opublikowanej wersji globalu „Teksty stron” połączone z wartościami domyślnymi. Czysta funkcja do testów. */
export function resolvePageTexts(raw: Raw): ResolvedPageTexts {
  const section = (key: keyof PageTexts) => raw?.[key] as Raw
  return {
    home: mergeSection(PAGE_TEXT_DEFAULTS.home, section('home')),
    catalog: mergeSection(PAGE_TEXT_DEFAULTS.catalog, section('catalog')),
    order: mergeSection(PAGE_TEXT_DEFAULTS.order, section('order')),
    bands: mergeSection(PAGE_TEXT_DEFAULTS.bands, section('bands')),
    guides: mergeSection(PAGE_TEXT_DEFAULTS.guides, section('guides')),
    about: mergeSection(PAGE_TEXT_DEFAULTS.about, section('about')),
    announcement: announcement(raw?.announcement as Raw),
  }
}

const readPublishedSiteContent = unstable_cache(
  async () => {
    const payload = await getPayload({ config })
    return (await payload.findGlobal({ slug: 'site-content', depth: 0, draft: false, overrideAccess: false })) as unknown as Raw
  },
  ['published-site-content', 'v-teksty-stron'],
  { tags: ['site-content'], revalidate: 3600 },
)

/**
 * Teksty stron do renderowania. Błąd bazy (np. kod wdrożony przed migracją) nie psuje strony: zostają teksty domyślne,
 * a błąd trafia do logu. Błędów nie zapisujemy w pamięci podręcznej, więc po migracji wystarczy kolejne wejście.
 */
export async function getPageTexts(): Promise<ResolvedPageTexts> {
  try {
    return resolvePageTexts(await readPublishedSiteContent())
  } catch (error) {
    console.error('Teksty stron: nie udało się odczytać z Payload, zostają teksty domyślne.', error)
    return resolvePageTexts(null)
  }
}

/** Czy pasek ma być widoczny dziś (data w strefie czasowej pracowni). */
export function announcementVisible(value: Announcement | null, now = new Date()): value is Announcement {
  if (!value) return false
  if (!value.until) return true
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(now)
  return today <= value.until
}
