import { formatProductCount } from '@/lib/project-count'
import type { Metadata } from 'next'
import ContactBand from '@/components/ContactBand'
import JewelCard from '@/components/JewelCard'
import { getProducts } from '@/lib/collection'

export const metadata: Metadata = {
  title: 'Pierścionki — projekty pracowni',
}
export const dynamic = 'force-dynamic'

export default async function Catalog() {
  const products = await getProducts()

  return (
    <>
      <section className="page-intro">
        <div className="wrap">
          <span className="eyebrow">Pierścionki pracowni</span>
          <h1>
            Znajdź swoją <em>inspirację.</em>
          </h1>
          <p className="lead">
            Każdy projekt to inna opowieść. Obejrzyj detale, wybierz bliski Ci styl i porozmawiajmy o
            pierścionku dla Ciebie.
          </p>
        </div>
      </section>
      <section className="wrap" style={{ paddingBottom: 80 }}>
        <div className="catalog-top">
          <p>{formatProductCount(products.length)}</p>
          <p>Wycena indywidualna</p>
        </div>
        <ul className="product-grid">
          {products.map((product) => (
            <JewelCard key={product.id} product={product} />
          ))}
        </ul>
      </section>
      <ContactBand />
    </>
  )
}
