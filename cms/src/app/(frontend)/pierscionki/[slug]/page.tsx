import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProducts } from '@/lib/collection'
import { descriptionParagraphs, formatMetal, formatStone, goldColorLabel, similarTo, toCatalogRing } from '@/lib/catalog'
import { productPath, productSeoDescription, productSeoTitle, productStonePhrase } from '@/lib/product-seo'
import { pageMetadata } from '@/lib/seo'
import { breadcrumbJsonLd, productJsonLd } from '@/lib/structured-data'
import { guidePath } from '@/lib/guides'
import { mainStoneGuideAnchor } from '@/lib/guide-links'
import { showPlaceholders } from '@/lib/placeholders'
import { finenessText, stoneCutText, stoneSizeText } from '@/lib/ring-params'
import { SITE } from '@/lib/site'
import CatalogCrumb from '@/components/site/CatalogCrumb'
import DoUzupelnienia from '@/components/site/DoUzupelnienia'
import JsonLd from '@/components/site/JsonLd'
import ProductMedia from '@/components/site/ProductMedia'
import ProductStickyCta from '@/components/site/ProductStickyCta'
import RingCard from '@/components/site/RingCard'
import SectionIntro from '@/components/site/SectionIntro'
import {
  ProductPrice,
  StoneVariantPicker,
  StoneVariantProvider,
  VariantInquiryLink,
  VariantStoneFact,
} from '@/components/site/StoneVariants'
import { formatPrice } from '@/lib/price'
import { cardFilmStone, findVariant, originalSwatch } from '@/lib/stone-variants'
import { uniqueNoteSegments } from '@/lib/unique-note'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ slug: string }> }
type SearchParams = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const product = (await getProducts()).find((p) => p.slug === slug)
  // `noindex` dopisuje Next do odpowiedzi 404 (notFound() w stronie), więc tu bez drugiego znacznika robots.
  if (!product) return { title: 'Nie znaleziono projektu' }
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

export default async function ProductPage({ params, searchParams }: Params & { searchParams: SearchParams }) {
  const { slug } = await params
  // `?kamien=<slug>` (link do wybranego kamienia): adres kanoniczny zostaje bez parametru (generateMetadata).
  const stoneParam = (await searchParams).kamien
  const initialStone = Array.isArray(stoneParam) ? stoneParam[0] : stoneParam
  const products = await getProducts()
  const product = products.find((p) => p.slug === slug)
  if (!product) notFound()

  const stone = formatStone(product.stone)
  const metal = goldColorLabel(product.metal)
  const description = descriptionParagraphs(product.description)
  const similar = similarTo(product, products, 4).map(toCatalogRing)
  // „Ten model”: tekst tylko dla tej karty; nazwy innych kart (np. bliźniaczej) stają się linkami.
  const uniqueNote = uniqueNoteSegments(product.uniqueNote, products, product.slug)
  // Nadtytuł nad nazwą: „Pierścionek z ametystem” (ta sama odmiana co w tytule strony), a gdy kamienia nie da się odmienić, samo „Pierścionek”.
  const stonePhrase = productStonePhrase(product.stone)
  const eyebrow = stonePhrase ? `Pierścionek ${stonePhrase}` : 'Pierścionek'
  const stoneGuide = mainStoneGuideAnchor(product.stone)
  // Pusty kamień albo metal: na produkcji wiersza nie ma, na podglądzie widać znacznik „do uzupełnienia”.
  const facts: [string, ReactNode][] = []
  if (stone) facts.push(['Kamień główny', <VariantStoneFact key="stone">{stone}</VariantStoneFact>])
  else if (showPlaceholders()) {
    facts.push([
      'Kamień główny',
      <VariantStoneFact key="stone">
        <DoUzupelnienia>[do uzupełnienia]</DoUzupelnienia>
      </VariantStoneFact>,
    ])
  }
  // Kolejność: najpierw kamień (kamień, szlif, wymiary, masa, czystość), potem złoto z próbą. Puste pole = brak wiersza.
  const cut = stoneCutText(product.stoneCut)
  const size = stoneSizeText(product.stoneSize)
  const fineness = finenessText(product.goldFineness)
  if (cut) facts.push(['Szlif kamienia', cut])
  if (size) facts.push(['Wymiary kamienia', size])
  if (product.carats) facts.push(['Masa kamienia', product.carats])
  if (product.clarity) facts.push(['Czystość kamienia', product.clarity])
  if (metal) facts.push(['Złoto', fineness ? `${metal}, ${fineness}` : metal])
  else if (showPlaceholders()) facts.push(['Złoto', <DoUzupelnienia key="metal">[do uzupełnienia]</DoUzupelnienia>])

  // Product tylko wtedy, gdy przy pierwszym wyświetleniu karta pokazuje kwotę. Bez ceny („Na zapytanie”) Google zgłasza
  // brak offers/review/aggregateRating. Z `?kamien=<wariant>` (linki z poradnika, RingCard, stare adresy) przywieszka
  // też mówi „Na zapytanie” (warianty są bez ceny), więc cena w danych nie zgadzałaby się ze stroną.
  const variantShown = findVariant(product.stoneVariants, initialStone ?? null)
  const productData = variantShown
    ? null
    : productJsonLd({
        name: product.name,
        path: productPath(product.slug),
        description: product.seoDescription || productSeoDescription(product),
        images: product.images,
        stone,
        metal: formatMetal(product.metal) && fineness ? `${formatMetal(product.metal)}, ${fineness}` : formatMetal(product.metal),
        price: product.price,
      })

  return (
    <StoneVariantProvider initialSlug={initialStone ?? null} variants={product.stoneVariants}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Pierścionki', path: '/pierscionki' },
          { name: product.name, path: productPath(product.slug) },
        ])}
      />
      {productData ? <JsonLd data={productData} /> : null}
      <nav aria-label="Ścieżka" className="wrap crumbs">
        <ol>
          <li>
            <CatalogCrumb slug={product.slug} />
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <section className="wrap product">
        {/* Kolumna z nazwą stoi w HTML przed galerią, żeby H1 był przed H2 „Zamów z innym kamieniem” (kolejność nagłówków
            dla czytników i wyszukiwarek). Na ekranie galeria jest po lewej dzięki `order` w globals.css (.product-media). */}
        <div className="product-info">
          <div className="stack product-head" style={{ gap: 16 }}>
            {/* Na telefonie i tablecie nazwa z ceną stoi nad zdjęciem, żeby cena była na pierwszym ekranie (globals.css). */}
            <div className="product-title">
              {/* Nadtytuł jest częścią H1: nagłówek czyta się „Pierścionek z ametystem Aria”, a na ekranie zostaje duża nazwa. */}
              <h1 className="h1-product">
                <span className="eyebrow">{eyebrow}</span> {product.name}
              </h1>
              <div className="product-price-compact">
                <ProductPrice compact price={formatPrice(product.price)} />
              </div>
            </div>
            <p className="product-lead">
              {product.lead ||
                'Poznaj projekt naszej pracowni. Porozmawiajmy o jego detalach i możliwościach dopasowania do Ciebie.'}
            </p>
          </div>

          <div className="product-price">
            <ProductPrice price={formatPrice(product.price)} />
          </div>

          {/* Przyciski stoją zaraz pod ceną (na komputerze widać je bez przewijania). Na telefonie kolejność ustawia
              `order` w globals.css: opis, potem przyciski, jak dotąd. */}
          <div className="stack product-cta" style={{ gap: 14 }}>
            <div className="row" style={{ gap: '12px 20px' }}>
              <VariantInquiryLink className="btn" projectName={product.name}>
                Zapytaj o ten pierścionek
              </VariantInquiryLink>
              <a className="btn btn-line" href={SITE.phoneHref}>
                Zadzwoń: {SITE.phoneShort}
              </a>
            </div>
            <p className="small" style={{ fontSize: 14.5 }}>
              {product.stoneVariants.length
                ? 'Formularz otworzy się z nazwą projektu i wybranym kamieniem. Wystarczy dopisać, co chcesz zmienić.'
                : 'Formularz otworzy się z nazwą tego projektu. Wystarczy dopisać, co chcesz zmienić.'}
            </p>
          </div>

          <div className="tag tag-xl product-facts">
            <span aria-hidden="true" className="hole" />
            <dl className="facts">
              {facts.map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <dt>Rozmiar</dt>
              <dd>
                Wykonamy w Twoim rozmiarze.{' '}
                <Link href={guidePath('jak-sprawdzic-rozmiar-pierscionka')}>Jak sprawdzić rozmiar</Link>
              </dd>
              <dt>Czas wykonania</dt>
              <dd>Ustalamy przy zamówieniu</dd>
            </dl>
          </div>

          {description.length ? (
            <div className="stack product-desc" style={{ gap: 12 }}>
              {description.map((paragraph, index) => (
                <p className="text" key={index} style={{ fontSize: 16 }}>
                  {paragraph}
                </p>
              ))}
            </div>
          ) : null}

          {uniqueNote.length ? (
            <div className="stack product-note" style={{ gap: 10 }}>
              <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 26, lineHeight: 1.15 }}>
                O pierścionku {product.name}
              </h2>
              <p className="text" style={{ fontSize: 16 }}>
                {uniqueNote.map((segment, index) =>
                  segment.slug ? (
                    <Link href={productPath(segment.slug)} key={index}>
                      {segment.text}
                    </Link>
                  ) : (
                    segment.text
                  ),
                )}
              </p>
            </div>
          ) : null}

          <div className="stack product-changes" style={{ gap: 14, borderTop: '1px solid var(--line)', paddingTop: 24 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 26, lineHeight: 1.15 }}>Co możesz zmienić</h2>
            <ul style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15.5, lineHeight: 1.55, color: 'var(--graphite-2)' }}>
              <li>Kamień główny, na przykład szafir zamiast tanzanitu</li>
              <li>Kolor złota obrączki i oprawy</li>
              <li>Grubość obrączki i wysokość osadzenia kamienia</li>
              <li>Grawer po wewnętrznej stronie</li>
            </ul>
            <p className="small" style={{ fontSize: 14.5 }}>
              Zastanawiasz się nad innym kamieniem? Zobacz{' '}
              <Link href={`${guidePath('kamienie-do-pierscionka-zareczynowego')}${stoneGuide ? `#${stoneGuide}` : ''}`}>
                porównanie kamieni do pierścionka
              </Link>
              . Mieszkasz daleko? Sprawdź, <Link href="/na-zamowienie">jak zamówić bez przyjazdu do Buska-Zdroju</Link>.
            </p>
          </div>
        </div>

        <ProductMedia
          altBase={`Pierścionek ${product.name}${stonePhrase ? ` ${stonePhrase}` : ''}`}
          images={product.images}
          name={product.name}
          filmStone={cardFilmStone(product.video, product.stoneVariants)}
          originalStone={stone}
          video={product.video}
        >
          <StoneVariantPicker originalStone={stone} originalSwatch={originalSwatch(product.stone)} />
        </ProductMedia>
      </section>

      <section className="dark">
        <div className="wrap sec-tight stack" style={{ gap: 44 }}>
          <SectionIntro eyebrow="Zamówienie" size="md" title="Jak zamówić projekt z kolekcji" />
          <ol className="steps" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px 48px' }}>
            <li className="step"><span className="n">1</span><h3>Napisz lub zadzwoń</h3><p>Podaj nazwę projektu i powiedz, co chcesz w nim zmienić.</p></li>
            <li className="step"><span className="n">2</span><h3>Wybierz kamień i rozmiar</h3><p>W pracowni pokażemy kamienie i zmierzymy palec. Potem dostajesz wycenę.</p></li>
            <li className="step"><span className="n">3</span><h3>Odbierz pierścionek</h3><p>Wykonujemy go w pracowni. Damy znać, kiedy będzie gotowy do przymiarki.</p></li>
          </ol>
        </div>
      </section>

      <ProductStickyCta phoneHref={SITE.phoneHref} projectName={product.name} />

      {similar.length > 0 ? (
        <section className="wrap stack" style={{ paddingTop: 96, paddingBottom: 112, gap: 36 }}>
          <SectionIntro
            action={<Link className="tl" href="/pierscionki">Wszystkie pierścionki</Link>}
            eyebrow="Kolekcja"
            size="md"
            title="Podobne pierścionki"
          />
          <ul className={`ring-grid ${similar.length === 4 ? 'ring-grid-4' : 'ring-grid-sm'}`}>
            {similar.map((r) => (
              <RingCard
                alt={r.alt}
                image={r.image}
                key={r.slug}
                name={r.name}
                sizes="(max-width: 960px) 50vw, 25vw"
                slug={r.slug}
                stone={r.stone}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </StoneVariantProvider>
  )
}
