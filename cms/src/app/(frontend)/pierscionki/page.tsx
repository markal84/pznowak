import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import SectionIntro from '@/components/site/SectionIntro'
import { getProducts } from '@/lib/collection'
import { toCatalogRing } from '@/lib/catalog'
import CatalogBrowser from '@/components/site/CatalogBrowser'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = pageMetadata({
  title: 'Pierścionki z kamieniami szlachetnymi w złocie',
  description: 'Pierścionki z szafirem, rubinem, szmaragdem i diamentem z naszej pracowni. Zmienimy kamień, kolor złota lub rozmiar.',
  path: '/pierscionki',
})

export default async function CatalogPage() {
  const rings = (await getProducts()).map(toCatalogRing)
  return (
    <>
      <section className="wrap" style={{ paddingTop: 64, paddingBottom: 40 }}>
        <SectionIntro
          as="h1"
          intro="Każdy projekt wykonamy w Twoim rozmiarze. Kamień i kolor złota możemy zmienić. Ceny zaczynają się od [X] zł. Ostateczna zależy od wybranego kamienia i złota."
          title="Pierścionki z pracowni"
        />
      </section>
      <CatalogBrowser rings={rings} />
      <section className="band">
        <div className="wrap cols-auto cols-260" style={{ paddingTop: 72, paddingBottom: 72, gap: '32px 48px' }}>
          {[
            ['Twój rozmiar', 'Rozmiar zmierzymy w pracowni. Jeśli to niespodzianka, podpowiemy, jak go sprawdzić po cichu.'],
            ['Inny kamień, inne złoto', 'Szafir zamiast tanzanitu albo białe złoto zamiast żółtego. Pokażemy kamienie na żywo.'],
            ['Cena przed zamówieniem', 'Wycenę dostajesz po ustaleniu szczegółów. Nic nie wykonujemy bez Twojej akceptacji.'],
          ].map(([t, p]) => (
            <div className="stack" key={t} style={{ gap: 10 }}>
              <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 24, lineHeight: 1.2 }}>{t}</h2>
              <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--graphite-2)' }}>{p}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
