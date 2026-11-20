/**
 * Kształt poradnika używany przez stronę (src/lib/guides.ts) i treść startową (src/content/guides-seed.ts).
 * Teksty z formatowaniem to stan edytora Lexical z Payload (JSON); renderuje je src/components/site/GuideRichText.tsx.
 */

export type LexicalNode = {
  type: string
  version?: number
  children?: LexicalNode[]
  text?: string
  format?: number | string
  tag?: string
  listType?: 'bullet' | 'number' | 'check'
  fields?: Record<string, unknown> & { blockType?: string; url?: string; linkType?: string; newTab?: boolean }
  [key: string]: unknown
}

export type RichTextValue = { root: LexicalNode } | null | undefined

export type StoneDaily = 'Bardzo dobry' | 'Dobry' | 'Dobry w ochronnej oprawie'

export type GuideCatalogFilter = 'niebieskie' | 'zielone' | 'rozowe' | 'fioletowe' | 'zolte' | 'bezbarwne'

export type GuideSectionBlock = {
  blockType: 'section'
  id?: string | null
  heading: string
  anchor: string
  tocLabel?: string | null
  content: RichTextValue
}

export type GuideStoneBlock = {
  blockType: 'stone'
  id?: string | null
  name: string
  anchor: string
  mohs: string
  colors: string
  daily: StoneDaily
  text: RichTextValue
  /** Początki nazw kamienia głównego z karty, po przecinku („ametyst, cytryn”). */
  catalogStones: string
  includeVariants?: boolean | null
  catalogFilter: GuideCatalogFilter
  catalogLinkLabel: string
}

export type GuidePriceExamplesBlock = {
  blockType: 'priceExamples'
  id?: string | null
  heading: string
  anchor: string
  tocLabel?: string | null
  intro: RichTextValue
  linkLabel: string
}

export type GuideLayoutBlock = GuideSectionBlock | GuideStoneBlock | GuidePriceExamplesBlock

/** Bloki osadzone w tekście sekcji (pole `fields` węzła `block` w Lexical). */
export type GuideBodyBlock =
  | { blockType: 'ringSizeCalculator' }
  | { blockType: 'ringSizeTable'; caption?: string | null }
  | { blockType: 'ringSizeFigure'; figcaption?: string | null }
  | { blockType: 'stoneComparison'; caption?: string | null }
  | {
      blockType: 'dataTable'
      caption?: string | null
      columns?: { label: string }[] | null
      rows?: { label: string; cells?: { text: string }[] | null }[] | null
    }
  | { blockType: 'note'; text: RichTextValue }
  | { blockType: 'ifPrices'; withPrices?: RichTextValue; withoutPrices?: RichTextValue }

export type GuideDocument = {
  slug: string
  title: string
  short: string
  description: string
  metaTitle?: string | null
  topic: string
  published: string
  updated: string
  minutes: number
  order: number
  lead: string
  layout: GuideLayoutBlock[]
  faq: { question: string; answer: string }[]
}
