import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { getProducts } from '@/lib/collection'
import { byEnv, showPlaceholders } from '@/lib/placeholders'
import { SITE, FAMILY } from '@/lib/site'
import DoUzupelnienia from '@/components/site/DoUzupelnienia'
import Icon, { type IconName } from '@/components/site/Icon'
import Photo from '@/components/site/Photo'
import SectionIntro from '@/components/site/SectionIntro'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = pageMetadata({
  title: 'Naprawa biżuterii i zmiana rozmiaru pierścionka',
  description: 'Zmiana rozmiaru, czyszczenie, nowe łapki, wymiana kamienia, łańcuszki, grawer. Wycena przy Tobie, Kilińskiego 12, Busko-Zdrój.',
  path: '/naprawy',
})

const SERVICES: { name: string; text: string; time: string; price: string; icon: IconName }[] = [
  { name: 'Zmiana rozmiaru pierścionka', text: 'Zmniejszenie lub powiększenie obrączki, z wyrównaniem i polerowaniem miejsca łączenia.', time: '[czas]', price: 'od [cena] zł', icon: 'rozmiar' },
  { name: 'Czyszczenie i polerowanie', text: 'Przywracamy połysk, usuwamy drobne rysy i doczyszczamy kamienie.', time: '[czas]', price: '[cena] zł', icon: 'czyszczenie' },
  { name: 'Przegląd oprawy', text: 'Sprawdzamy łapki i oprawę. Dociskamy kamień, zanim zdąży wypaść.', time: '[czas]', price: '[cena] zł', icon: 'lupa' },
  { name: 'Nowe łapki lub oprawa', text: 'Dolutowujemy zużyte łapki albo wykonujemy nową koronę dla kamienia.', time: '[czas]', price: '[cena] zł', icon: 'oprawa' },
  { name: 'Wymiana lub dosadzenie kamienia', text: 'Dobieramy kamień do istniejącej oprawy i osadzamy go ręcznie.', time: '[czas]', price: '[cena] zł', icon: 'kamien' },
  { name: 'Naprawa łańcuszka lub bransoletki', text: 'Lutowanie ogniw, wymiana zapięcia, skrócenie.', time: '[czas]', price: '[cena] zł', icon: 'lancuszek' },
  { name: 'Grawer', text: 'Daty, inicjały i krótkie napisy po wewnętrznej stronie obrączki.', time: '[czas]', price: '[cena] zł', icon: 'grawer' },
  { name: 'Renowacja biżuterii z historią', text: 'Ostrożna naprawa starych wyrobów, z zachowaniem ich charakteru i śladów czasu.', time: 'indywidualnie', price: 'po wycenie', icon: 'renowacja' },
]

/** Czas i cena z nawiasem to placeholder: na produkcji w jego miejsce wchodzi `fallback`. */
const unlessTodo = (value: string, fallback: string) =>
  value.includes('[') ? <DoUzupelnienia fallback={fallback}>{value}</DoUzupelnienia> : value

export default async function RepairsPage() {
  const products = await getProducts()
  const hero = products.find((p) => p.name === 'Phoebe') ?? products[0]
  const wiktor = FAMILY[0]
  return (
    <>
      <section className="wrap hero" style={{ paddingBottom: 88, gap: '48px 80px' }}>
        <div className="hero-copy" style={{ flex: '1 1 460px', gap: 28 }}>
          <h1 className="h1">Naprawy i przeróbki</h1>
          <p className="lead" style={{ maxWidth: '32em' }}>
            Biżuterię do naprawy przynieś w godzinach otwarcia. Obejrzymy ją przy Tobie i powiemy, co trzeba zrobić, ile to kosztuje i kiedy będzie gotowe.
          </p>
          <dl className="hours" style={{ fontSize: 16 }}>
            {SITE.hours.map((h) => (
              <div key={h.days} style={{ display: 'contents' }}>
                <dt>{h.days}</dt>
                <dd>{h.time}</dd>
              </div>
            ))}
            <dt>Adres</dt>
            <dd>{SITE.street}, Busko-Zdrój</dd>
          </dl>
        </div>
        {hero ? (
          <figure className="hero-fig" style={{ flex: '1 1 520px' }}>
            <Photo
              alt={`Pierścionek ${hero.name} z kolekcji pracowni`}
              priority
              ratio="54"
              sizes="(max-width: 960px) 100vw, 50vw"
              src={hero.images[3] ?? hero.images[0] ?? hero.imagePath}
            />
            <div style={{ position: 'absolute', right: 24, bottom: 24 }}>
              <div className="tag tag-md">
                <span aria-hidden="true" className="hole" />
                <span className="sub">Najczęstsze naprawy</span>
                <span className="nm" style={{ fontSize: 21 }}>Rozmiar, czyszczenie, oprawa</span>
              </div>
            </div>
          </figure>
        ) : null}
      </section>

      <section className="wrap stack" style={{ paddingTop: 24, paddingBottom: 104, gap: 40 }}>
        <SectionIntro
          intro={byEnv(
            'Ceny są orientacyjne. Dokładną kwotę podajemy po obejrzeniu biżuterii, zanim zaczniemy pracę.',
            'Cenę i termin podajemy po obejrzeniu biżuterii, zanim zaczniemy pracę.',
          )}
          title={byEnv('Co robimy i ile to trwa', 'Co robimy')}
        />
        <ul data-reveal="" style={{ listStyle: 'none', borderTop: '1px solid var(--graphite)' }}>
          {SERVICES.map((s) => (
            <li className="service ic-host" key={s.name}>
              <Icon name={s.icon} size={44} />
              <h3>{s.name}</h3>
              <p>{s.text}</p>
              <dl>
                <dt>Czas</dt>
                <dd>{unlessTodo(s.time, 'po obejrzeniu')}</dd>
                <dt>Cena</dt>
                <dd className="p">{unlessTodo(s.price, 'po wycenie')}</dd>
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <section className="band">
        <div className="wrap sec-tight stack" style={{ gap: 40 }}>
          <h2 className="h2">Jak przyjmujemy naprawę</h2>
          <ol className="steps steps-light" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px 48px' }}>
            <li className="step"><span className="n">1</span><h3>Oglądamy przy Tobie</h3><p>Pod lupą sprawdzamy oprawę, łapki i stan złota. Mówimy wprost, co warto naprawić, a czego nie.</p></li>
            <li className="step"><span className="n">2</span><h3>Ustalamy cenę i termin</h3><p>Przed rozpoczęciem pracy wiesz, co zrobimy, ile to kosztuje i kiedy będzie gotowe.</p></li>
            <li className="step"><span className="n">3</span><h3>Dzwonimy, gdy jest gotowe</h3><p>Odbierasz w pracowni. Jeśli w trakcie wyjdzie coś nowego, najpierw zadzwonimy i zapytamy.</p></li>
          </ol>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 88 }}>
        <div className="dark" style={{ display: 'flex', flexWrap: 'wrap', gap: '28px 64px', alignItems: 'center', padding: 48 }}>
          <div className="stack" style={{ flex: '2 1 480px', minWidth: 0, gap: 14 }}>
            <h2 className="h2 h2-md">Jesteś w Busku na turnusie?</h2>
            <p className="text" style={{ maxWidth: '36em', fontSize: 16.5 }}>
              Przynieś biżuterię na początku pobytu, a odbierzesz ją przed wyjazdem. Przy przyjęciu powiemy, czy zdążymy przed Twoim powrotem do domu.
            </p>
          </div>
          <dl className="hours" style={{ flex: '1 1 260px', gap: '6px 18px' }}>
            <dt style={{ color: 'var(--on-velvet-3)' }}>Adres</dt>
            <dd>{SITE.street}</dd>
            {showPlaceholders() ? (
              <>
                <dt style={{ color: 'var(--on-velvet-3)' }}>Dojście</dt>
                <dd>
                  <DoUzupelnienia>[ok. X minut pieszo od Parku Zdrojowego]</DoUzupelnienia>
                </dd>
              </>
            ) : null}
            <dt style={{ color: 'var(--on-velvet-3)' }}>Godziny</dt>
            <dd>Pon.–pt. 8–16, sob. 10–16</dd>
          </dl>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 104, paddingBottom: 120, display: 'flex', flexWrap: 'wrap', gap: '48px 80px', alignItems: 'center' }}>
        <figure className="stack" style={{ flex: '1 1 460px', minWidth: 0, gap: 12 }}>
          <Photo alt={wiktor.alt} position="50% 25%" sizes="(max-width: 960px) 100vw, 45vw" src={wiktor.img} />
          <figcaption className="fig-cap">Wiktor Nowak z rodziną. Od niego zaczęła się historia pracowni.</figcaption>
        </figure>
        <div className="stack" style={{ flex: '1 1 420px', minWidth: 0, gap: 22 }}>
          <h2 className="h2">Nowy pierścionek z rodzinnego złota</h2>
          <p className="text">Obrączki po dziadkach, pojedynczy kolczyk, pierścionek, którego nikt nie nosi. Możemy przetopić złoto, odzyskać kamienie i zrobić z nich coś, co znów będzie noszone.</p>
          <p className="text">Najpierw sprawdzamy próbę złota i stan kamieni. Potem rozmawiamy o projekcie, tak jak przy każdym zamówieniu.</p>
          <div className="row gap-14-28">
            <Link className="btn" href="/kontakt?temat=naprawa">Umów rozmowę o przeróbce</Link>
            <Link className="tl" href="/realizacje">Zobacz realizacje</Link>
          </div>
        </div>
      </section>
    </>
  )
}
