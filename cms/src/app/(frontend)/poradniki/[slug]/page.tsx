import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import GuideContent from '@/components/site/GuideContent'
import GuideLayout from '@/components/site/GuideLayout'
import { getProducts, type Jewel } from '@/lib/collection'
import { priceExamples, toCatalogRing } from '@/lib/catalog'
import { getGuide, getGuides, guidePath, guideSections, guideUsesBlock } from '@/lib/guides'
import type { GuideStoneBlock } from '@/lib/guide-types'
import { formatPrice } from '@/lib/price'
import { pageMetadata } from '@/lib/seo'

// Treść z panelu (Strona → Poradniki); przykłady pierścionków i ceny z kolekcji przy każdym wejściu.
export const dynamic = 'force-dynamic'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const guide = await getGuide((await params).slug)
  if (!guide) return {}
  return pageMetadata({
    title: guide.metaTitle?.trim() || guide.title,
    description: guide.description,
    path: guidePath(guide.slug),
  })
}

export default async function GuidePage({ params }: { params: Params }) {
  const slug = (await params).slug
  const [guide, allGuides] = await Promise.all([getGuide(slug), getGuides()])
  if (!guide) notFound()

  // Lista pierścionków tylko dla poradników, które pokazują przykłady albo ceny z kolekcji.
  const products: Jewel[] = guideUsesBlock(guide, ['stone', 'priceExamples', 'ifPrices']) ? await getProducts() : []
  const examples = priceExamples(products.map(toCatalogRing))
  // Podajemy tylko cenę „od”: górna granica klienta nie interesuje, a zniechęca bardziej, niż pomaga.
  const lowest = examples[0]?.price ?? null
  const stones = guide.layout.filter((block): block is GuideStoneBlock => block.blockType === 'stone')
  const context = { lowestPrice: lowest !== null ? formatPrice(lowest) : null, stones }

  return (
    <GuideLayout
      allGuides={allGuides}
      faq={guide.faq.map(({ question, answer }) => ({ q: question, text: answer }))}
      guide={guide}
      lead={guide.lead}
      sections={guideSections(guide, { hasPriceExamples: examples.length > 0 })}
    >
      <GuideContent context={context} guide={guide} priceExamples={examples} products={products} />
    </GuideLayout>
  )
}
