import React from 'react'
import type { Metadata } from 'next'
import { getProducts } from '@/lib/wordpress'
import ProductsGrid from '@/components/ProductsGrid'
import SectionTitle from '@/components/ui/SectionTitle'
import Button from '@/components/Button'
import { PHONE_NUMBER } from '@/lib/socials'
import { FaPhone } from 'react-icons/fa'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Katalog pierścionków',
  description: 'Przykłady pierścionków zaręczynowych i biżuterii wykonanych ręcznie w pracowni Michała Nowaka. Każdy projekt można dopasować.',
}

export default async function CatalogPage() {
  const products = await getProducts()
  const telHref = `tel:${PHONE_NUMBER.replace(/[^+\d]/g, '')}`

  return (
    <>
      <section className="pt-10 md:pt-16 pb-8 md:pb-10 border-b border-line">
        <div className="container-x flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <SectionTitle
            as="h1"
            eyebrow="Katalog"
            size="lg"
            title="Realizacje z pracowni"
            lead="To pierścionki wykonane na zamówienie. Każdy z nich można powtórzyć, zmienić kamień, kolor złota lub proporcje. Ceny podajemy po rozmowie, bo zależą od kamienia i rozmiaru."
          />
          <a href={telHref} className="inline-flex items-center gap-3 self-start md:self-auto h-12 px-5 rounded border border-line-strong font-semibold hover:border-gold hover:text-gold transition-colors shrink-0">
            <FaPhone className="h-4 w-4 text-gold" aria-hidden /> Zapytaj o cenę
          </a>
        </div>
      </section>

      <section className="section pt-10 md:pt-14">
        <div className="container-x">
          <ProductsGrid products={products} />
        </div>
      </section>

      <section className="section pt-0">
        <div className="container-x">
          <div className="rounded-lg bg-ivory-2 border border-line p-8 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center reveal">
            <div className="lg:col-span-8">
              <p className="eyebrow">Nie znalazłeś swojego?</p>
              <h2 className="mt-2 text-[1.9rem] md:text-[2.4rem]">Większość pierścionków, które robimy, nie jest w katalogu</h2>
              <p className="mt-3 muted text-lg">Powstają na rozmowie, od szkicu. Opowiedz, dla kogo ma być, a my zaproponujemy kamień i formę.</p>
            </div>
            <div className="lg:col-span-4 flex lg:justify-end">
              <Button as="link" href="/kontakt" size="lg">Umów rozmowę</Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
