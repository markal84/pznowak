import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getProducts } from '@/lib/collection'
import DoUzupelnienia from '@/components/site/DoUzupelnienia'
import Faq, { type FaqItem } from '@/components/site/Faq'
import Icon, { type IconName } from '@/components/site/Icon'
import Photo from '@/components/site/Photo'
import PriceOffer from '@/components/site/PriceOffer'
import SectionIntro from '@/components/site/SectionIntro'
import { byEnv, showPlaceholders } from '@/lib/placeholders'
import { CUSTOM_ORDER_LINK, FAMILY, RING_CREATOR_ENABLED } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = pageMetadata({
  title: 'Pierścionek zaręczynowy na zamówienie',
  description: 'Rozmowa, szkic i model 3D, wycena przed rozpoczęciem pracy. Kamienie oprawiamy ręcznie w Busku-Zdroju.',
  path: '/na-zamowienie',
})

const STEPS = [
  { n: '1', title: 'Rozmowa', text: 'W pracowni albo przez telefon. Opowiadasz o osobie, okazji i stylu. Mówisz, jaki masz budżet i na kiedy potrzebujesz pierścionka.', result: 'Wspólny kierunek i wstępne widełki cenowe', ill: '1-rozmowa' },
  { n: '2', title: 'Projekt', text: 'Rysujemy szkic i przygotowujemy model 3D. Dobieramy kamień, kolor złota i proporcje. Poprawiamy, dopóki nie powiesz, że to jest to.', result: 'Model 3D i wycenę do akceptacji', ill: '3-model-3d' },
  { n: '3', title: 'Wykonanie', text: 'Pierścionek powstaje w naszej pracowni. Kamienie oprawiamy ręcznie, potem szlifujemy i polerujemy każdą powierzchnię.', result: 'Gotowy pierścionek do przymiarki', ill: '5-oprawa' },
  { n: '4', title: 'Odbiór i opieka', text: 'Przymierzasz, a my poprawiamy drobiazgi. Później zapraszamy na czyszczenie i przegląd oprawy.', result: 'Pierścionek i opiekę pracowni na kolejne lata', ill: '6-odbior' },
]

/** Pytanie „Czy rozmowa o projekcie coś kosztuje?” nie ma jeszcze odpowiedzi od pracowni: na produkcji go nie ma. */
const faq = (): FaqItem[] => [
  { q: 'Czy mogę zobaczyć pierścionek przed wykonaniem?', a: 'Tak. Pokazujemy szkic i model 3D. Zmieniamy go, dopóki proporcje nie będą takie, jak chcesz.' },
  ...(showPlaceholders()
    ? [
        {
          q: 'Czy rozmowa o projekcie coś kosztuje?',
          a: <DoUzupelnienia>[Do uzupełnienia przez pracownię: czy pierwsza rozmowa i projekt są bezpłatne, czy wymagana jest zaliczka.]</DoUzupelnienia>,
        },
      ]
    : []),
  {
    q: 'Czy da się pracować zdalnie?',
    a: (
      <>
        Pierwszą rozmowę możemy przeprowadzić przez telefon. Na przymiarkę i odbiór zapraszamy do Buska-Zdroju.
        <DoUzupelnienia> [Do potwierdzenia: rozmowy wideo i wysyłka gotowej biżuterii.]</DoUzupelnienia>
      </>
    ),
  },
  {
    q: 'Skąd pochodzą kamienie?',
    a: (
      <>
        Parametry kamieni opisujemy wprost.
        <DoUzupelnienia> [Do uzupełnienia: dostawcy, certyfikaty, dostępność kamieni laboratoryjnych.]</DoUzupelnienia>
      </>
    ),
  },
]

export default async function OnOrderPage() {
  const count = (await getProducts()).length
  const michal = FAMILY[3]
  return (
    <>
      <section className="wrap hero" style={{ paddingBottom: 96, gap: '48px 80px' }}>
        <div className="hero-copy" style={{ flex: '1 1 460px', gap: 28 }}>
          <h1 className="h1">Pierścionek na zamówienie</h1>
          <p className="lead" style={{ maxWidth: '32em' }}>
            Zaczynamy od rozmowy o osobie, która będzie go nosić. Potem rysujemy, modelujemy w 3D i wyceniamy. Pracę
            przy stole zaczynamy dopiero wtedy, gdy projekt i cena są dla Ciebie jasne.
          </p>
          <PriceOffer
            label="Pierścionek na zamówienie"
            note={byEnv('Cena zależy od kamieni i złota.', undefined)}
            price={byEnv('zwykle [X–Y] zł', undefined)}
          >
            <Link className="btn" href="/kontakt?temat=nowy">Umów rozmowę o projekcie</Link>
            {RING_CREATOR_ENABLED ? (
              <Link className="tl" href="/kreator">Zaprojektuj wstępnie online</Link>
            ) : (
              <Link className="tl" href={CUSTOM_ORDER_LINK.href}>{CUSTOM_ORDER_LINK.label}</Link>
            )}
          </PriceOffer>
        </div>
        <figure className="stack" style={{ flex: '1 1 420px', minWidth: 0, gap: 12 }}>
          <Photo alt={michal.alt} position={michal.pos} priority sizes="(max-width: 960px) 100vw, 40vw" src={michal.img} />
          <figcaption className="fig-cap">Michał Nowak przy oprawie kamienia.</figcaption>
        </figure>
      </section>

      <section className="band">
        <div className="wrap sec-tight stack" style={{ gap: 40 }}>
          <SectionIntro title="Na początek wystarczy jedno z nich" />
          <ul className="cols-auto cols-240" data-reveal="" style={{ listStyle: 'none', gap: '32px 40px' }}>
            {(
              [
                ['zdjecie', 'Zdjęcie, które Ci się podoba', 'Z internetu, z filmu, z ręki znajomej. Powiesz, co w nim lubisz, a co zmienić.'],
                ['przetopienie', 'Rodzinna biżuteria', 'Złoto lub kamień po bliskiej osobie mogą stać się częścią nowego pierścionka.'],
                ['pierscionek', 'Projekt z naszej kolekcji', `Weź jeden z ${count || 34} projektów i zmień kamień, kolor złota albo proporcje.`],
                ['kalendarz', 'Tylko okazja i budżet', 'To też dobry start. Pokażemy kamienie i kilka kierunków do wyboru.'],
              ] as [IconName, string, string][]
            ).map(([icon, t, p]) => (
              <li className="item-rule ic-host" key={t} style={{ gap: 10, paddingTop: 18 }}>
                <Icon name={icon} size={40} />
                <h3 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 24, lineHeight: 1.15 }}>{t}</h3>
                <p style={{ fontSize: 15.5, lineHeight: 1.6 }}>{p}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="wrap sec stack" id="proces" style={{ gap: 56 }}>
        <SectionIntro
          intro={
            <>
              Przez cały czas rozmawiasz z osobą, która robi Twój pierścionek.
              <DoUzupelnienia> Od rozmowy do odbioru mija zwykle [TERMIN, np. 4–6 tygodni].</DoUzupelnienia>
            </>
          }
          title="Cztery etapy, jeden złotnik"
        />
        <ol data-reveal="" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
          {STEPS.map((s) => (
            <li className="timeline-row" key={s.n}>
              <div className="row" style={{ gap: 20, alignItems: 'baseline', flexWrap: 'nowrap' }}>
                <span className="timeline-num">{s.n}</span>
                <h3 className="h3-serif">{s.title}</h3>
              </div>
              <p style={{ fontSize: 16, lineHeight: 1.62, color: 'var(--graphite-2)' }}>{s.text}</p>
              <div className="stack" style={{ gap: 6 }}>
                <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>Po tym etapie masz</span>
                <span style={{ fontSize: 16, lineHeight: 1.5, fontWeight: 500 }}>{s.result}</span>
              </div>
              <Image alt="" height={165} src={`/grafiki/etapy/${s.ill}.svg`} style={{ width: '100%', maxWidth: 220, height: 'auto', justifySelf: 'end' }} width={220} />
            </li>
          ))}
        </ol>
      </section>

      <section className="dark">
        <div className="wrap sec" style={{ display: 'flex', flexWrap: 'wrap', gap: '56px 96px', alignItems: 'center' }}>
          <div className="stack" style={{ flex: '1 1 400px', minWidth: 0, gap: 22 }}>
            <h2 className="h2">Co ustalimy przy pierwszej rozmowie</h2>
            <p className="text" style={{ maxWidth: '30em' }}>
              Każde zlecenie w pracowni ma swoją kartę. Tak może wyglądać po pierwszym spotkaniu. Jeśli czegoś nie
              wiesz, zostawiamy puste pole i wracamy do niego później.
            </p>
            <Link className="btn btn-light" href="/kontakt?temat=nowy" style={{ alignSelf: 'flex-start' }}>
              Umów pierwszą rozmowę
            </Link>
          </div>
          <figure className="stack" style={{ flex: '1 1 460px', minWidth: 0, gap: 12 }}>
            <div className="tag tag-xl" style={{ color: 'var(--graphite)', padding: '36px 40px 36px 72px', ['--c' as string]: '28px' }}>
              <span aria-hidden="true" className="hole" style={{ left: 24, width: 16, height: 16, marginTop: -8, background: 'var(--velvet)' }} />
              <div className="card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, borderBottom: '1px solid var(--graphite)', paddingBottom: 14, marginBottom: 18 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: 26 }}>Karta zlecenia</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Przykład</span>
              </div>
              <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, auto) 1fr', fontSize: 15.5, lineHeight: 1.45 }}>
                {([
                  ['Dla kogo', 'Narzeczona, nosi drobną biżuterię'],
                  ['Okazja', 'Zaręczyny, wyjazd w czerwcu'],
                  ['Kamień', 'Szafir, owal, około 1 ct'],
                  ['Złoto', 'Żółte'],
                  ['Rozmiar', 'Do sprawdzenia po cichu'],
                  ['Budżet', <DoUzupelnienia fallback="Do omówienia w rozmowie" key="budzet">[kwota od klienta]</DoUzupelnienia>],
                ] as [string, ReactNode][]).map(([k, v], i, a) => (
                  <div key={k} style={{ display: 'contents' }}>
                    <dt style={{ color: 'var(--muted)', padding: '10px 0', borderBottom: i < a.length - 1 ? '1px dashed var(--line-soft)' : 0 }}>{k}</dt>
                    <dd style={{ margin: 0, padding: '10px 0', borderBottom: i < a.length - 1 ? '1px dashed var(--line-soft)' : 0, fontFamily: 'var(--serif)', fontSize: 18, color: k === 'Rozmiar' ? 'var(--patina)' : undefined }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <figcaption className="fig-cap">Przykładowa karta zlecenia. Dane klienta zostają w pracowni.</figcaption>
          </figure>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 104, paddingBottom: 120, display: 'flex', flexWrap: 'wrap', gap: '48px 96px' }}>
        <h2 className="h2" style={{ flex: '1 1 320px' }}>Pytania o pracę na zamówienie</h2>
        <div style={{ flex: '2 1 560px', minWidth: 0 }}>
          <Faq items={faq()} />
        </div>
      </section>
    </>
  )
}
