'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/lib/wordpress'

interface Props { product: Product }

export default function ProductCard({ product, cardClassName }: Props & { cardClassName?: string }) {
  const img = product._embedded?.['wp:featuredmedia']?.[0]
  const imageUrl = img?.media_details?.sizes?.large?.source_url || img?.source_url || '/logo-placeholder.png'
  const alt = img?.alt_text || product.title.rendered
  //const price = product.acf?.cena

  return (
    <li className={`group flex flex-col h-full overflow-hidden rounded-lg shadow-sm transition hover:shadow-lg ${cardClassName || 'bg-white'}`}>
      {/* Obraz */}
      <div className="relative w-full aspect-square">
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
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

      {/* Przycisk zawsze przyklejony do dołu */}
      <div className="px-4 pb-4">
      <Link
          href={`/katalog/${product.slug}`}
          className="block w-full rounded-sm border-2 px-6 py-2 text-sm font-medium text-center transition-colors duration-300 border-[#BFA181] text-[#BFA181] hover:bg-[#BFA181] hover:text-white dark:bg-gray-900 dark:border-[#BFA181] dark:text-[#BFA181] dark:hover:bg-[#BFA181] dark:hover:text-gray-900"
        >
          Zobacz szczegóły
        </Link>
      </div>
    </li>
  )
}
