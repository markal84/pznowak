import type { Metadata } from 'next'
import Link from 'next/link'
import { getGallery } from '@/lib/collection'
import Photo from '@/components/site/Photo'
import WorksBrowser, { type Work } from '@/components/site/WorksBrowser'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Realizacje, przed i po, opinie' }

export default async function WorksPage() {
  const gallery = await getGallery()
  const [featured, ...rest] = gallery
  const works: Work[] = rest.map((g, i) => ({
    id: g.id,
    kind: 'zamowienie',
    kindLabel: 'Na zamówienie',
    title: `Realizacja ${i + 1}`,
    text: '[Krótko: dla kogo i co było zadaniem]',
    image: g.image,
    alt: `Realizacja pracowni ${i + 1}`,
  }))

  return (
    <>
      <section className="wrap" style={{ paddingTop: 64, paddingBottom: 48, display: 'flex', flexWrap: 'wrap', gap: '24px 72px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h1 className="h1" style={{ flex: '1 1 460px' }}>Realizacje</h1>
        <p className="lead" style={{ flex: '1 1 380px', maxWidth: '32em' }}>
          Biżuteria zrobiona dla konkretnych osób i rzeczy, które wróciły do życia po naprawie. Przy każdej piszemy
          krótko, co było zadaniem.
        </p>
      </section>

      {featured ? (
        <section className="wrap" style={{ paddingBottom: 96 }}>
          <article className="feature">
            <div className="stack" style={{ flex: '1 1 560px', minWidth: 0, gap: 4 }}>
              <Photo alt="Wyróżniona realizacja pracowni" priority ratio="32" sizes="(max-width: 960px) 100vw, 55vw" src={featured.image} />
            </div>
            <div className="feature-copy">
              <span style={{ fontSize: 14, color: 'var(--muted)' }}>Na zamówienie, [rok]</span>
              <h2 className="h2 h2-md" style={{ fontSize: 'clamp(32px, 3.2vw, 46px)' }}>[Nazwa wyróżnionej realizacji]</h2>
              <dl className="dl-stack">
                <div><dt>Zadanie</dt><dd>[Dla kogo i z jaką prośbą przyszedł klient, 1–2 zdania]</dd></div>
                <div><dt>Co zrobiliśmy</dt><dd>[Kamień, oprawa, technika, na co zwróciliśmy uwagę]</dd></div>
                <div><dt>Czas</dt><dd>[np. 5 tygodni od pierwszej rozmowy]</dd></div>
              </dl>
              <Link className="btn" href="/kontakt?temat=nowy" style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>
                Chcę podobny pierścionek
              </Link>
            </div>
          </article>
        </section>
      ) : null}

      <WorksBrowser works={works} />

      <section className="band">
        <div className="wrap sec-tight stack" style={{ gap: 36 }}>
          <div className="row" style={{ gap: '20px 64px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <h2 className="h2" style={{ flex: '1 1 420px' }}>Przed i po naprawie</h2>
            <p className="text" style={{ flex: '1 1 340px', maxWidth: '30em', fontSize: 16 }}>
              Ten sam kadr przed przyjęciem i po odbiorze. Wystarczy zdjęcie telefonem na tym samym tle.
            </p>
          </div>
          <div className="cols-auto cols-300" style={{ gap: 32, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {['[np. Pierścionek po babci: nowe łapki, zmiana rozmiaru, polerowanie]', '[np. Dwie stare obrączki przetopione na nowy pierścionek]'].map((cap) => (
              <figure className="stack" key={cap} style={{ gap: 12 }}>
                <div className="before-after">
                  <div aria-label="Miejsce na zdjęcie przed" className="ba-cell" role="img">[przed]</div>
                  <div aria-label="Miejsce na zdjęcie po" className="ba-cell after" role="img">[po]</div>
                </div>
                <figcaption style={{ fontSize: 15, lineHeight: 1.5 }}>{cap}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap stack" style={{ paddingTop: 104, paddingBottom: 120, gap: 40 }}>
        <div className="row" style={{ gap: '16px 48px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <h2 className="h2">Opinie klientów</h2>
          <span className="small">[Link do opinii w Google: do uzupełnienia]</span>
        </div>
        <ul className="cols-auto cols-300" style={{ listStyle: 'none', gap: 28, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {['[Prawdziwa opinia klienta z Google, skrócona do 2–3 zdań]', '[Opinia o naprawie lub przeróbce]', '[Opinia o obrączkach lub pierścionku zaręczynowym]'].map((q) => (
            <li className="quote" key={q}>
              <p>{q}</p>
              <span>[Imię, miesiąc i rok]</span>
            </li>
          ))}
        </ul>
      </section>

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
