import type { Metadata } from 'next'
import Link from 'next/link'
import { getProducts } from '@/lib/collection'
import { getGoogleReviews } from '@/lib/google-reviews-source'
import { toCatalogRing } from '@/lib/catalog'
import { HERO_VITRINE, heroRing as pickHero, pickHomeRings } from '@/lib/home'
import { showPlaceholders } from '@/lib/placeholders'
import { pageMetadata } from '@/lib/seo'
import { CUSTOM_ORDER_LINK, FAMILY, HERO_TRUST, RING_CREATOR_ENABLED, SITE, openingHoursText } from '@/lib/site'
import { jewelryStoreJsonLd } from '@/lib/structured-data'
import DoUzupelnienia from '@/components/site/DoUzupelnienia'
import Faq, { type FaqItem } from '@/components/site/Faq'
import GoogleReviews from '@/components/site/GoogleReviews'
import HeroVitrine, { type VitrineSlide } from '@/components/site/HeroVitrine'
import Icon, { type IconName } from '@/components/site/Icon'
import JsonLd from '@/components/site/JsonLd'
import Photo from '@/components/site/Photo'
import RingCard from '@/components/site/RingCard'
import SectionIntro from '@/components/site/SectionIntro'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = pageMetadata({
  title: 'Złotnik w Busku-Zdroju – pracownia rodzinna od 1920',
  description: `Pracownia złotnicza przy ${SITE.street} w Busku-Zdroju. Pierścionki z kamieniami szlachetnymi, obrączki, naprawy biżuterii. ${openingHoursText()}.`,
  path: '/',
})

/** Odpowiedzi z miejscami „do uzupełnienia” budowane przy renderowaniu (środowisko wybiera wersję: src/lib/placeholders.ts). */
const faq = (): FaqItem[] => [
  { q: 'Czy muszę mieć gotowy projekt?', a: 'Nie. Wystarczy zdjęcie, okazja albo styl, który lubisz. Kierunek ustalimy razem przy pierwszej rozmowie.' },
  {
    q: 'Ile kosztuje pierścionek na zamówienie?',
    a: (
      <>
        Cena zależy od kamieni i złota. Powiedz, jaki budżet planujesz, a dopasujemy do niego projekt. Wycenę dostajesz przed rozpoczęciem pracy.
      </>
    ),
  },
  { q: 'Jak dobrać rozmiar, jeśli to niespodzianka?', a: 'Przynieś pierścionek, który ta osoba nosi na tym samym palcu, albo odrysuj jego wnętrze na kartce. Rozmiar można też poprawić po zaręczynach.' },
  { q: 'Czy mogę użyć własnego kamienia lub złota?', a: 'Tak. Obejrzymy kamień i biżuterię w pracowni i powiemy, co da się z nich zrobić.' },
  { q: 'Na kiedy będzie gotowy?', a: 'Termin ustalamy razem z projektem. Jeśli pierścionek ma być gotowy na konkretną datę, napisz ją w pierwszej wiadomości.' },
]

export default async function HomePage() {
  const [products, reviews] = await Promise.all([getProducts(), getGoogleReviews()])
  const count = products.length
  const hero = pickHero(products)
  const heroRing = hero ? toCatalogRing(hero) : null
  // Witryna w hero: pierścionki z listy HERO_VITRINE, które są w katalogu; bez żadnego z nich – pierścionek z hero i jego zdjęcie.
  const vitrine: VitrineSlide[] = HERO_VITRINE.flatMap((v) => {
    const p = products.find((x) => x.name === v.name)
    if (!p) return []
    const r = toCatalogRing(p)
    return [{ slug: p.slug, name: p.name, sub: [v.stone ?? r.stone, r.metal.toLowerCase()].filter(Boolean).join(', '), alt: r.alt, src: v.src, pos: v.pos, posMobile: v.posMobile }]
  })
  if (vitrine.length === 0 && hero && heroRing) {
    vitrine.push({
      slug: hero.slug,
      name: hero.name,
      sub: [heroRing.stone, heroRing.metal.toLowerCase()].filter(Boolean).join(', '),
      alt: heroRing.alt,
      src: hero.images[0] ?? hero.imagePath,
      pos: '55% 50%',
      posMobile: '62% 48%',
    })
  }
  // Pierścionki z witryny nie powtarzają się w „Wybranych pierścionkach”.
  const inVitrine = new Set(vitrine.map((v) => v.slug))
  const featured = pickHomeRings(
    products.filter((p) => !inVitrine.has(p.slug)),
    hero,
  ).map(toCatalogRing)
  const trust = HERO_TRUST.filter((t) => t.confirmed || showPlaceholders())
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
      text: 'Zmiana rozmiaru, lutowanie, nowe łapki albo nowy pierścionek z rodzinnego złota.',
      href: '/naprawy',
      link: 'Naprawy i przeróbki',
    },
  ]

  return (
    <>
      <JsonLd data={jewelryStoreJsonLd()} />
      {/* Hero: na komputerze tekst po lewej, zdjęcie na całą wysokość do prawej krawędzi ekranu; na telefonie zdjęcie nad tytułem. */}
      {/* Hero: na komputerze tekst po lewej, witryna pod lupą na całą wysokość do prawej krawędzi ekranu; na telefonie witryna nad tytułem. */}
      <section className={`hero-home${vitrine.length > 0 ? '' : ' hero-home-solo'}`}>
        <div className="hero-copy">
          <div className="hero-main">
            <h1 className="h1-hero">
              <span className="hl">Rzemiosło, które docenisz.</span>{' '}
              <em className="hl">Biżuteria, którą pokochasz.</em>
            </h1>
            <span aria-hidden="true" className="hero-rule" />
            <p className="lead">
              {/* Twarde spacje po „i” i „w”: jednoliterowe słowa nie zostają na końcu linii. */}
              Projektujemy i{'\u00a0'}wykonujemy biżuterię na zamówienie w{'\u00a0'}rodzinnej pracowni w{'\u00a0'}Busku-Zdroju.
            </p>
            {/* Główne wezwanie: przeglądanie pierścionków; rozmowa o projekcie jako drugi krok. */}
            <div className="hero-cta">
              <Link className="btn btn-browse" href="/pierscionki">
                Zobacz pierścionki z pracowni
                <span aria-hidden="true" className="btn-arrow">
                  →
                </span>
              </Link>
              <Link className="tl hero-ask" href="/kontakt">
                Zapytaj o pierścionek
              </Link>
            </div>
          </div>
          {trust.length > 0 ? (
            <ul className="hero-trust">
              {trust.map((t) => (
                <li key={t.text}>{t.confirmed ? t.text : <DoUzupelnienia>{t.text}</DoUzupelnienia>}</li>
              ))}
            </ul>
          ) : null}
        </div>
        {vitrine.length > 0 ? <HeroVitrine slides={vitrine} /> : null}
      </section>

      {featured.length > 0 ? (
        <section className="wrap stack" style={{ gap: 44 }}>
          <SectionIntro intro="Każdy projekt to punkt wyjścia do Twojej wersji." title="Wybrane pierścionki" />
          <ul className="ring-grid ring-grid-4" data-reveal="">
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

      <section className="dark">
        <div className="wrap sec" style={{ display: 'flex', flexWrap: 'wrap', gap: '56px 80px', alignItems: 'stretch' }}>
          <div className="stack" style={{ flex: '1 1 520px', minWidth: 0, gap: 44 }}>
            <SectionIntro
              intro={
                <>
                  Cenę i wygląd znasz, zanim zaczniemy.
                   Od rozmowy do odbioru mija zwykle 4–6 tygodni.
                </>
              }
              title="Jak powstaje pierścionek na zamówienie"
            />
            <ol className="steps">
              <li className="step"><span className="n">1</span><h3>Rozmowa</h3><p>W pracowni albo przez telefon. Mówisz, dla kogo jest pierścionek, na jaką okazję i jaki masz budżet.</p></li>
              <li className="step"><span className="n">2</span><h3>Projekt i wycena</h3><p>Dobieramy kamień, kolor złota i proporcje, aż projekt będzie gotowy do wykonania.</p></li>
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

      <GoogleReviews config={reviews} />

      <section className="band">
        <div className="wrap sec-tight pracownia">
          <figure className="pracownia-fig stack" style={{ gap: 12 }}>
            <Photo alt={FAMILY[2].alt} position={FAMILY[2].pos} ratio="32" sizes="(max-width: 960px) 100vw, 50vw" src={FAMILY[2].img} />
            <figcaption className="fig-cap">Mieczysław Nowak w pracowni, lata 80.</figcaption>
          </figure>
          <div className="stack pracownia-copy" style={{ gap: 28 }}>
            <SectionIntro
              intro="Od 1920 roku fach przechodzi w rodzinie Nowaków z ojca na syna: od kowala z Szańca, przez Stanisława i Mieczysława, po Michała. Pierścionki, które Mieczysław projektował w latach 80., do dziś wracają do nas na renowację. Z tą samą uwagą zajmiemy się pierścionkiem po babci."
              title="Pracownia od 1920"
            />
            <div className="row gap-14-28">
              <Link className="btn btn-line" href="/pracownia">Poznaj historię pracowni</Link>
              <Link className="tl" href="/naprawy">Naprawy i przeróbki</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="ruled">
        <div className="wrap" style={{ paddingTop: 104, paddingBottom: 120, display: 'flex', flexWrap: 'wrap', gap: '64px 96px' }}>
          <div className="stack" style={{ flex: '1 1 520px', minWidth: 0, gap: 32 }}>
            <h2 className="h2">Zanim przyjdziesz</h2>
            <Faq items={faq()} />
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
              Na miejscu jest też sklep z gotową biżuterią złotą i srebrną.
            </p>
          </aside>
        </div>
      </section>
    </>
  )
}
