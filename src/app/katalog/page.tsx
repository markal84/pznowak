import React from 'react'
import Image from 'next/image'
import { getProducts } from '@/lib/wordpress'
import ProductsGrid from '@/components/ProductsGrid'

export default async function CatalogPage() {
  const products = await getProducts()

  return (
    <>
      {/* Hero */}
      <section className="py-20 brand-light">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display text-brand-gold tracking-wider mb-8">
            WARSZTAT ZŁOTNICZY
          </h1>
          <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-12">
          <Image
            src="/placeholder-single-ring.png"
            alt="Pierścionek"
            fill
            style={{ objectFit: 'contain' }}
          />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display text-brand-gold tracking-wider">
            KATALOG
          </h2>
        </div>
      </section>

      {/* Grid produktów */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <ProductsGrid products={products} />
        </div>
      </section>
    </>
  )
}