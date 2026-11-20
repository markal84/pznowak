import { Fragment } from 'react'
import Link from 'next/link'

import { GuideRichText, type GuideRenderContext } from '@/components/site/GuideRichText'
import RingCard from '@/components/site/RingCard'
import type { Jewel } from '@/lib/collection'
import { catalogHref, formatStone, mainStoneOf, ringsWithMainStone, toCatalogRing, type CatalogRing } from '@/lib/catalog'
import type { GuideDocument, GuidePriceExamplesBlock, GuideStoneBlock } from '@/lib/guide-types'
import { variantImageAlt } from '@/lib/stone-variants'

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** „ametyst, cytryn” → /^(ametyst|cytryn)/ (początek nazwy kamienia głównego z karty, jak w `mainStoneOf`). */
export function stonePattern(names: string): RegExp | null {
  const parts = names
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .map(escapeRegExp)
  return parts.length > 0 ? new RegExp(`^(${parts.join('|')})`) : null
}

function StoneSection({ stone, products, context }: { stone: GuideStoneBlock; products: readonly Jewel[]; context: GuideRenderContext }) {
  const match = stonePattern(stone.catalogStones)
  const direct = match
    ? ringsWithMainStone(products, match, 3).map((p) => ({ ...toCatalogRing(p), href: undefined as string | undefined }))
    : []
  // Gdy kamień ma mało pierścionków jako kamień główny, uzupełniamy przykłady kartami z tym kamieniem jako wariantem (`?kamien=…`).
  const variants =
    stone.includeVariants && match
      ? products
          .filter((p) => !direct.some((r) => r.slug === p.slug))
          .flatMap((p) =>
            p.stoneVariants
              .filter((v) => match.test(mainStoneOf(v.stone)))
              .slice(0, 1)
              .map((v) => ({
                slug: p.slug,
                name: p.name,
                stone: formatStone(v.stone),
                image: v.image,
                alt: variantImageAlt(`Pierścionek ${p.name}`, v),
                href: `/pierscionki/${p.slug}?kamien=${v.slug}`,
              })),
          )
      : []
  const examples = [...direct, ...variants].slice(0, 3)
  return (
    <section aria-labelledby={stone.anchor} className="guide-stone">
      <h2 id={stone.anchor}>{stone.name}</h2>
      <p className="guide-stone-facts">
        Twardość {stone.mohs} · {stone.colors}
      </p>
      <GuideRichText context={context} value={stone.text} />
      {examples.length > 0 ? (
        <>
          <h3>Z naszej pracowni</h3>
          <ul className="ring-grid guide-rings">
            {examples.map((r) => (
              <RingCard
                alt={r.alt}
                href={r.href}
                image={r.image}
                key={r.slug}
                name={r.name}
                sizes="(max-width: 720px) 50vw, 240px"
                slug={r.slug}
                stone={r.stone}
              />
            ))}
          </ul>
        </>
      ) : null}
      <p>
        <Link className="tl" href={catalogHref({ stone: stone.catalogFilter, gold: 'all', page: 1 })}>
          Zobacz {stone.catalogLinkLabel}
        </Link>
      </p>
    </section>
  )
}

function PriceExamplesSection({
  block,
  examples,
  context,
}: {
  block: GuidePriceExamplesBlock
  examples: readonly CatalogRing[]
  context: GuideRenderContext
}) {
  if (examples.length === 0) return null
  return (
    <>
      <h2 id={block.anchor}>{block.heading}</h2>
      <GuideRichText context={context} value={block.intro} />
      <ul className="ring-grid guide-rings guide-rings-4">
        {examples.map((r) => (
          <RingCard
            alt={r.alt}
            detailed
            gold={r.goldLabel}
            image={r.image}
            key={r.slug}
            name={r.name}
            price={r.price}
            sizes="(max-width: 720px) 50vw, 200px"
            slug={r.slug}
            stone={r.stone}
          />
        ))}
      </ul>
      <p>
        <Link className="tl" href={catalogHref({ stone: 'all', gold: 'all', page: 1, sort: 'cena-rosnaco' })}>
          {block.linkLabel}
        </Link>
      </p>
    </>
  )
}

/** Treść poradnika: sekcje z panelu po kolei, na końcu „Częste pytania”. */
export default function GuideContent({
  guide,
  products,
  priceExamples,
  context,
}: {
  guide: Pick<GuideDocument, 'layout' | 'faq'>
  products: readonly Jewel[]
  priceExamples: readonly CatalogRing[]
  context: GuideRenderContext
}) {
  return (
    <>
      {guide.layout.map((block, index) => {
        const key = block.id ?? `${block.blockType}-${index}`
        if (block.blockType === 'stone') return <StoneSection context={context} key={key} products={products} stone={block} />
        if (block.blockType === 'priceExamples') {
          return <PriceExamplesSection block={block} context={context} examples={priceExamples} key={key} />
        }
        return (
          <Fragment key={key}>
            <h2 id={block.anchor}>{block.heading}</h2>
            <GuideRichText context={context} value={block.content} />
          </Fragment>
        )
      })}
      {guide.faq.length > 0 ? (
        <>
          <h2 id="pytania">Częste pytania</h2>
          <dl className="guide-faq">
            {guide.faq.map((item) => (
              <div key={item.question}>
                <dt>{item.question}</dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </>
  )
}
