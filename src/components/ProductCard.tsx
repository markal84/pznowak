import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/lib/wordpress'

interface Props { product: Product; priority?: boolean }

export default function ProductCard({ product, priority }: Props) {
  const img = product._embedded?.['wp:featuredmedia']?.[0]
  const imageUrl = img?.media_details?.sizes?.large?.source_url || img?.source_url || '/logo-placeholder.png'
  const alt = img?.alt_text || product.title.rendered
  const meta = [product.acf?.rodzaj_kamienia, product.acf?.kolor_metalu].filter(Boolean).join(' · ')

  return (
    <li className="reveal">
      <Link href={`/katalog/${product.slug}`} className="group block lift rounded-lg bg-paper border border-line overflow-hidden">
        <div className="img-zoom relative aspect-[4/5] overflow-hidden bg-ivory-2">
          <Image
            src={imageUrl}
            alt={alt}
            fill
            priority={priority}
            className="object-cover"
            sizes="(min-width:1024px) 30vw, (min-width:640px) 50vw, 100vw"
          />
        </div>
        <div className="p-5">
          <h3 className="text-2xl leading-tight" dangerouslySetInnerHTML={{ __html: product.title.rendered }} />
          {meta && <p className="mt-1 text-sm text-ink-3">{meta}</p>}
          <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-gold">
            Zobacz szczegóły
            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </span>
        </div>
      </Link>
    </li>
  )
}
