import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import BandConfigurator from '@/components/site/BandConfigurator'
import BandTypes from '@/components/site/BandTypes'
import Faq, { faqPlainItems, type FaqItem } from '@/components/site/Faq'
import JsonLd from '@/components/site/JsonLd'
import { faqJsonLd } from '@/lib/structured-data'
import PriceOffer from '@/components/site/PriceOffer'
import SectionIntro from '@/components/site/SectionIntro'
import Photo from '@/components/site/Photo'
import { BAND_CONFIGURATOR_ENABLED } from '@/lib/site'
import { getPageTexts } from '@/lib/page-texts'
import { pageFaqItems } from '@/lib/page-faq'

export const dynamic = 'force-dynamic'

// Nagłówek, wstęp, cena, pytania i opis dla Google: panel → Teksty stron → Obrączki.
export async function generateMetadata(): Promise<Metadata> {
  const { bands: texts } = await getPageTexts()
  return pageMetadata({ title: texts.metaTitle, description: texts.metaDescription, path: '/obraczki' })
}

const WORKSHOP_PHOTOS = [
  {
    src: '/zdjecia/obraczki/polerowanie.webp',
    alt: 'Cztery złote obrączki na szlifierce podczas polerowania w pracowni',
    position: '50% 100%',
    caption: 'Ostatni szlif przed odbiorem',
  },
  {
    src: '/zdjecia/obraczki/zareczynowy-pave.webp',
    alt: 'Pierścionek zaręczynowy z brylantem i dwie obrączki pavé z drobnymi kamieniami',
    position: '50% 50%',
    caption: 'Obrączki pavé dopasowane do pierścionka zaręczynowego',
  },
] as const

export default async function BandsPage() {
  const { bands: texts } = await getPageTexts()
  const faqItems: FaqItem[] = pageFaqItems(texts.faq)
  return (
    <>
      <section className="wrap stack page-head">
        <SectionIntro as="h1" intro={texts.intro} title={texts.title} />
        <PriceOffer label="Para obrączek" note={texts.priceNote} price={texts.price}>
          <Link className="btn" href="/kontakt?temat=obraczki">
            Umów przymiarkę
          </Link>
        </PriceOffer>
      </section>

      {BAND_CONFIGURATOR_ENABLED ? (
        <section aria-label="Dobierz obrączki" className="surface-paper">
          <div className="wrap sec">
            <BandConfigurator />
          </div>
        </section>
      ) : (
        <section aria-labelledby="rodzaje-obraczek" className="surface-paper">
          <div className="wrap sec">
            <BandTypes />
          </div>
        </section>
      )}

      <section className="dark">
        <div className="wrap sec cols-auto cols-300" style={{ gap: '48px 72px' }}>
          <div className="item-rule" style={{ paddingTop: 22 }}>
            <h2 className="h2 h2-md">Z naszych wzorów</h2>
            <p style={{ maxWidth: '32em', fontSize: 16.5 }}>Wybieracie jeden z wzorów, które pokażemy w pracowni, i dopasowujemy go do Waszych rozmiarów. To najprostsza i najszybsza droga.</p>
          </div>
          <div className="item-rule" style={{ paddingTop: 22 }}>
            <h2 className="h2 h2-md">Zaprojektowane dla Was</h2>
            <p style={{ maxWidth: '32em', fontSize: 16.5 }}>Własny kształt, kamienie, łączenie kolorów złota albo obrączka dopasowana kształtem do pierścionka zaręczynowego, tak żeby przylegały do siebie.</p>
          </div>
        </div>
      </section>

      <section className="wrap sec stack" style={{ gap: 40 }}>
        <SectionIntro eyebrow="Z warsztatu" title="Obrączki z pracowni" />
        <div className="cols-auto cols-300" data-reveal="" style={{ gap: 24 }}>
          {WORKSHOP_PHOTOS.map((p) => (
            <figure className="stack" key={p.src} style={{ gap: 12, margin: 0 }}>
              <Photo alt={p.alt} position={p.position} ratio="43" sizes="(max-width: 720px) 100vw, 380px" src={p.src} />
              <figcaption className="small">{p.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="surface-paper">
        <div className="wrap sec faq-split">
          <SectionIntro eyebrow="Pytania i odpowiedzi" title="Pytania o obrączki" />
          <div style={{ minWidth: 0 }}>
            <JsonLd data={faqJsonLd(faqPlainItems(faqItems))} />
            <Faq items={faqItems} />
            <div className="row gap-14-28" style={{ marginTop: 40 }}>
              <Link className="btn" href="/kontakt?temat=obraczki">
                Umów przymiarkę
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
