import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { byEnv } from '@/lib/placeholders'
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
  { name: 'Zmiana rozmiaru pierścionka', text: 'Zmniejszenie lub powiększenie, z polerowaniem miejsca łączenia.', time: '[czas]', price: 'od [cena] zł', icon: 'rozmiar' },
  { name: 'Czyszczenie i polerowanie', text: 'Połysk, mniej rys, czyste kamienie.', time: '[czas]', price: '[cena] zł', icon: 'czyszczenie' },
  { name: 'Przegląd oprawy', text: 'Dociskamy kamień, zanim wypadnie.', time: '[czas]', price: '[cena] zł', icon: 'lupa' },
  { name: 'Nowe łapki lub oprawa', text: 'Dolutowujemy łapki albo robimy nową koronę.', time: '[czas]', price: '[cena] zł', icon: 'oprawa' },
  { name: 'Wymiana lub dosadzenie kamienia', text: 'Dobieramy kamień do oprawy i osadzamy ręcznie.', time: '[czas]', price: '[cena] zł', icon: 'kamien' },
  { name: 'Naprawa łańcuszka lub bransoletki', text: 'Lutowanie ogniw, zapięcie, skrócenie.', time: '[czas]', price: '[cena] zł', icon: 'lancuszek' },
  { name: 'Grawer', text: 'Daty, inicjały, krótkie napisy w obrączce.', time: '[czas]', price: '[cena] zł', icon: 'grawer' },
  { name: 'Renowacja biżuterii z historią', text: 'Naprawa z zachowaniem charakteru starej biżuterii.', time: 'indywidualnie', price: 'po wycenie', icon: 'renowacja' },
]

/** Czas i cena z nawiasem to placeholder: na produkcji w jego miejsce wchodzi `fallback`. */
const unlessTodo = (value: string, fallback: string) =>
  value.includes('[') ? <DoUzupelnienia fallback={fallback}>{value}</DoUzupelnienia> : value

const BEFORE_AFTER = {
  diamonds: {
    src: '/zdjecia/naprawy/brylanty.webp',
    alt: 'Pierścionek z dużym brylantem i mniejszymi kamieniami, trzy ujęcia w palcach złotnika',
    aspect: '1489 / 640',
    caption: 'Pierścionek z brylantami po prostowaniu i odnowieniu',
  },
  grandfather: {
    src: '/zdjecia/naprawy/renowacja-dziadka.webp',
    alt: 'Złoty pierścionek z kwiatowym ornamentem i pustą oprawą, dwa ujęcia z renowacji',
    aspect: '1974 / 1080',
    caption: 'Pierścionek zrobiony przez dziadka Stanisława w latach 70., po renowacji',
  },
  resize: {
    src: '/zdjecia/naprawy/powiekszanie-rozmiaru.webp',
    alt: 'Rozcięta obrączka pierścionka z ciemnym kamieniem na dłoni złotnika',
    caption: 'Powiększenie pierścionka z tanzanitem przez wstawienie szyny',
  },
}

export default function RepairsPage() {
  const wiktor = FAMILY[0]
  return (
    <>
      <section className="wrap hero" style={{ paddingBottom: 88, gap: '48px 80px' }}>
        <div className="hero-copy" style={{ flex: '1 1 460px', gap: 28 }}>
          <h1 className="h1">Naprawy i przeróbki</h1>
          <p className="lead" style={{ maxWidth: '32em' }}>
            Przynieś biżuterię w godzinach otwarcia. Obejrzymy ją przy Tobie i powiemy, co zrobić, za ile i na kiedy.
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
          <div className="row gap-14-28">
            <Link className="btn" href="/kontakt?temat=naprawa">Zapytaj o naprawę</Link>
          </div>
        </div>
        <figure className="hero-fig stack" style={{ flex: '1 1 520px', gap: 12 }}>
          <Photo
            alt="Ten sam pierścionek w dwóch ujęciach: po lewej pusta oprawa, po prawej osadzony rubin"
            aspect="1584 / 1008"
            priority
            ratio="none"
            sizes="(max-width: 960px) 100vw, 50vw"
            src="/zdjecia/naprawy/rubin-przed-po.webp"
          />
          <figcaption className="fig-cap">Drugie życie pierścionka z lat 70.: odnowienie, nowa oprawa i osadzony kamień</figcaption>
        </figure>
      </section>

      <section className="wrap stack" style={{ paddingTop: 24, paddingBottom: 104, gap: 40 }}>
        <SectionIntro
          intro={byEnv('Ceny są orientacyjne.', undefined)}
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

      <section className="wrap stack" style={{ paddingTop: 0, paddingBottom: 104, gap: 40 }}>
        <SectionIntro title="Przed i po" />
        <div className="repairs-gallery">
          <div className="stack" style={{ gap: 32 }}>
            {[BEFORE_AFTER.diamonds, BEFORE_AFTER.grandfather].map((p) => (
              <figure className="stack" key={p.src} style={{ gap: 12 }}>
                <Photo alt={p.alt} aspect={p.aspect} ratio="none" sizes="(max-width: 960px) 100vw, 60vw" src={p.src} />
                <figcaption className="fig-cap">{p.caption}</figcaption>
              </figure>
            ))}
          </div>
          <figure className="stack" style={{ gap: 12 }}>
            <Photo
              alt={BEFORE_AFTER.resize.alt}
              className="ph-fill"
              position="50% 55%"
              ratio="none"
              sizes="(max-width: 960px) 100vw, 40vw"
              src={BEFORE_AFTER.resize.src}
            />
            <figcaption className="fig-cap">{BEFORE_AFTER.resize.caption}</figcaption>
          </figure>
        </div>
      </section>

      <section className="band">
        <div className="wrap sec-tight stack" style={{ gap: 40 }}>
          <h2 className="h2">Jak przyjmujemy naprawę</h2>
          <ol className="steps steps-light" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px 48px' }}>
            <li className="step"><span className="n">1</span><h3>Oglądamy przy Tobie</h3><p>Pod lupą sprawdzamy oprawę i złoto. Mówimy wprost, co warto naprawić.</p></li>
            <li className="step"><span className="n">2</span><h3>Ustalamy cenę i termin</h3><p>Znasz je, zanim zaczniemy pracę.</p></li>
            <li className="step"><span className="n">3</span><h3>Dzwonimy, gdy jest gotowe</h3><p>Odbierasz w pracowni. Gdy wyjdzie coś nowego, najpierw pytamy.</p></li>
          </ol>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 88 }}>
        <div className="dark" style={{ display: 'flex', flexWrap: 'wrap', gap: '28px 64px', alignItems: 'center', padding: 48 }}>
          <div className="stack" style={{ flex: '2 1 480px', minWidth: 0, gap: 14 }}>
            <h2 className="h2 h2-md">Jesteś w Busku na turnusie?</h2>
            <p className="text" style={{ maxWidth: '36em', fontSize: 16.5 }}>
              Przynieś biżuterię na początku pobytu. Od razu powiemy, czy zdążymy przed wyjazdem.
            </p>
          </div>
          <dl className="hours" style={{ flex: '1 1 260px', gap: '6px 18px' }}>
            <dt style={{ color: 'var(--on-velvet-3)' }}>Adres</dt>
            <dd>{SITE.street}</dd>
            <dt style={{ color: 'var(--on-velvet-3)' }}>Dojście</dt>
            <dd>ok. 20 minut pieszo od Parku Zdrojowego</dd>
          </dl>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 104, paddingBottom: 120, display: 'flex', flexWrap: 'wrap', gap: '48px 80px', alignItems: 'center' }}>
        <figure className="stack" style={{ flex: '1 1 460px', minWidth: 0, gap: 12 }}>
          <Photo alt={wiktor.alt} position="50% 25%" sizes="(max-width: 960px) 100vw, 45vw" src={wiktor.img} />
          <figcaption className="fig-cap">Wiktor Nowak z rodziną, początek historii pracowni.</figcaption>
        </figure>
        <div className="stack" style={{ flex: '1 1 420px', minWidth: 0, gap: 22 }}>
          <h2 className="h2">Nowy pierścionek z rodzinnego złota</h2>
          <p className="text">Obrączki po dziadkach, pojedynczy kolczyk, nienoszony pierścionek. Możemy przetopić złoto i odzyskać kamienie. Zaczynamy od sprawdzenia próby i stanu kamieni.</p>
          <div className="row gap-14-28">
            <Link className="btn" href="/kontakt?temat=naprawa">Umów rozmowę o przeróbce</Link>
            <Link className="tl" href="/realizacje">Zobacz realizacje</Link>
          </div>
        </div>
      </section>
    </>
  )
}
