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