import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/lib/wordpress'

interface Props {
  product: Product
  cardClassName?: string
  /** Ustaw dla kart widocznych nad zgięciem (LCP) */
  priority?: boolean
}

/**
 * Karta w stylu galerii sztuki: kadr 4:5, powolny zoom na hoverze,
 * podpis serifem pod kadrem — bez "pudełka".
 */
export default function ProductCard({ product, cardClassName = '', priority = false }: Props) {
  const img = product._embedded?.['wp:featuredmedia']?.[0]
  const imageUrl = img?.media_details?.sizes?.large?.source_url || img?.source_url || '/logo-placeholder.png'
  const alt = img?.alt_text || product.title.rendered

  return (
    <Link
      href={`/katalog/${product.slug}`}
      className={`group block focus-visible:outline-none ${cardClassName}`}
      aria-label={`Zobacz projekt: ${product.title.rendered}`}
    >
      <div className="frame-zoom relative aspect-[4/5] bg-[var(--paper-deep)]">
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-cover"
          sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 100vw"
          priority={priority}
        />
        {/* Delikatna winieta na hoverze */}
        <div className="absolute inset-0 bg-[var(--noir)]/0 transition-colors duration-500 group-hover:bg-[var(--noir)]/10" aria-hidden />
      </div>
      <div className="mt-5 flex items-baseline justify-between gap-4">
        <h3
          className="font-display text-xl md:text-[1.35rem] leading-snug transition-colors duration-300 group-hover:text-[var(--gold-deep)] group-focus-visible:text-[var(--gold-deep)]"
          dangerouslySetInnerHTML={{ __html: product.title.rendered }}
        />
        <span
          className="shrink-0 text-[0.625rem] font-medium uppercase tracking-[0.24em] text-[var(--ink-faint)] transition-colors duration-300 group-hover:text-[var(--gold-deep)]"
        >
          Zobacz&nbsp;→
        </span>
      </div>
    </Link>
  )
}
