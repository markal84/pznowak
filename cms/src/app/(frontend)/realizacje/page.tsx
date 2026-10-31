import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { getGallery } from '@/lib/collection'
import { byEnv, showPlaceholders } from '@/lib/placeholders'
import DoUzupelnienia from '@/components/site/DoUzupelnienia'
import GoogleReviews from '@/components/site/GoogleReviews'
import Photo from '@/components/site/Photo'
import SectionIntro from '@/components/site/SectionIntro'
import WorksBrowser, { type Work } from '@/components/site/WorksBrowser'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = pageMetadata({
  title: 'Realizacje pracowni',
  description: 'Pierścionki i obrączki wykonane w naszej pracowni w Busku-Zdroju.',
  path: '/realizacje',
})

export default async function WorksPage() {
  const gallery = await getGallery()
  // Wyróżniona realizacja ma jeszcze opisy „do uzupełnienia”: na produkcji jej nie ma, zdjęcie idzie do siatki.
  const featured = showPlaceholders() ? gallery[0] : undefined
  const rest = showPlaceholders() ? gallery.slice(1) : gallery
  const works: Work[] = rest.map((g, i) => ({
    id: g.id,
    kind: 'zamowienie',
    kindLabel: 'Na zamówienie',
    title: `Realizacja ${i + 1}`,
    text: byEnv('[Krótko: dla kogo i co było zadaniem]', ''),
    image: g.image,
    alt: `Realizacja pracowni ${i + 1}`,
  }))

  return (
    <>
      <section className="wrap" style={{ paddingTop: 64, paddingBottom: 48 }}>
        <SectionIntro
          as="h1"
          intro={byEnv(
            'Biżuteria zrobiona dla konkretnych osób. Przy każdej piszemy krótko, co było zadaniem.',
            'Biżuteria zrobiona dla konkretnych osób.',
          )}
          action={<Link className="tl" href="/naprawy">Naprawy i przeróbki →</Link>}
          title="Realizacje"
        />
      </section>

      {featured ? (
        <section className="wrap" style={{ paddingBottom: 96 }}>
          <article className="feature">
            <div className="stack" style={{ flex: '1 1 560px', minWidth: 0, gap: 4 }}>
              <Photo alt="Wyróżniona realizacja pracowni" priority ratio="32" sizes="(max-width: 960px) 100vw, 55vw" src={featured.image} />
            </div>
            <div className="feature-copy">
              <DoUzupelnienia as="div">
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>Na zamówienie, [rok]</span>
                <h2 className="h2 h2-md" style={{ fontSize: 'clamp(32px, 3.2vw, 46px)' }}>[Nazwa wyróżnionej realizacji]</h2>
                <dl className="dl-stack">
                  <div><dt>Zadanie</dt><dd>[Dla kogo i z jaką prośbą przyszedł klient, 1–2 zdania]</dd></div>
                  <div><dt>Co zrobiliśmy</dt><dd>[Kamień, oprawa, technika, na co zwróciliśmy uwagę]</dd></div>
                  <div><dt>Czas</dt><dd>[np. 5 tygodni od pierwszej rozmowy]</dd></div>
                </dl>
              </DoUzupelnienia>
              <Link className="btn" href="/kontakt?temat=nowy" style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>
                Chcę podobny pierścionek
              </Link>
            </div>
          </article>
        </section>
      ) : null}

      <WorksBrowser works={works} />

      <GoogleReviews title="Opinie klientów" />

      <section className="dark">
        <div className="wrap" style={{ paddingTop: 80, paddingBottom: 80, display: 'flex', flexWrap: 'wrap', gap: '24px 64px', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="h2 h2-md" style={{ flex: '1 1 480px', fontSize: 'clamp(32px, 3.4vw, 48px)' }}>
            Twoja biżuteria może być następna na tej stronie
          </h2>
          <div className="row gap-14-28">
            <Link className="btn btn-light" href="/kontakt">Umów wizytę</Link>
            <Link className="tl tl-light" href="/na-zamowienie">Jak pracujemy na zamówienie</Link>
          </div>
        </div>
      </section>
    </>
  )
}
