import type { Metadata } from 'next'
import Link from 'next/link'
import { getProducts } from '@/lib/collection'
import { pickByName, pluralRing, toCatalogRing } from '@/lib/catalog'
import { pageMetadata } from '@/lib/seo'
import { CUSTOM_ORDER_LINK, FAMILY, RING_CREATOR_ENABLED, SITE } from '@/lib/site'
import { jewelryStoreJsonLd } from '@/lib/structured-data'
import Faq from '@/components/site/Faq'
import Icon, { type IconName } from '@/components/site/Icon'
import JsonLd from '@/components/site/JsonLd'
import Photo from '@/components/site/Photo'
import RingCard from '@/components/site/RingCard'
import SectionIntro from '@/components/site/SectionIntro'
import Tag from '@/components/site/Tag'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = pageMetadata({
  title: 'Złotnik w Busku-Zdroju – pracownia rodzinna od 1890',
  description:
    'Pracownia złotnicza przy Kilińskiego 12 w Busku-Zdroju. Pierścionki z kamieniami szlachetnymi, obrączki, naprawy biżuterii. Pon.–pt. 8–16, sob. 10–16.',
  path: '/',
})

const HOME_RINGS = ['Phoebe', 'Harmonia', 'Athena', 'Nyx', 'Pyrrha', 'Cyane', 'Eirene', 'Daphne']

const FAQ = [
  { q: 'Czy muszę mieć gotowy projekt?', a: 'Nie. Wystarczy zdjęcie, okazja albo styl, który lubisz. Kierunek ustalimy razem przy pierwszej rozmowie.' },
  { q: 'Ile kosztuje pierścionek na zamówienie?', a: 'Pierścionki z kolekcji kosztują od [X] zł, a projekty na zamówienie zwykle [X–Y] zł. Cena zależy od kamieni i złota. Powiedz, jaki budżet planujesz, a dopasujemy do niego projekt. Wycenę dostajesz przed rozpoczęciem pracy.' },
  { q: 'Jak dobrać rozmiar, jeśli to niespodzianka?', a: 'Przynieś pierścionek, który ta osoba nosi na tym samym palcu, albo odrysuj jego wnętrze na kartce. Rozmiar można też poprawić po zaręczynach.' },
  { q: 'Czy mogę użyć własnego kamienia lub złota?', a: 'Tak. Obejrzymy kamień i biżuterię w pracowni i powiemy, co da się z nich zrobić.' },
  { q: 'Na kiedy będzie gotowy?', a: 'Termin ustalamy razem z projektem. Jeśli pierścionek ma być gotowy na konkretną datę, napisz ją w pierwszej wiadomości.' },
]

export default async function HomePage() {
  const products = await getProducts()
  const count = products.length
  const hero = products.find((p) => p.name === 'Phoebe') ?? products[0]
  const featured = pickByName(products, HOME_RINGS, 8).map(toCatalogRing)
  const heroRing = hero ? toCatalogRing(hero) : null
  // Ceny i dłuższe opisy są na podstronach; tu kafelek prowadzi dalej.
  const offers: { icon: IconName; title: string; text: string; href: string; link: string }[] = [
    {
      icon: 'szkic',
      title: 'Z pomysłem na nowy pierścionek',
      text: 'Wystarczy inspiracja, zdjęcie albo historia osoby, dla której ma powstać.',
      ...(RING_CREATOR_ENABLED
        ? { href: '/kreator', link: 'Zaprojektuj wstępnie online' }
        : { href: CUSTOM_ORDER_LINK.href, link: CUSTOM_ORDER_LINK.label }),
    },
    {
      icon: 'pierscionek',
      title: 'Po projekt z naszej kolekcji',
      text: `${count > 0 ? `Każdy z ${count} pierścionków` : 'Każdy pierścionek'} wykonamy w Twoim rozmiarze, z innym kamieniem albo złotem.`,
      href: '/pierscionki',
      link: 'Przeglądaj pierścionki',
    },
    {
      icon: 'obraczki',
      title: 'Po obrączki ślubne',
      text: 'Z naszych wzorów albo zaprojektowane dla Was dwojga, z grawerem w środku.',
      href: '/obraczki',
      link: 'Obrączki ślubne',
    },
    {
      icon: 'naprawa',
      title: 'Z biżuterią do naprawy',
      text: 'Zmiana rozmiaru, czyszczenie, nowe łapki albo nowy pierścionek z rodzinnego złota.',
      href: '/naprawy',
      link: 'Naprawy i przeróbki',
    },
  ]

  return (
    <>
      <JsonLd data={jewelryStoreJsonLd()} />
      <section className="wrap hero">
        <div className="hero-copy">
          <h1 className="h1 h1-hero">Pierścionek zrobiony dla jednej osoby.</h1>
          <p className="lead">
            Projektujemy i wykonujemy biżuterię na zamówienie w rodzinnej pracowni w Busku-Zdroju. Nowakowie pracują
            w rzemiośle od {SITE.since} roku. Dziś przy stole złotniczym siedzi Michał, czwarte pokolenie.
          </p>
          <div className="row gap-14-28">
            <Link className="btn" href="/kontakt">
              Umów rozmowę o projekcie
            </Link>
            <Link className="tl" href="/pierscionki">
              {count > 0 ? `Zobacz ${count} ${pluralRing(count)} z pracowni` : 'Zobacz pierścionki z pracowni'}
            </Link>
          </div>
        </div>
        {hero && heroRing ? (
          <figure className="hero-fig">
            <Photo
              alt={`Pierścionek ${hero.name}${heroRing.stone ? ': ' + heroRing.stone.toLowerCase() : ''}`}
              className="ph-hero"
              position="55% 50%"
              priority
              ratio="none"
              sizes="(max-width: 960px) 100vw, 56vw"
              src={hero.images[0] ?? hero.imagePath}
            />
            <Link className="hero-tag" href={`/pierscionki/${hero.slug}`}>
              <svg aria-hidden="true" height="70" viewBox="0 0 90 70" width="90">
                <path d="M3 64 C 0 40, 30 22, 88 2" fill="none" stroke="#F3F1EA" strokeOpacity="0.85" strokeWidth="1.2" />
              </svg>
              <Tag className="hang" name={hero.name} size="md" sub={[heroRing.stone, heroRing.metal.toLowerCase()].filter(Boolean).join(', ')} />
            </Link>
          </figure>
        ) : null}
      </section>

      <section className="band">
        <div className="wrap sec-tight stack" style={{ gap: 48 }}>
          <SectionIntro title="Cztery pokolenia przy jednym fachu" />
          <ol className="family-list">
            {FAMILY.map((f) => (
              <li className="family-item" key={f.name}>
                <Photo alt={f.alt} position={f.pos} sizes="(max-width: 720px) 210px, 25vw" src={f.img} />
                <div className="family-meta">
                  <span className="year">{f.year}</span>
                  <span className="family-name">{f.name}</span>
                  <span style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--graphite-2)' }}>{f.short}</span>
                </div>
              </li>
            ))}
          </ol>
          <Link className="tl" href="/pracownia" style={{ alignSelf: 'flex-start' }}>
            Poznaj historię pracowni
          </Link>
        </div>
      </section>

      <section className="wrap sec stack" style={{ gap: 40 }}>
        <SectionIntro title="Z czym możesz do nas przyjść" />
        <ul className="tiles" data-reveal="">
          {offers.map((o) => (
            <li className="tile ic-host" key={o.title}>
              <Icon name={o.icon} size={48} />
              <h3>{o.title}</h3>
              <p>{o.text}</p>
              <Link className="tl" href={o.href}>
                {o.link}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {featured.length > 0 ? (
        <section className="wrap stack" style={{ paddingBottom: 112, gap: 44 }}>
          <SectionIntro intro="Każdy projekt to punkt wyjścia do Twojej wersji." title="Pierścionki z pracowni" />
          <ul className="ring-grid" data-reveal="">
            {featured.map((r) => (
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
          <Link className="btn btn-line" href="/pierscionki" style={{ alignSelf: 'flex-start' }}>
            Wszystkie pierścionki ({count})
          </Link>
        </section>
      ) : null}

      <section className="dark">
        <div className="wrap sec" style={{ display: 'flex', flexWrap: 'wrap', gap: '56px 80px', alignItems: 'stretch' }}>
          <div className="stack" style={{ flex: '1 1 520px', minWidth: 0, gap: 44 }}>
            <SectionIntro
              intro="Cenę i wygląd znasz, zanim zaczniemy. Od rozmowy do odbioru mija zwykle [TERMIN, np. 4–6 tygodni]."
              title="Jak powstaje pierścionek na zamówienie"
            />
            <ol className="steps">
              <li className="step"><span className="n">1</span><h3>Rozmowa</h3><p>W pracowni albo przez telefon. Mówisz, dla kogo jest pierścionek, na jaką okazję i jaki masz budżet.</p></li>
              <li className="step"><span className="n">2</span><h3>Projekt i wycena</h3><p>Szkic i model 3D. Dobieramy kamień, kolor złota i proporcje, aż projekt będzie gotowy do wykonania.</p></li>
              <li className="step"><span className="n">3</span><h3>Wykonanie</h3><p>Pierścionek powstaje w naszej pracowni. Oprawę kamieni, wykończenie i polerowanie robimy ręcznie.</p></li>
              <li className="step"><span className="n">4</span><h3>Odbiór i opieka</h3><p>Przymierzasz i odbierasz. Później zapraszamy na czyszczenie i przegląd oprawy.</p></li>
            </ol>
            <div className="row gap-14-28">
              <Link className="btn btn-light" href="/kontakt">Umów rozmowę o projekcie</Link>
              <Link className="tl tl-light" href="/na-zamowienie">Więcej o pracy na zamówienie</Link>
            </div>
          </div>
          {hero ? (
            <figure style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Photo
                alt={`Pierścionek ${hero.name} z bliska`}
                className="ph-fill"
                ratio="none"
                sizes="(max-width: 960px) 100vw, 40vw"
                src={hero.images[1] ?? hero.images[0] ?? hero.imagePath}
              />
              <figcaption className="fig-cap">{hero.name} z bliska. Oprawa kamieni wykonana ręcznie.</figcaption>
            </figure>
          ) : null}
        </div>
      </section>

      <section className="wrap sec" style={{ display: 'flex', flexWrap: 'wrap', gap: '48px 80px', alignItems: 'center' }}>
        <figure className="stack" style={{ flex: '1 1 520px', minWidth: 0, gap: 12 }}>
          <Photo alt={FAMILY[2].alt} position={FAMILY[2].pos} ratio="32" sizes="(max-width: 960px) 100vw, 50vw" src={FAMILY[2].img} />
          <figcaption className="fig-cap">Mieczysław Nowak w pracowni, lata 80.</figcaption>
        </figure>
        <div className="stack" style={{ flex: '1 1 400px', minWidth: 0, gap: 22 }}>
          <h2 className="h2">Biżuteria z historią wraca do pracowni</h2>
          <p className="text">
            Pierścionki zaprojektowane przez Mieczysława Nowaka w latach 80. do dziś trafiają do nas na renowację. Tak
            samo zajmiemy się pierścionkiem po babci: oczyścimy go, wzmocnimy oprawę, dopasujemy rozmiar albo przerobimy
            złoto na nowy projekt.
          </p>
          <div className="row gap-14-28">
            <Link className="btn btn-line" href="/naprawy">Naprawy i przeróbki</Link>
            <Link className="tl" href="/realizacje">Zobacz realizacje</Link>
          </div>
        </div>
      </section>

      <section className="ruled">
        <div className="wrap" style={{ paddingTop: 104, paddingBottom: 120, display: 'flex', flexWrap: 'wrap', gap: '64px 96px' }}>
          <div className="stack" style={{ flex: '1 1 520px', minWidth: 0, gap: 32 }}>
            <h2 className="h2">Zanim przyjdziesz</h2>
            <Faq items={FAQ} />
          </div>
          <aside className="hint-panel" style={{ flex: '1 1 340px', minWidth: 0, alignSelf: 'flex-start' }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 34, lineHeight: 1.1 }}>Pracownia w Busku-Zdroju</h2>
            <address style={{ fontStyle: 'normal', fontSize: 17, lineHeight: 1.6 }}>
              {SITE.street}
              <br />
              {SITE.city}
            </address>
            <dl className="hours">
              {SITE.hours.map((h) => (
                <div key={h.days} style={{ display: 'contents' }}>
                  <dt>{h.days}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
            </dl>
            <div className="stack" style={{ gap: 8, fontSize: 17 }}>
              <a href={SITE.phoneHref} style={{ textDecoration: 'none', fontWeight: 500 }}>{SITE.phone}</a>
              <a href={`mailto:${SITE.email}`} style={{ textDecoration: 'none' }}>{SITE.email}</a>
            </div>
            <Link className="btn" href="/kontakt" style={{ alignSelf: 'flex-start' }}>Umów wizytę</Link>
            <p className="small">Na rozmowę o projekcie najlepiej umówić się wcześniej. Z naprawą możesz przyjść w godzinach otwarcia.</p>
            <p className="small" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 18, color: 'var(--graphite-2)' }}>
              Na miejscu jest też sklep z gotową biżuterią: kolczyki, wisiorki i inne [asortyment do potwierdzenia].
            </p>
          </aside>
        </div>
      </section>
    </>
  )
}
