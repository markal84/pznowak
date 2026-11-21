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
 * Runda 2 (Marcin 21.11): zielone ramki z propozycjami i danymi z internetu, żółte pytania otwarte; link w menu tylko na podglądzie.
 */

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Jak kupić pierścionek: płatność, wysyłka, odbiór',
  description: 'Zaliczka, płatność, wysyłka kurierem, pakowanie, odbiór w pracowni, zwroty i opieka po zakupie.',
  robots: { index: false, follow: false },
}

type NoteKind = 'pytanie' | 'prosba' | 'propozycja' | 'info'

const NOTE_LABEL: Record<NoteKind, string> = {
  pytanie: 'Pytanie do Michała',
  prosba: 'Prośba do Michała',
  propozycja: 'Propozycja do wyboru',
  info: 'Co znaleźliśmy',
}

/**
 * Ramka dla Michała (cała strona jest tylko na podglądzie). Żółte: pytania i prośby, zadane otwarcie, bez
 * podpowiadania odpowiedzi (Marcin 21.11: „nie sugeruj Michałowi niczego wprost”). Zielone: nasze propozycje
 * i informacje z internetu, osobno, żeby Michał najpierw odpowiedział po swojemu.
 */
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

function Zrodlo({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  )
}

const QUICK_FACTS: { label: string; value: ReactNode }[] = [
  { label: 'Zaliczka', value: '30% ceny, gdy projekt i cena są ustalone' },
  { label: 'Płatność', value: 'BLIK albo przelew' },
  { label: 'Wykonanie', value: 'zwykle 4–6 tygodni' },
  { label: 'Odbiór', value: 'w pracowni w Busku albo wysyłką' },
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
      <div className="wrap stack" style={{ paddingTop: 24, gap: 12 }}>
        <DlaMichala kind="prosba">
          <p>
            Michał, to wersja robocza nowej strony. Widzi ją tylko podgląd, klienci jej nie widzą. Zwykły tekst to to,
            co już wiemy od Ciebie. W żółtych ramkach są pytania: odpowiedz Marcinowi po swojemu, krótko, przy numerze
            pytania. My przepiszemy to na tekst strony.
          </p>
          <p>
            Zielone ramki to nasze pomysły i to, co znaleźliśmy w internecie. Możesz je przyjąć, zmienić albo odrzucić.
            Najlepiej przeczytaj je dopiero po odpowiedzi na żółte pytania, żeby odpowiedzieć tak, jak jest naprawdę.
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
            <ul>
              <li>Czy coś w tych pięciu krokach wygląda u Ciebie inaczej?</li>
              <li>Jak wygląda zakup pierścionka z kolekcji ze strony: robisz go od nowa czy czasem jest gotowy?</li>
            </ul>
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
            <li>Jak można zapłacić w pracowni?</li>
            <li>Jak klient płaci resztę, gdy pierścionek idzie wysyłką, i kiedy wtedy nadajesz paczkę?</li>
            <li>Jaki dokument zakupu dostaje klient?</li>
          </ul>
        </DlaMichala>
        <DlaMichala kind="propozycja">
          <p>
            Na stronach sklepów klienci szukają też tego, czego nie ma (np. raty, płatność przy odbiorze od kuriera).
            Jeśli czegoś nie oferujesz, warto to napisać wprost jednym zdaniem. Wtedy nikt nie dzwoni tylko po to, żeby o
            to zapytać.
          </p>
        </DlaMichala>
      </section>

      <section className="surface-paper">
        <div className="wrap sec stack jk-section" style={{ gap: 28 }}>
          <SectionIntro
            eyebrow="Wysyłka"
            intro="Gotowy pierścionek wysyłamy w całej Polsce. Pakuje go Michał, ten sam, który go zrobił."
            title="Wysyłka do Twoich drzwi"
          />
          <ul className="jk-list">
            <li>
              <strong>Wysyłka na adres, który podasz.</strong>
            </li>
            <li>
              <strong>Wolisz odebrać osobiście?</strong> Zapraszamy do pracowni, przymierzysz pierścionek na miejscu.
            </li>
          </ul>
          <DlaMichala kind="pytanie" n={3}>
            <ul>
              <li>Jaką firmą i jaką usługą wysyłasz dziś pierścionki?</li>
              <li>Ile kosztuje wysyłka i kto ją płaci?</li>
              <li>Co się dzieje, gdy paczka zaginie albo przyjdzie uszkodzona? Jak masz to zabezpieczone?</li>
              <li>Ile dni mija od dopłaty do nadania i co klient dostaje, gdy paczka wyjdzie?</li>
              <li>Czy wysyłasz za granicę?</li>
            </ul>
          </DlaMichala>
          <DlaMichala kind="info">
            <p>
              <strong>Ubezpieczenie u przewoźników: ważne przy biżuterii.</strong> Sprawdziliśmy regulaminy i cenniki
              (stan na 21.11.2026). Wiele firm kurierskich nie przyjmuje biżuterii jako zwykłej paczki, a wtedy
              standardowe ubezpieczenie może nie zadziałać.
            </p>
            <ul>
              <li>
                <strong>InPost (kurier i Paczkomat):</strong> „wyroby jubilerskie” są na liście rzeczy, których nie wolno
                wysyłać (pkt 6.4 regulaminu). Bez dodatkowej ochrony InPost odpowiada do 200 zł. Dodatkową ochronę można
                wykupić do 5 000, 10 000 albo 20 000 zł, ale nie obejmuje rzeczy niedozwolonych.{' '}
                <Zrodlo href="https://inpost.pl/sites/default/files/docs/regulaminy/regulamin-swiadczenia-uslug-pocztowych-i-przewozowych-przez-inpost-sp-z-oo-obowiazujacy-od-29052025.pdf">
                  Regulamin InPost (PDF)
                </Zrodlo>
              </li>
              <li>
                <strong>DPD:</strong> w cenie ochrona do 1 000 zł. Według poradnika Poczty Polskiej DPD wyklucza z
                transportu biżuterię, kamienie i metale szlachetne. Strony DPD z listą wykluczeń nie udało nam się
                odczytać, więc to warto sprawdzić.{' '}
                <Zrodlo href="https://www.dpd.com/pl/pl/2025/07/09/czego-nie-wolno-wysylac-towary-wykluczone-z-transportu/">
                  DPD: towary wykluczone
                </Zrodlo>
              </li>
              <li>
                <strong>DHL Express:</strong> „wyroby jubilerskie, zegarki” są na liście przesyłek z ograniczeniami.{' '}
                <Zrodlo href="https://dhlexpress.pl/baza-wiedzy/co-moge-wyslac/">DHL: co mogę wysłać</Zrodlo>
              </li>
              <li>
                <strong>Poczta Polska, paczka z zadeklarowaną wartością:</strong> przyjmuje kosztowności, wartość do 70
                000 zł, dopłata 1 zł za każde 50 zł wartości. Przykład: pierścionek za 3 000 zł to 60 zł dopłaty, plus
                cena samej paczki. Osobno można ubezpieczyć zawartość do 50 000 zł za 1,50 zł.{' '}
                <Zrodlo href="https://www.poczta-polska.pl/dla-ciebie/oferta/uslugi-kurierskie-i-paczkowe/paczka-pocztowa-kraj/">
                  Poczta Polska: paczka pocztowa
                </Zrodlo>
              </li>
            </ul>
            <p className="small">
              Ceny są orientacyjne i mogą się zmienić. Umowa firmowa z przewoźnikiem może mieć inne warunki niż
              regulamin, więc najpewniej zapytać swojego przewoźnika: „czy mogę u was wysłać pierścionek z diamentem za X
              zł i czy jest wtedy ubezpieczony?”.
            </p>
          </DlaMichala>
          <DlaMichala kind="propozycja">
            <p>
              <strong>Koperta bezpieczna z numerem.</strong> Plastikowa koperta, której nie da się otworzyć bez śladu, a
              każda ma swój numer. Przed nadaniem piszemy klientowi: „Twój pierścionek jest w kopercie nr …”. Klient od
              razu widzi, czy nikt po drodze nie otwierał paczki. Przykład:{' '}
              <Zrodlo href="https://www.mandras.pl/koperty-bezpieczne-c-217_13.html">koperty bezpieczne w Mandras</Zrodlo>.
            </p>
            <p>
              <strong>Jeśli już korzystasz z takich kopert, ten punkt jest załatwiony.</strong> Napisz tylko, a dopiszemy
              go na stronie.
            </p>
            <p>
              <strong>Druga rzecz, bez kosztów:</strong> zdjęcie gotowej paczki wysłane klientowi przed nadaniem, z
              numerem koperty.
            </p>
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
            Przy najbliższej wysyłce zrób proszę telefonem zdjęcia tego, jak naprawdę pakujesz pierścionek (szare pola
            wyżej to tylko miejsca na nie). Wystarczą zwykłe, w świetle dziennym.
          </p>
        </DlaMichala>
        <div className="jk-boxes">
          <figure className="stack" style={{ gap: 10 }}>
            <Photo alt="Pierścionek z diamentem w białym pudełku z ciemnoczerwonym wieczkiem" ratio="32" sizes="(max-width: 960px) 50vw, 30vw" src="/zdjecia/zakup/pudelko-biale.webp" />
            <figcaption className="fig-cap">Białe pudełko z czerwonym wieczkiem</figcaption>
          </figure>
          <figure className="stack" style={{ gap: 10 }}>
            <Photo alt="Pierścionek z diamentem w czerwonym pudełku" ratio="32" sizes="(max-width: 960px) 50vw, 30vw" src="/zdjecia/zakup/pudelko-hestia.webp" />
            <figcaption className="fig-cap">Czerwone pudełko (karta Hestia)</figcaption>
          </figure>
          <figure className="stack" style={{ gap: 10 }}>
            <Photo alt="Pierścionek z diamentem leżący na certyfikacie GIA" ratio="32" sizes="(max-width: 960px) 50vw, 30vw" src="/zdjecia/zakup/certyfikat-gia.webp" />
            <figcaption className="fig-cap">Pierścionek na certyfikacie GIA (realizacja)</figcaption>
          </figure>
          <DlaMichala kind="info">
            <p>
              Te trzy zdjęcia znaleźliśmy w Waszych postach na Facebooku i w materiałach strony. Mogą być nieaktualne:
              pudełka mogły się zmienić, a na zdjęciu certyfikatu napisy są nieczytelne. Zdjęcia certyfikatu
              gemmologicznego, który dostaje każdy klient, nie znaleźliśmy wcale.
            </p>
          </DlaMichala>
          <DlaMichala kind="pytanie" n={4}>
            <ul>
              <li>W czym dziś wydajesz pierścionek: jakie pudełko, co jeszcze jest w środku paczki?</li>
              <li>Czy któreś z tych zdjęć pokazuje to, co klient dostaje teraz?</li>
            </ul>
          </DlaMichala>
          <DlaMichala kind="prosba">
            <p>
              Zdjęcie aktualnego pudełka i certyfikatu (dane klienta można zasłonić kartką). Certyfikat najlepiej z
              góry, w świetle dziennym, tak żeby dało się przeczytać nagłówki.
            </p>
          </DlaMichala>
        </div>
      </section>

      <section className="surface-paper">
        <div className="wrap sec jk-two">
          <div className="stack jk-section" style={{ gap: 22 }}>
            <SectionIntro eyebrow="Odbiór w pracowni" title="Przymierz na miejscu" />
            <p className="text">
              Gotowy pierścionek możesz odebrać w pracowni przy {SITE.street} w Busku-Zdroju i przymierzyć go przy nas.
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
              <p>Jak wygląda odbiór w pracowni? Co klient powinien wiedzieć, zanim przyjedzie?</p>
            </DlaMichala>
          </div>
          <div className="stack jk-section" style={{ gap: 22 }}>
            <SectionIntro eyebrow="Rozmiar" title="Gdy rozmiar się nie zgadza" />
            <p className="text">
              Rozmiar ustalamy przed rozpoczęciem pracy. Jeśli go nie znasz, zajrzyj do{' '}
              <Link href={guidePath('jak-sprawdzic-rozmiar-pierscionka')}>poradnika o mierzeniu rozmiaru</Link>.
            </p>
            <DlaMichala kind="pytanie" n={6}>
              <ul>
                <li>Co się dzieje, gdy po odbiorze rozmiar nie pasuje? Jak to wygląda przy wysyłce?</li>
                <li>Czy są modele, w których rozmiaru nie da się zmienić?</li>
              </ul>
            </DlaMichala>
          </div>
        </div>
      </section>

      <section className="wrap sec stack jk-section" style={{ gap: 28 }}>
        <SectionIntro eyebrow="Zwroty i reklamacje" title="Gdy coś jest nie tak" />
        <p className="text" style={{ maxWidth: '42em' }}>
          Zadzwoń albo napisz. Obejrzymy pierścionek i powiemy, co dalej.
        </p>
        <DlaMichala kind="pytanie" n={7}>
          <ul>
            <li>Jak dziś postępujesz, gdy klient chce oddać pierścionek kupiony na odległość?</li>
            <li>A gdy zgłasza wadę?</li>
            <li>Czy macie regulamin sprzedaży albo księgową, która zajmuje się takimi sprawami?</li>
          </ul>
        </DlaMichala>
        <DlaMichala kind="info">
          <p>
            <strong>Co mówią przepisy o sprzedaży na odległość.</strong> To nie jest porada prawna, tylko to, co
            znaleźliśmy w ustawie o prawach konsumenta. Zanim cokolwiek z tego trafi na stronę, trzeba to potwierdzić,
            najlepiej z Waszą księgową albo prawnikiem.
          </p>
          <ul>
            <li>
              Sprzedaż na odległość to taka, w której klient nie był w pracowni (telefon, e-mail, Messenger). Wtedy ma
              14 dni od otrzymania paczki na odstąpienie od umowy bez podania przyczyny (art. 27).
            </li>
            <li>
              Wyjątek: rzecz „nieprefabrykowana, wyprodukowana według specyfikacji konsumenta lub służąca zaspokojeniu
              jego zindywidualizowanych potrzeb” (art. 38 ust. 1 pkt 3). Pierścionek robiony pod projekt i kamień
              klienta prawdopodobnie się w tym mieści. Model z kolekcji wybrany tylko w innym rozmiarze to sprawa sporna.
              Gotowy pierścionek z kolekcji zwykle podlega zwrotowi.{' '}
              <Zrodlo href="https://sip.lex.pl/akty-prawne/dzu-dziennik-ustaw/prawa-konsumenta-18105223/art-38">
                Art. 38 (LEX)
              </Zrodlo>
              ,{' '}
              <Zrodlo href="https://fundacja.togatus.pl/zwrot-towarow-na-indywidualne-zamowienie/">
                omówienie wyjątku
              </Zrodlo>
            </li>
            <li>
              Przy zwrocie sprzedawca oddaje pieniądze w ciągu 14 dni, razem z kosztem najtańszej wysyłki do klienta
              (art. 32). Może poczekać z wypłatą, aż pierścionek do niego wróci. Koszt odesłania ponosi klient, jeśli
              wcześniej został o tym poinformowany (art. 34).
            </li>
            <li>
              Jeśli klient nie dostanie przed zakupem informacji o prawie do odstąpienia, ma na to nie 14 dni, tylko do
              12 miesięcy (art. 29).
            </li>
            <li>
              Reklamacja wad (niezgodność z umową) przysługuje przez 2 lata, także przy pierścionkach robionych na
              zamówienie.
            </li>
          </ul>
        </DlaMichala>
      </section>

      <section className="surface-paper">
        <div className="wrap sec stack jk-section" style={{ gap: 28 }}>
          <SectionIntro eyebrow="Po zakupie" title="Certyfikat i opieka" />
          <p className="text" style={{ maxWidth: '42em' }}>
            Do pierścionka dostajesz certyfikat z opisem kamieni. Zachowaj go: przyda się przy ubezpieczeniu biżuterii i
            przy przyszłych naprawach.
          </p>
          <DlaMichala kind="pytanie" n={8}>
            <ul>
              <li>Kto wystawia certyfikat i co na nim jest?</li>
              <li>Jaką opiekę ma klient po zakupie: czyszczenie, przegląd, naprawy?</li>
              <li>Jak wygląda gwarancja?</li>
              <li>Jak jest z grawerem w pierścionku?</li>
            </ul>
          </DlaMichala>
          <DlaMichala kind="info">
            <p>
              W Waszym poście na Facebooku jest zdanie: „Każdy z naszych pierścionków posiada certyfikat z opisem kamieni
              wydany przez gemmologa”. Jeśli to nadal aktualne, wpiszemy to tutaj Twoimi słowami.
            </p>
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
