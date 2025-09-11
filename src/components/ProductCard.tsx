'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/lib/wordpress'
import Button from '@/components/Button'

interface Props { product: Product }

export default function ProductCard({ product, cardClassName }: Props & { cardClassName?: string }) {
  const img = product._embedded?.['wp:featuredmedia']?.[0]
  const imageUrl = img?.media_details?.sizes?.large?.source_url || img?.source_url || '/logo-placeholder.png'
  const alt = img?.alt_text || product.title.rendered
  //const price = product.acf?.cena

  return (
    <li className={`group relative flex flex-col h-full overflow-hidden rounded-[8px] border border-transparent shadow-sm transition ease-[var(--ease-standard)] duration-200 hover:shadow-md focus-within:shadow-md hover:-translate-y-0.5 focus-within:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none ${cardClassName || 'bg-[--color-surface]'}`}>
      {/* Stretched clickable overlay (mouse only) */}
      <Link
        href={`/katalog/${product.slug}`}
        aria-label={`Zobacz szczegóły: ${product.title.rendered}`}
        tabIndex={-1}
        aria-hidden="true"
        className="absolute inset-0 z-10"
      />
      {/* Obraz */}
      <div className="relative w-full aspect-square">
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-cover transition-transform duration-300 ease-[var(--ease-standard)] group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
          sizes="(min-width:1024px) 30vw, (min-width:640px) 50vw, 100vw"
        />
      </div>

      {/* Treść (tytuł + cena) */}
      <div className="px-4 py-4 flex-1 flex flex-col items-center justify-center text-center">
        <h3 className="text-lg font-display text-gray-900 dark:text-gray-100 mb-2 leading-tight">
          {product.title.rendered}
        </h3>
        {/*price && (
          <p className="text-base font-semibold text-brand-gold mb-4">
            {price} zł
          </p>
        )*/}
      </div>

      {/* Przycisk CTA */}
      <div className="px-4 pb-4">
        <Button as="link" href={`/katalog/${product.slug}`} variant="secondary" className="w-full py-2 text-sm group-hover:text-brand-gold-soft group-hover:bg-gray-100 dark:group-hover:text-brand-gold-soft dark:group-hover:bg-gray-800">
          Zobacz szczegóły
        </Button>
      </div>
    </li>
  )
}
