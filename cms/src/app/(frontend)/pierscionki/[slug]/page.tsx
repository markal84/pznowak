import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProducts } from '@/lib/collection'
import { formatMetal, formatStone, similarTo, toCatalogRing } from '@/lib/catalog'
import { productPath, productSeoDescription, productSeoTitle } from '@/lib/product-seo'
import { pageMetadata } from '@/lib/seo'
import { SITE } from '@/lib/site'
import ProductMedia from '@/components/site/ProductMedia'
import RingCard from '@/components/site/RingCard'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const product = (await getProducts()).find((p) => p.slug === slug)
  if (!product) return { title: 'Nie znaleziono projektu', robots: { index: false, follow: false } }
  // Pola z wtyczki SEO, a gdy puste: ten sam tekst, który generuje panel (src/lib/product-seo.ts). Tytuł nigdy nie jest pusty.
  const title = product.seoTitle || productSeoTitle(product)
  const description = product.seoDescription || productSeoDescription(product)
  const image = product.seoImage || product.images[0] || product.imagePath
  return pageMetadata({
    title,
    description,
    path: productPath(product.slug),
    image: image ? { url: image, alt: `Pierścionek ${product.name}` } : undefined,
  })
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params
  const products = await getProducts()
  const product = products.find((p) => p.slug === slug)
  if (!product) notFound()

  const stone = formatStone(product.stone)
  const metal = formatMetal(product.metal)
  const similar = similarTo(product, products, 4).map(toCatalogRing)
  const facts: [string, string][] = [
    ['Kamień główny', stone || '[do uzupełnienia]'],
    ['Złoto', metal ? `${metal}, [próba do uzupełnienia]` : '[do uzupełnienia]'],
  ]
  if (product.carats) facts.push(['Masa kamienia', product.carats])
  if (product.clarity) facts.push(['Czystość kamienia', product.clarity])

  return (
    <>
      <nav aria-label="Ścieżka" className="wrap crumbs">
        <ol>
          <li>
            <Link href="/pierscionki">Pierścionki</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <section className="wrap product">
        <ProductMedia images={product.images} name={product.name} video={product.video} />

        <div className="product-info">
          <div className="stack" style={{ gap: 16 }}>
            <h1 className="h1-product">{product.name}</h1>
            <p className="product-lead">
              {product.lead ||
                'Poznaj projekt naszej pracowni. Porozmawiajmy o jego detalach i możliwościach dopasowania do Ciebie.'}
            </p>
          </div>

          <div className="tag tag-xl">
            <span aria-hidden="true" className="hole" />
            <dl className="facts">
              {facts.map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <dt>Rozmiar</dt>
              <dd>Wykonamy w Twoim rozmiarze</dd>
              <dt>Czas wykonania</dt>
              <dd>[TERMIN], ustalamy przy zamówieniu</dd>
              <dt className="total">Cena</dt>
              <dd className="total">od [X] zł w tej wersji</dd>
            </dl>
          </div>

          {product.description ? <p className="text" style={{ fontSize: 16 }}>{product.description}</p> : null}

          <div className="stack" style={{ gap: 14 }}>
            <div className="row" style={{ gap: '12px 20px' }}>
              <Link
                className="btn"
                href={`/kontakt?temat=kolekcja&projekt=${encodeURIComponent(product.name)}`}
              >
                Zapytaj o ten pierścionek
              </Link>
              <a className="btn btn-line" href={SITE.phoneHref}>
                Zadzwoń: {SITE.phoneShort}
              </a>
            </div>
            <p className="small" style={{ fontSize: 14.5 }}>
              Formularz otworzy się z nazwą tego projektu. Wystarczy dopisać, co chcesz zmienić.
            </p>
          </div>

          <div className="stack" style={{ gap: 14, borderTop: '1px solid var(--line)', paddingTop: 24 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 26, lineHeight: 1.15 }}>Co możesz zmienić</h2>
            <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15.5, lineHeight: 1.55, color: 'var(--graphite-2)' }}>
              <li>Kamień główny, na przykład szafir zamiast tanzanitu</li>
              <li>Kolor złota obrączki i oprawy</li>
              <li>Grubość obrączki i wysokość osadzenia kamienia</li>
              <li>Grawer po wewnętrznej stronie</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="dark">
        <div className="wrap sec-tight stack" style={{ gap: 44 }}>
          <h2 className="h2 h2-md" style={{ maxWidth: '18em', fontSize: 'clamp(34px, 3.6vw, 50px)' }}>
            Jak zamówić projekt z kolekcji
          </h2>
          <ol className="steps" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px 48px' }}>
            <li className="step"><span className="n">1</span><h3>Napisz lub zadzwoń</h3><p>Podaj nazwę projektu i powiedz, co chcesz w nim zmienić.</p></li>
            <li className="step"><span className="n">2</span><h3>Wybierz kamień i rozmiar</h3><p>W pracowni pokażemy kamienie i zmierzymy palec. Potem dostajesz wycenę.</p></li>
            <li className="step"><span className="n">3</span><h3>Odbierz pierścionek</h3><p>Wykonujemy go w pracowni. Damy znać, kiedy będzie gotowy do przymiarki.</p></li>
          </ol>
        </div>
      </section>

      {similar.length > 0 ? (
        <section className="wrap stack" style={{ paddingTop: 96, paddingBottom: 112, gap: 36 }}>
          <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px 40px' }}>
            <h2 className="h2 h2-md" style={{ fontSize: 'clamp(34px, 3.6vw, 50px)' }}>Podobne pierścionki</h2>
            <Link className="tl" href="/pierscionki">Wszystkie pierścionki</Link>
          </div>
          <ul className="ring-grid ring-grid-sm">
            {similar.map((r) => (
              <RingCard
                alt={r.alt}
                image={r.image}
                key={r.slug}
                name={r.name}
                sizes="(max-width: 720px) 50vw, (max-width: 1320px) 25vw, 300px"
                slug={r.slug}
                stone={r.stone}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}
