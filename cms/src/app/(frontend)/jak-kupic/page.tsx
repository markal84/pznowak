import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import Photo from '@/components/site/Photo'
import SectionIntro from '@/components/site/SectionIntro'
import { guidePath } from '@/lib/guides'
import { showPlaceholders } from '@/lib/placeholders'
import { SITE } from '@/lib/site'

/**
 * „Jak kupić” (Marcin 21.11.2026): zakup, płatność, wysyłka, pakowanie, odbiór, zwroty i opieka w jednym miejscu.
 * WERSJA ROBOCZA TYLKO NA PODGLĄD VERCELA: Michał ogląda stronę i odpowiada na pytania w żółtych ramkach.
 * Na produkcji strony nie ma (404, noindex), nie ma do niej linków w menu ani w stopce. Bez zmian w bazie.
 * Fakty potwierdzone wcześniej: zaliczka 30% BLIK-iem lub przelewem, reszta przy odbiorze albo przed wysyłką
 * (Michał 14.11), certyfikat kamieni naturalnych, zwykły kurier w całej Polsce, wykonanie zwykle 4–6 tygodni,
 * bez dodatkowego ubezpieczenia przesyłki (Marcin 21.11). Wszystko inne jest pytaniem albo propozycją.
 */

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Jak kupić pierścionek: płatność, wysyłka, odbiór',
  description: 'Zaliczka, płatność, wysyłka kurierem, pakowanie, odbiór w pracowni, zwroty i opieka po zakupie.',
  robots: { index: false, follow: false },
}

type NoteKind = 'pytanie' | 'prosba' | 'propozycja'

const NOTE_LABEL: Record<NoteKind, string> = {
  pytanie: 'Pytanie do Michała',
  prosba: 'Prośba do Michała',
  propozycja: 'Propozycja',
}

/** Żółta ramka dla Michała: widać ją tylko na podglądzie (cała strona i tak jest tylko na podglądzie). */
function DlaMichala({ kind, n, children }: { kind: NoteKind; n?: number; children: ReactNode }) {
  return (
    <aside className={`dla-michala dla-michala-${kind}`}>
      <p className="dla-michala-label">
        {NOTE_LABEL[kind]}
        {n ? ` ${n}` : ''}
      </p>
      <div className="dla-michala-body">{children}</div>
    </aside>
  )
}

const QUICK_FACTS: { label: string; value: ReactNode }[] = [
  { label: 'Zaliczka', value: '30% ceny, gdy projekt i cena są ustalone' },
  { label: 'Płatność', value: 'BLIK albo przelew' },
  { label: 'Wykonanie', value: 'zwykle 4–6 tygodni' },
  { label: 'Odbiór', value: 'w pracowni w Busku albo kurierem' },
  { label: 'W komplecie', value: 'certyfikat kamieni naturalnych' },
]

const STEPS: { title: string; text: string }[] = [
  {
    title: 'Rozmowa',
    text: 'Dzwonisz, piszesz albo przychodzisz. Wybieramy model i kamień, pokazujemy zdjęcia i filmy kamieni.',
  },
  {
    title: 'Rozmiar',
    text: 'Zmierzy go każdy jubiler w Twojej okolicy albo my w pracowni. Podpowiadamy, jak zrobić to w tajemnicy.',
  },
  {
    title: 'Cena i zaliczka',
    text: 'Znasz całą kwotę, zanim cokolwiek wpłacisz. Zaliczka to 30% ceny, BLIK-iem albo przelewem.',
  },
  {
    title: 'Praca przy stole',
    text: 'Pierścionek powstaje w pracowni w Busku-Zdroju, zwykle w 4–6 tygodni. Dajemy znać, gdy jest gotowy.',
  },
  {
    title: 'Odbiór',
    text: 'Przymierzasz go u nas albo wysyłamy kurierem. Pozostałą kwotę rozliczamy przy odbiorze lub przed wysyłką.',
  },
]

/** Kadry pakowania, o które prosimy Michała (prawdziwe zdjęcia zamiast stockowych). */
const PACKING_SHOTS: { title: string; text: string }[] = [
  { title: 'Pierścionek w pudełku', text: 'Pudełko otwarte, pierścionek w środku, z góry albo lekko z boku.' },
  { title: 'Certyfikat obok pudełka', text: 'Tak, żeby było widać, że to prawdziwy dokument z pracowni.' },
  { title: 'Pudełko w kopercie lub kartonie', text: 'Jak zabezpieczasz pudełko przed podróżą (wypełniacz, folia, karton).' },
  { title: 'Gotowa paczka', text: 'Zaklejona przesyłka, najlepiej na stole w pracowni, przy narzędziach.' },
]

export default function JakKupicPage() {
  if (!showPlaceholders()) notFound()

  return (
    <>
      <div className="wrap" style={{ paddingTop: 24 }}>
        <DlaMichala kind="prosba">
          <p>
            Michał, to wersja robocza nowej strony. Widzi ją tylko podgląd, klienci jej nie widzą. W żółtych ramkach są
            pytania i prośby: wystarczy odpowiedzieć Marcinowi krótko, nawet jednym słowem przy numerze pytania, a my
            przepiszemy tekst. Tekst poza ramkami to to, co już wiemy od Ciebie.
          </p>
        </DlaMichala>
      </div>

      <section className="wrap hero" style={{ paddingBottom: 64, gap: '40px 80px' }}>
        <div className="hero-copy" style={{ flex: '1 1 460px', gap: 24 }}>
          <p className="eyebrow">Zakup krok po kroku</p>
          <h1 className="h1">Jak kupić pierścionek</h1>
          <p className="lead" style={{ maxWidth: '34em' }}>
            Od pierwszej rozmowy do pudełka w Twoich rękach. Tu zebraliśmy wszystko, o co zwykle pytacie, zanim
            zdecydujecie się na pierścionek z naszej pracowni.
          </p>
          <div className="row gap-14-28">
            <a className="btn" href={SITE.phoneHref}>
              Zadzwoń: {SITE.phoneShort}
            </a>
            <Link className="tl" href="/kontakt">
              Napisz do nas
            </Link>
          </div>
        </div>
        <dl className="jk-facts" style={{ flex: '1 1 380px' }}>
          {QUICK_FACTS.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="band">
        <div className="wrap sec-tight stack" style={{ gap: 40 }}>
          <SectionIntro eyebrow="Krok po kroku" title="Od rozmowy do odbioru" />
          <ol className="steps steps-light" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px 40px' }}>
            {STEPS.map((s, i) => (
              <li className="step" key={s.title}>
                <span className="n">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
          <DlaMichala kind="pytanie" n={1}>
            <p>
              Czy pierścionki z kolekcji (te z kart na stronie) bywają gotowe od ręki, czy zawsze robisz je po
              zamówieniu? Jeśli bywają gotowe: czy wtedy klient płaci całość od razu, bez zaliczki, i ile trwa wysyłka?
            </p>
          </DlaMichala>
        </div>
      </section>

      <section className="wrap sec stack jk-section" style={{ gap: 28 }}>
        <SectionIntro
          eyebrow="Płatność"
          intro="Zanim zaczniemy pracę, znasz cenę i wiesz, ile wpłacasz teraz, a ile przy odbiorze."
          title="Zaliczka i dopłata"
        />
        <ul className="jk-list">
          <li>
            <strong>Zaliczka 30%</strong> po akceptacji projektu i ceny. Wtedy zaczynamy pracę przy stole.
          </li>
          <li>
            <strong>BLIK albo przelew</strong>, jak Ci wygodniej.
          </li>
          <li>
            <strong>Pozostałe 70%</strong> płacisz przy odbiorze w pracowni albo przed wysyłką kurierem.
          </li>
        </ul>
        <DlaMichala kind="pytanie" n={2}>
          <ul>
            <li>W pracowni można zapłacić gotówką i kartą?</li>
            <li>Dopłatę przed wysyłką: przelewem czy BLIK-iem? Wysyłasz dopiero po zaksięgowaniu?</li>
            <li>Raty albo płatność za pobraniem: tak czy nie? (Nie musimy ich mieć, chodzi o to, żeby napisać wprost.)</li>
            <li>Paragon, a na życzenie faktura?</li>
          </ul>
        </DlaMichala>
      </section>

      <section className="surface-paper">
        <div className="wrap sec stack jk-section" style={{ gap: 28 }}>
          <SectionIntro
            eyebrow="Wysyłka"
            intro="Gotowy pierścionek wysyłamy kurierem w całej Polsce. Pakuje go Michał, ten sam, który go zrobił."
            title="Kurierem do Twoich drzwi"
          />
          <ul className="jk-list">
            <li>
              <strong>Kurier na adres, który podasz.</strong>
            </li>
            <li>
              <strong>Przesyłka jest ubezpieczona</strong> w ramach standardowej ochrony firmy kurierskiej.
            </li>
            <li>
              <strong>Wolisz odebrać osobiście?</strong> Zapraszamy do pracowni, przymierzysz pierścionek na miejscu.
            </li>
          </ul>
          <DlaMichala kind="pytanie" n={3}>
            <ul>
              <li>Jaki kurier (InPost, DPD, DHL, Pocztex)? Paczkomat też?</li>
              <li>Koszt wysyłki: wliczony w cenę pierścionka czy osobno, ile?</li>
              <li>Do jakiej kwoty kurier standardowo ubezpiecza Twoje paczki? Wpiszemy dokładnie tyle, nic więcej.</li>
              <li>Ile dni mija od dopłaty do nadania? Wysyłasz klientowi numer przesyłki?</li>
              <li>Wysyłka za granicę: tak czy nie?</li>
            </ul>
          </DlaMichala>
          <DlaMichala kind="propozycja">
            <p>
              <strong>Koperta bezpieczna z numerem.</strong> To plastikowa koperta, której nie da się otworzyć bez śladu,
              a każda ma swój unikalny numer. Przed nadaniem piszemy klientowi: „Twój pierścionek jest w kopercie nr
              …”. Klient od razu widzi, czy paczki nikt po drodze nie otwierał. Koperty kupuje się w paczkach, są tanie,
              a dla kogoś, kto wydaje kilka tysięcy na pierścionek, to duży spokój.
            </p>
            <p>
              <strong>I druga, darmowa rzecz:</strong> zdjęcie gotowej paczki wysłane klientowi przed nadaniem, z
              numerem koperty. U dużych sklepów tego nie ma, a u nas pokazuje, że po drugiej stronie jest człowiek.
            </p>
            <p>Michał, robimy jedno, drugie, oba? Jeśli tak, dopiszemy to na stronie jako stały element wysyłki.</p>
          </DlaMichala>
        </div>
      </section>

      <section className="wrap sec stack jk-section" style={{ gap: 28 }}>
        <SectionIntro
          eyebrow="Pakowanie"
          intro="Tak wygląda Twoja paczka, zanim wyjdzie z pracowni."
          title="Jak pakujemy pierścionek"
        />
        <div className="jk-packing">
          {PACKING_SHOTS.map((shot, i) => (
            <figure className="jk-shot" key={shot.title}>
              <div className="jk-shot-ph">
                <span>Zdjęcie {i + 1}</span>
              </div>
              <figcaption>
                <strong>{shot.title}</strong>
                <span>{shot.text}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <DlaMichala kind="prosba">
          <p>
            Przy najbliższej wysyłce zrób proszę telefonem te cztery zdjęcia (szare pola wyżej). Wystarczą zwykłe, w
            świetle dziennym. To najmocniejsza część tej strony: klient widzi prawdziwą paczkę z prawdziwej pracowni, a
            nie zdjęcie z katalogu.
          </p>
        </DlaMichala>
        <div className="jk-boxes">
          <figure className="stack" style={{ gap: 10 }}>
            <Photo alt="Pierścionek z diamentem w białym pudełku z ciemnoczerwonym wieczkiem" ratio="45" sizes="(max-width: 960px) 100vw, 30vw" src="/zdjecia/zakup/pudelko-dione.webp" />
            <figcaption className="fig-cap">Ze zdjęć karty Dione</figcaption>
          </figure>
          <figure className="stack" style={{ gap: 10 }}>
            <Photo alt="Pierścionek z diamentem w czerwonym pudełku" ratio="32" sizes="(max-width: 960px) 100vw, 40vw" src="/zdjecia/zakup/pudelko-hestia.webp" />
            <figcaption className="fig-cap">Ze zdjęć karty Hestia</figcaption>
          </figure>
          <DlaMichala kind="pytanie" n={4}>
            <ul>
              <li>Czy któreś z tych pudełek to Wasze standardowe? Jeśli tak, które?</li>
              <li>Co jeszcze jest w paczce: torebka, karta z pielęgnacją, liścik?</li>
            </ul>
          </DlaMichala>
        </div>
      </section>

      <section className="surface-paper">
        <div className="wrap sec jk-two">
          <div className="stack jk-section" style={{ gap: 22 }}>
            <SectionIntro eyebrow="Odbiór w pracowni" title="Przymierz na miejscu" />
            <p className="text">
              Gotowy pierścionek możesz odebrać w pracowni przy {SITE.street} w Busku-Zdroju. Przymierzysz go przy nas, a
              jeśli coś trzeba dopasować, poprawimy drobiazgi od ręki.
            </p>
            <dl className="hours" style={{ fontSize: 15.5 }}>
              {SITE.hours.map((h) => (
                <div key={h.days} style={{ display: 'contents' }}>
                  <dt>{h.days}</dt>
                  <dd>{h.time}</dd>
                </div>
              ))}
            </dl>
            <DlaMichala kind="pytanie" n={5}>
              <p>Odbiór w godzinach otwarcia bez umawiania, czy lepiej wcześniej zadzwonić?</p>
            </DlaMichala>
          </div>
          <div className="stack jk-section" style={{ gap: 22 }}>
            <SectionIntro eyebrow="Rozmiar" title="Gdy rozmiar się nie zgadza" />
            <p className="text">
              Rozmiar mierzymy przed rozpoczęciem pracy, więc pierścionek powinien pasować od razu. Jeśli nie znasz
              rozmiaru, zajrzyj do <Link href={guidePath('jak-sprawdzic-rozmiar-pierscionka')}>poradnika o mierzeniu rozmiaru</Link>.
            </p>
            <DlaMichala kind="pytanie" n={6}>
              <ul>
                <li>Gdy rozmiar po odbiorze nie pasuje: pierwsza korekta bezpłatna?</li>
                <li>W jakim czasie od odbioru i czy przy wysyłce klient odsyła kurierem na Wasz koszt?</li>
                <li>Których pierścionków nie da się zmniejszyć lub powiększyć (np. kamienie dookoła obrączki)?</li>
              </ul>
            </DlaMichala>
          </div>
        </div>
      </section>

      <section className="wrap sec jk-two">
        <div className="stack jk-section" style={{ gap: 22 }}>
          <SectionIntro eyebrow="Zwroty i reklamacje" title="Gdy coś jest nie tak" />
          <p className="text">
            Pierścionek wykonany na zamówienie, według projektu i rozmiaru ustalonego z Tobą, nie podlega zwrotowi bez
            podania przyczyny. Wady wykonania możesz reklamować zgodnie z przepisami: zadzwoń albo napisz, obejrzymy
            pierścionek i powiemy, co dalej.
          </p>
          <DlaMichala kind="pytanie" n={7}>
            <ul>
              <li>Zostawiamy tak dla pierścionków na zamówienie?</li>
              <li>
                Gotowy pierścionek z kolekcji w standardowym rozmiarze, kupiony na odległość: 14 dni na zwrot (tak każe
                prawo przy sprzedaży na odległość)? Kto płaci za odesłanie?
              </li>
            </ul>
            <p className="small">Tę część warto, żeby ktoś jeszcze przejrzał prawnie, zanim trafi na stronę.</p>
          </DlaMichala>
        </div>
        <div className="stack jk-section" style={{ gap: 22 }}>
          <SectionIntro eyebrow="Po zakupie" title="Certyfikat i opieka" />
          <p className="text">
            Każdy pierścionek z kamieniami naturalnymi dostajesz z certyfikatem, który potwierdza, że kamień jest
            naturalny. Zachowaj go: przyda się przy ubezpieczeniu biżuterii i przy przyszłych naprawach. Później
            zapraszamy na czyszczenie i przegląd oprawy, żeby kamień trzymał się pewnie przez lata.
          </p>
          <DlaMichala kind="pytanie" n={8}>
            <ul>
              <li>Czyszczenie i przegląd oprawy dla Waszych pierścionków: bezpłatnie? Bez limitu czasu?</li>
              <li>Gwarancja na wykonanie: jak długo?</li>
              <li>Grawer w środku obrączki: w cenie czy dopłata (dziś na stronie napraw: 4 zł za znak)?</li>
              <li>Kto wystawia certyfikat: pracownia czy laboratorium? Co na nim jest (kamień, masa, próba złota)?</li>
            </ul>
          </DlaMichala>
        </div>
      </section>

      <section className="wrap sec-tight">
        <div className="dark" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px 56px', alignItems: 'center', padding: 48 }}>
          <div className="stack" style={{ flex: '2 1 420px', minWidth: 0, gap: 12 }}>
            <h2 className="h2 h2-md">Masz pytanie, którego tu nie ma?</h2>
            <p className="text" style={{ maxWidth: '34em', fontSize: 16.5 }}>
              Zadzwoń albo napisz. Odpowiadają ludzie z pracowni, ci sami, którzy robią Twój pierścionek.
            </p>
          </div>
          <div className="row gap-14-28" style={{ flex: '1 1 260px' }}>
            <a className="btn" href={SITE.phoneHref}>
              {SITE.phone}
            </a>
            <a className="tl" href={`mailto:${SITE.email}`}>
              {SITE.email}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
