import type { Metadata } from 'next'
import Link from 'next/link'
import GuideLayout from '@/components/site/GuideLayout'
import RingSizeTool from '@/components/site/RingSizeTool'
import { findGuide, guidePath } from '@/lib/guides'
import { formatNumberPl, ringSizeTable } from '@/lib/ring-size'
import { pageMetadata } from '@/lib/seo'

const guide = findGuide('jak-sprawdzic-rozmiar-pierscionka')

export const metadata: Metadata = pageMetadata({
  title: guide.title,
  description: guide.description,
  path: guidePath(guide.slug),
})

const SECTIONS = [
  { id: 'krotko', label: 'Krótka odpowiedź' },
  { id: 'z-pierscionka', label: 'Z pierścionka, który już nosi' },
  { id: 'z-palca', label: 'Z obwodu palca' },
  { id: 'kalkulator', label: 'Kalkulator rozmiaru' },
  { id: 'tabela', label: 'Tabela rozmiarów' },
  { id: 'bledy', label: 'Co zmienia wynik' },
  { id: 'niespodzianka', label: 'Gdy to niespodzianka' },
  { id: 'pytania', label: 'Częste pytania' },
]

const FAQ = [
  {
    q: 'Co oznacza polski rozmiar pierścionka?',
    text: 'Polski rozmiar to obwód wewnętrzny pierścionka w milimetrach pomniejszony o 40. Rozmiar 12 ma obwód wewnętrzny 52 mm i średnicę wewnętrzną około 16,6 mm.',
  },
  {
    q: 'Jak zmierzyć rozmiar pierścionka w domu?',
    text: 'Najpewniej z pierścionka, który dobrze leży na tym samym palcu: zmierz jego średnicę wewnętrzną w milimetrach i odczytaj rozmiar z tabeli albo z kalkulatora. Drugi sposób to pasek papieru owinięty wokół palca: jego długość do miejsca styku to obwód.',
  },
  {
    q: 'Co zrobić, jeśli wynik wypada między dwoma rozmiarami?',
    text: 'Przy wąskiej obrączce zwykle lepiej sprawdza się mniejszy rozmiar, przy szerokiej większy. Ostatecznie rozmiar potwierdza złotnik albo jubiler, który mierzy palec miarką.',
  },
  {
    q: 'Czy rozmiar pierścionka można poprawić po zaręczynach?',
    text: 'Tak, rozmiar można poprawić po zaręczynach. Dlatego przy niespodziance wystarczy rozmiar przybliżony.',
  },
]

export default function RingSizeGuidePage() {
  const rows = ringSizeTable()
  return (
    <GuideLayout
      faq={FAQ}
      guide={guide}
      lead="Rozmiar najłatwiej odczytać z pierścionka, który ta osoba już nosi na tym samym palcu. Wystarczy linijka. Poniżej trzy sposoby, kalkulator i tabela rozmiarów."
      sections={SECTIONS}
    >
      <h2 id="krotko">Krótka odpowiedź</h2>
      <p>
        Polski rozmiar pierścionka to <strong>obwód wewnętrzny w milimetrach pomniejszony o 40</strong>. Pierścionek o
        obwodzie wewnętrznym 52 mm ma rozmiar 12, a o obwodzie 54 mm rozmiar 14. Żeby go poznać, potrzebujesz jednej z dwóch
        liczb: średnicy wewnętrznej pierścionka, który pasuje, albo obwodu palca.
      </p>
      <figure className="guide-figure">
        <svg aria-labelledby="rys-rozmiar" role="img" viewBox="0 0 560 220">
          <title id="rys-rozmiar">
            Pierścionek widziany z przodu: średnica wewnętrzna mierzona w najszerszym miejscu i obwód wewnętrzny
          </title>
          <circle cx="150" cy="110" fill="none" r="78" stroke="currentColor" strokeWidth="14" />
          <line stroke="var(--patina)" strokeWidth="2" x1="79" x2="221" y1="110" y2="110" />
          <path d="M79 110 l10 -6 v12 z M221 110 l-10 -6 v12 z" fill="var(--patina)" />
          <text fill="var(--patina)" fontSize="15" textAnchor="middle" x="150" y="100">
            średnica wewnętrzna
          </text>
          <circle cx="410" cy="110" fill="none" r="78" stroke="currentColor" strokeWidth="14" />
          <circle cx="410" cy="110" fill="none" r="69" stroke="var(--patina)" strokeDasharray="6 6" strokeWidth="2" />
          <text fill="var(--patina)" fontSize="15" textAnchor="middle" x="410" y="106">
            obwód wewnętrzny
          </text>
          <text fill="var(--patina)" fontSize="15" textAnchor="middle" x="410" y="126">
            = średnica × 3,14
          </text>
        </svg>
        <figcaption className="fig-cap">Liczy się wnętrze pierścionka, bez grubości metalu.</figcaption>
      </figure>

      <h2 id="z-pierscionka">Sposób 1: z pierścionka, który już nosi</h2>
      <p>To najpewniejsza metoda w domu i jedyna, która działa bez wiedzy drugiej osoby.</p>
      <ol>
        <li>
          Wybierz pierścionek noszony na <strong>tym samym palcu tej samej ręki</strong>, na którym ma być nowy. Palce obu rąk
          różnią się, czasem o cały rozmiar.
        </li>
        <li>Połóż go płasko na linijce i zmierz wnętrze w najszerszym miejscu, od krawędzi do krawędzi. Zapisz wynik w milimetrach.</li>
        <li>
          Wpisz średnicę do <a href="#kalkulator">kalkulatora</a> albo znajdź ją w <a href="#tabela">tabeli</a>.
        </li>
      </ol>
      <p>
        Jeśli nie masz linijki z podziałką milimetrową, połóż pierścionek na kartce i <strong>odrysuj jego wnętrze</strong>{' '}
        cienko zaostrzonym ołówkiem. Taki rysunek możesz zmierzyć później albo pokazać złotnikowi. Możesz też pokazać sam
        pierścionek nam w pracowni albo jubilerowi w swojej okolicy: odczyta rozmiar na miarce w kilka sekund.
      </p>

      <h2 id="z-palca">Sposób 2: z obwodu palca</h2>
      <p>Przydaje się, gdy nie ma pierścionka do porównania, a osoba, która będzie go nosić, wie o pomiarze.</p>
      <ol>
        <li>Utnij pasek papieru o szerokości około 5 mm.</li>
        <li>Owiń go wokół palca tam, gdzie ma leżeć pierścionek. Pasek ma przylegać, ale nie uciskać.</li>
        <li>Zaznacz miejsce, w którym koniec paska spotyka się z resztą, rozwiń pasek i zmierz długość do znaku.</li>
        <li>Sprawdź, czy tak ustawiony pasek przejdzie przez staw palca. Jeśli nie, zmierz obwód w stawie i wybierz wartość pośrednią.</li>
      </ol>
      <p>
        Nitka i sznurek rozciągają się i dają zawyżony wynik, dlatego lepszy jest papier. Pomiar powtórz dwa, trzy razy.
      </p>

      <h2 id="kalkulator">Kalkulator rozmiaru pierścionka</h2>
      <p>Wpisz jedną zmierzoną wartość. Kalkulator przeliczy ją na rozmiar polski, europejski i amerykański.</p>
      <RingSizeTool />

      <h2 id="tabela">Tabela rozmiarów pierścionków</h2>
      <p>
        Rozmiar europejski to sam obwód wewnętrzny w milimetrach (rozmiar polski 12 to europejski 52). Rozmiar amerykański
        podajemy w przybliżeniu, bo skale nie pokrywają się dokładnie.
      </p>
      <div className="guide-table-wrap">
        <table className="guide-table">
          <caption className="sr-only">Rozmiary pierścionków: polski, obwód, średnica, amerykański</caption>
          <thead>
            <tr>
              <th scope="col">Rozmiar polski</th>
              <th scope="col">Obwód wewnętrzny (rozmiar europejski)</th>
              <th scope="col">Średnica wewnętrzna</th>
              <th scope="col">Rozmiar amerykański</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.pl}>
                <th scope="row">{row.pl}</th>
                <td>{row.circumferenceMm} mm</td>
                <td>{formatNumberPl(row.diameterMm)} mm</td>
                <td>ok. {formatNumberPl(row.us, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="bledy">Co zmienia wynik pomiaru</h2>
      <ul>
        <li>
          <strong>Pora dnia i temperatura.</strong> Palce są szczuplejsze rano i na zimnie, a grubsze wieczorem i w upale.
          Najlepiej mierzyć po południu, w temperaturze pokojowej.
        </li>
        <li>
          <strong>Szerokość obrączki.</strong> Szeroki pierścionek leży ciaśniej niż wąski w tym samym rozmiarze. Jeśli wzór
          jest szeroki, powiedz o tym przy zamówieniu.
        </li>
        <li>
          <strong>Staw palca.</strong> Pierścionek musi przejść przez staw, a potem nie obracać się u nasady palca. Gdy staw
          jest wyraźnie szerszy, rozmiar dobiera się pod niego.
        </li>
        <li>
          <strong>Ręka.</strong> Palce ręki, którą częściej pracujesz, bywają grubsze. Mierz tę rękę, na której pierścionek
          będzie noszony.
        </li>
      </ul>

      <h2 id="niespodzianka">Gdy to ma być niespodzianka</h2>
      <p>
        Weź na chwilę pierścionek, który ta osoba nosi na palcu serdecznym, i zmierz jego wnętrze albo odrysuj je na kartce.
        Jeśli nosi pierścionki tylko na innych palcach, też się przydadzą: powiedz złotnikowi, z którego palca pochodzi
        pomiar. Pomóc może też ktoś z rodziny albo przyjaciółka, która zna rozmiar albo może o niego zapytać bez wzbudzania
        podejrzeń.
      </p>
      <p className="guide-note">
        Nie musisz trafić co do milimetra. <strong>Rozmiar można poprawić po zaręczynach</strong>, więc przy niespodziance
        wystarczy rozmiar przybliżony.
      </p>
      <p>
        Zamawiasz z daleka? Rozmiar zmierzy każdy jubiler w Twojej okolicy, a nam wystarczy liczba. Jak wygląda całe
        zamówienie bez przyjazdu do Buska-Zdroju, opisujemy na stronie{' '}
        <Link href="/na-zamowienie">Pierścionek na zamówienie</Link>. Każdy projekt z{' '}
        <Link href="/pierscionki">naszej kolekcji pierścionków</Link> wykonujemy w Twoim rozmiarze.
      </p>

      <h2 id="pytania">Częste pytania</h2>
      <dl className="guide-faq">
        {FAQ.map((item) => (
          <div key={item.q}>
            <dt>{item.q}</dt>
            <dd>{item.text}</dd>
          </div>
        ))}
      </dl>
    </GuideLayout>
  )
}
