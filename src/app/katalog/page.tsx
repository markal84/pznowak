import React from 'react'
import { getProducts } from '@/lib/wordpress'
import ProductsGrid from '@/components/ProductsGrid'
import Container from '@/components/ui/Container'

export default async function CatalogPage() {
  const products = await getProducts()

  return (
    <>
      {/* Hero */}
      <section className="py-[var(--space-section-sm)] md:py-[var(--space-section-md)] bg-brand-light">
        <Container className="text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display text-gray-900 dark:text-white tracking-normal md:tracking-wide">
            Katalog
          </h1>
        </Container>
      </section>

      {/* Grid produktów */}
      <section className="py-[var(--space-section-sm)] md:py-[var(--space-section-md)]">
        <Container max="7xl">
          <ProductsGrid products={products} />
        </Container>
      </section>
    </>
  )
}
