import type { Metadata } from 'next'
import Image from 'next/image'
import BandConfigurator from '@/components/site/BandConfigurator'
import BandTypes from '@/components/site/BandTypes'
import Faq from '@/components/site/Faq'
import { getGallery } from '@/lib/collection'
import { BAND_CONFIGURATOR_ENABLED } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Obrączki ślubne' }

const FAQ = [
  { q: 'Kiedy przyjść na przymiarkę?', a: 'Najlepiej razem i z zapasem przed ślubem. Wykonanie trwa zwykle [TERMIN]. Palce zmieniają się w ciągu dnia, dlatego mierzymy kilkoma obręczami.' },
  { q: 'Czy możemy użyć złota z rodzinnej biżuterii?', a: 'Najczęściej tak. Najpierw sprawdzimy próbę i ilość złota, potem powiemy, ile trzeba dołożyć.' },
  { q: 'Co można wygrawerować?', a: 'Datę, imiona albo krótki napis po wewnętrznej stronie. Ile znaków się zmieści, zależy od szerokości obrączki.' },
  { q: 'Czy obrączki mogą być różne?', a: 'Tak. Często są tego samego wzoru, ale w innej szerokości, albo jedna ma kamień, a druga nie.' },
]

export default async function BandsPage() {
  // Bez konfiguratora rodzaje obrączek pokazujemy na zdjęciach z galerii CMS.
  const gallery = BAND_CONFIGURATOR_ENABLED ? [] : await getGallery()
  return (
    <>
      <section className="wrap" style={{ paddingTop: 64, paddingBottom: 40, display: 'flex', flexWrap: 'wrap', gap: '24px 72px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h1 className="h1" style={{ flex: '1 1 460px' }}>Obrączki ślubne</h1>
        <div className="stack" style={{ flex: '1 1 380px', maxWidth: '32em', gap: 14 }}>
          <p className="lead">
            Z naszych wzorów albo zaprojektowane dla Was dwojga. Mierzymy oboje, dobieramy szerokość i wykończenie, a w środku grawerujemy to, co ważne.
          </p>
          <p className="price" style={{ fontSize: 16 }}>Od [X] zł za parę</p>
        </div>
      </section>

      {BAND_CONFIGURATOR_ENABLED ? (
        <section aria-label="Dobierz obrączki" className="wrap" style={{ paddingTop: 24, paddingBottom: 104 }}>
          <BandConfigurator />
        </section>
      ) : (
        <section aria-labelledby="rodzaje-obraczek" className="wrap" style={{ paddingTop: 24, paddingBottom: 104 }}>
          <BandTypes gallery={gallery} />
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
        <h2 className="h2">Obrączki z pracowni</h2>
        <div className="cols-auto cols-300" style={{ gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {['[Zdjęcie pary obrączek z pracowni]', '[Zdjęcie graweru w środku obrączki]', '[Zdjęcie obrączki obok pierścionka zaręczynowego]'].map((t) => (
            <div aria-label="Miejsce na zdjęcie obrączek" className="ph-empty" key={t} role="img" style={{ aspectRatio: '4 / 3' }}>
              <Image alt="" height={40} src="/grafiki/ikony/obraczki.svg" width={40} />
              {t}
            </div>
          ))}
        </div>
      </section>

      <section className="ruled">
        <div className="wrap" style={{ paddingTop: 104, paddingBottom: 120, display: 'flex', flexWrap: 'wrap', gap: '48px 96px' }}>
          <h2 className="h2" style={{ flex: '1 1 320px' }}>Pytania o obrączki</h2>
          <div style={{ flex: '2 1 560px', minWidth: 0 }}>
            <Faq items={FAQ} />
          </div>
        </div>
      </section>
    </>
  )
}
