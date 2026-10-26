import React from 'react'
import { getProducts } from '@/lib/wordpress'
import ProductsGrid from '@/components/ProductsGrid'
import PageHero from '@/components/ui/PageHero'

export const revalidate = 60

export const metadata = {
  title: 'Katalog',
  description: 'Katalog pierścionków wykonanych ręcznie w pracowni złotniczej Michała Nowaka. Każdy projekt może stać się punktem wyjścia dla Twojego zamówienia.',
}

export default async function CatalogPage() {
  const products = await getProducts()

  return (
    <>
      <PageHero
        eyebrow="Katalog projektów"
        title={<>Prace, które <em>opuściły pracownię.</em></>}
        lead="Każdy z tych pierścionków powstał na indywidualne zamówienie. Potraktuj je jako punkt wyjścia — Twój projekt zaczniemy od czystej kartki."
      >
        {products.length > 0 && (
          <div className="mt-8 text-[0.6875rem] font-medium uppercase tracking-[0.26em] text-[var(--ink-faint)]">
            {products.length} projektów
          </div>
        )}
      </PageHero>

      <section className="pb-[var(--space-section-md)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="hairline-t pt-14">
            <ProductsGrid products={products} />
          </div>
        </div>
      </section>
    </>
  )
}
