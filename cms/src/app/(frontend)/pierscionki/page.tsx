import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import PriceOffer from '@/components/site/PriceOffer'
import SectionIntro from '@/components/site/SectionIntro'
import { getProducts } from '@/lib/collection'
import { catalogCanonicalPath, filterRings, paginate, parseCatalogParams, sortRings, toCatalogRing } from '@/lib/catalog'
import { guidePath } from '@/lib/guides'
import { productPath } from '@/lib/product-seo'
import { itemListJsonLd } from '@/lib/structured-data'
import JsonLd from '@/components/site/JsonLd'
import Link from 'next/link'
import { byEnv } from '@/lib/placeholders'
import { formatPrice, lowestPrice } from '@/lib/price'
import CatalogBrowser from '@/components/site/CatalogBrowser'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const query = await searchParams
  const params = parseCatalogParams((key) => {
    const value = query[key]
    return Array.isArray(value) ? value[0] : value
  })
  const path = catalogCanonicalPath(params, (await getProducts()).length)
  const page = Number(new URLSearchParams(path.split('?')[1] ?? '').get('strona') ?? 1)
  return pageMetadata({
    title: `Pierścionki zaręczynowe z kamieniami szlachetnymi – Busko-Zdrój${page > 1 ? ` (strona ${page})` : ''}`,
    description: 'Pierścionki z szafirem, rubinem, szmaragdem i diamentem z naszej pracowni. Zmienimy kamień, kolor złota lub rozmiar.',
    path,
  })
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const rings = (await getProducts()).map(toCatalogRing)
  // Dane strukturalne: karty z bieżącego widoku listy (te same filtry, sortowanie i strona co w CatalogBrowser).
  const query = await searchParams
  const params = parseCatalogParams((key) => {
    const value = query[key]
    return Array.isArray(value) ? value[0] : value
  })
  const shown = paginate(sortRings(filterRings(rings, params.stone, params.gold), params.sort), params.page).items
  // Najniższa cena z kart z ceną; bez żadnej ceny zostaje dotychczasowy znacznik (podgląd) albo sam brak przywieszki (produkcja).
  const lowest = lowestPrice(rings)
  return (
    <>
      <JsonLd data={itemListJsonLd(shown.map((r) => ({ name: `Pierścionek ${r.name}`, path: productPath(r.slug) })))} />
      <section className="wrap stack catalog-head page-head">
        <SectionIntro
          as="h1"
          intro="Każdy projekt wykonamy w Twoim rozmiarze. Kamień i kolor złota możemy zmienić."
          title="Pierścionki z pracowni"
        />
        <div className="catalog-offer">
          <PriceOffer
            label="Pierścionek z kolekcji"
            note={
              lowest !== null
                ? 'Ostateczna cena zależy od wybranego kamienia i złota.'
                : byEnv('Ostateczna cena zależy od wybranego kamienia i złota.', undefined)
            }
            price={lowest !== null ? formatPrice(lowest) : byEnv('od [X] zł', undefined)}
            size="sm"
          />
        </div>
      </section>
      <CatalogBrowser rings={rings} />
      <section className="band">
        <div className="wrap cols-auto cols-260" style={{ paddingTop: 72, paddingBottom: 72, gap: '32px 48px' }}>
          {[
            ['Twój rozmiar', 'Rozmiar zmierzymy w pracowni. Jeśli to niespodzianka, podpowiemy, jak go sprawdzić po cichu.', guidePath('jak-sprawdzic-rozmiar-pierscionka'), 'Jak sprawdzić rozmiar pierścionka'],
            ['Inny kamień, inne złoto', 'Szafir zamiast tanzanitu albo białe złoto zamiast żółtego. Pokażemy kamienie na żywo.', guidePath('kamienie-do-pierscionka-zareczynowego'), 'Jaki kamień wybrać'],
            ['Cena przed zamówieniem', 'Wycenę dostajesz po ustaleniu szczegółów. Nic nie wykonujemy bez Twojej akceptacji.', guidePath('ile-kosztuje-pierscionek-na-zamowienie'), 'Z czego składa się cena'],
          ].map(([t, p, href, label]) => (
            <div className="stack" key={t} style={{ gap: 10 }}>
              <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 24, lineHeight: 1.2 }}>{t}</h2>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--graphite-2)' }}>{p}</p>
              <Link className="tl" href={href} style={{ alignSelf: 'flex-start' }}>
                {label}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
