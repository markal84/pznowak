import type { Metadata } from 'next'
import Link from 'next/link'
import GuideCards from '@/components/site/GuideCards'
import JsonLd from '@/components/site/JsonLd'
import SectionIntro from '@/components/site/SectionIntro'
import { GUIDES, GUIDES_PATH, guidePath } from '@/lib/guides'
import { pageMetadata } from '@/lib/seo'
import { SITE } from '@/lib/site'
import { breadcrumbJsonLd, itemListJsonLd } from '@/lib/structured-data'

export const metadata: Metadata = pageMetadata({
  title: 'Poradniki: rozmiar, kamienie i cena pierścionka',
  description:
    'Poradniki pracowni złotniczej z Buska-Zdroju: jak sprawdzić rozmiar pierścionka, jaki kamień wybrać i z czego składa się cena pierścionka na zamówienie.',
  path: GUIDES_PATH,
})

export default function GuidesPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Poradniki', path: GUIDES_PATH }])} />
      <JsonLd data={itemListJsonLd(GUIDES.map((g) => ({ name: g.title, path: guidePath(g.slug) })))} />
      <section className="wrap" style={{ paddingTop: 64, paddingBottom: 48 }}>
        <SectionIntro
          as="h1"
          intro="Odpowiedzi na pytania, które słyszymy w pracowni najczęściej. Bez żargonu, z liczbami i przykładami, tak żeby dało się podjąć decyzję jeszcze przed pierwszą rozmową."
          title="Poradniki pracowni"
        />
      </section>
      <section className="wrap" style={{ paddingBottom: 104 }}>
        <GuideCards heading="h2" />
      </section>
      <section className="band">
        <div className="wrap sec-tight" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px 64px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="stack" style={{ gap: 12, flex: '1 1 480px', minWidth: 0 }}>
            <h2 className="h2 h2-md">Nie ma tu Twojego pytania?</h2>
            <p className="text" style={{ maxWidth: '34em' }}>
              Zapytaj wprost. Odpowiada złotnik, który wykona Twój pierścionek.
            </p>
          </div>
          <div className="row gap-14-28">
            <Link className="btn" href="/kontakt">
              Napisz do pracowni
            </Link>
            <a className="tl" href={SITE.phoneHref}>
              Zadzwoń: {SITE.phoneShort}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
