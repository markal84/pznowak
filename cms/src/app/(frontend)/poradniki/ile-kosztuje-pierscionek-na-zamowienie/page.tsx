import type { Metadata } from 'next'
import Link from 'next/link'
import GuideLayout from '@/components/site/GuideLayout'
import RingCard from '@/components/site/RingCard'
import { getProducts } from '@/lib/collection'
import { catalogHref, pluralRing, priceExamples, toCatalogRing } from '@/lib/catalog'
import { findGuide, guidePath } from '@/lib/guides'
import { formatPrice } from '@/lib/price'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

const guide = findGuide('ile-kosztuje-pierscionek-na-zamowienie')

export const metadata: Metadata = pageMetadata({
  title: guide.title,
  description: guide.description,
  path: guidePath(guide.slug),
})

const FAQ_BASE = [
  {
    q: 'Od czego zależy cena pierścionka na zamówienie?',
    text: 'Od kamienia głównego (rodzaju, masy i jakości), kamieni bocznych, ilości i koloru złota oraz od tego, ile pracy wymaga oprawa. Największą różnicę robi zwykle kamień główny.',
  },
  {
    q: 'Kiedy poznam cenę?',
    text: 'Przed rozpoczęciem pracy. Po rozmowie i ustaleniu projektu dostajesz wycenę do akceptacji. Nic nie wykonujemy bez Twojej zgody na projekt i cenę.',
  },
  {
    q: 'Jak wygląda płatność?',
    text: 'Po akceptacji projektu i wyceny wpłacasz zaliczkę w wysokości 30% ceny, BLIK-iem albo przelewem. Pozostałą kwotę rozliczamy przy odbiorze w pracowni albo przed wysyłką kurierem.',
  },
  {
    q: 'Czy mogę podać budżet zamiast wybierać projekt?',
    text: 'Tak. Powiedz, jaki budżet planujesz, a dopasujemy do niego projekt: kamień, jego wielkość i oprawę.',
  },
]

const SECTIONS = [
  { id: 'krotko', label: 'Krótka odpowiedź' },
  { id: 'skladniki', label: 'Z czego składa się cena' },
  { id: 'wyzej-nizej', label: 'Co podnosi, a co obniża cenę' },
  { id: 'budzet', label: 'Jak zmieścić się w budżecie' },
  { id: 'przyklady', label: 'Przykłady z kolekcji' },
  { id: 'wycena', label: 'Wycena i płatność' },
  { id: 'pytania', label: 'Częste pytania' },
]

export default async function PriceGuidePage() {
  const rings = (await getProducts()).map(toCatalogRing)
  const examples = priceExamples(rings)
  const priced = rings.filter((r) => r.price !== null)
  const lowest = examples[0]?.price ?? null
  const highest = examples[examples.length - 1]?.price ?? null
  const hasRange = lowest !== null && highest !== null && priced.length >= 2 && highest > lowest
  const sections = examples.length > 0 ? SECTIONS : SECTIONS.filter((s) => s.id !== 'przyklady')

  return (
    <GuideLayout
      faq={FAQ_BASE}
      guide={guide}
      lead="Nie ma jednej ceny, bo każdy pierścionek ma inny kamień i inną ilość złota. Da się za to dokładnie powiedzieć, z czego cena się składa i którymi decyzjami można ją zmienić."
      sections={sections}
    >
      <h2 id="krotko">Krótka odpowiedź</h2>
      {hasRange ? (
        <p>
          Pierścionki z naszej kolekcji kosztują dziś <strong>{formatPrice(lowest)}</strong>, a najdroższy wyceniony projekt{' '}
          <strong>{formatPrice(highest, '')}</strong> (ceny z {priced.length} {pluralRing(priced.length)} w katalogu, w wersji
          ze zdjęć). Pierścionek projektowany od zera wyceniamy po rozmowie, bo jego cena zależy od wybranego kamienia i
          złota.
        </p>
      ) : (
        <p>
          Pierścionek na zamówienie wyceniamy po rozmowie, bo jego cena zależy od wybranego kamienia i złota. Aktualne ceny
          gotowych projektów znajdziesz w <Link href="/pierscionki">kolekcji pierścionków</Link>.
        </p>
      )}
      <p>
        Wycenę zawsze dostajesz <strong>przed rozpoczęciem pracy</strong>. Jeśli powiesz na początku, jaki budżet planujesz,
        dopasujemy do niego projekt.
      </p>

      <h2 id="skladniki">Z czego składa się cena pierścionka</h2>
      <h3>Kamień główny</h3>
      <p>
        To on najczęściej decyduje o cenie. Liczą się rodzaj kamienia, jego masa w karatach i jakość: barwa, czystość i
        szlif. Cena kamienia rośnie szybciej niż jego masa, bo duże, czyste kamienie są dużo rzadsze od małych. Dwa razy
        cięższy kamień tej samej jakości kosztuje zwykle wyraźnie więcej niż dwa razy tyle.
      </p>
      <h3>Kamienie boczne</h3>
      <p>
        Małe diamenty po bokach albo w obwódce dodają blasku i pracy: każdy z nich trzeba osobno oprawić. Im jest ich
        więcej, tym więcej godzin przy stole.
      </p>
      <h3>Złoto</h3>
      <p>
        Na cenę wpływa ilość złota, czyli grubość i szerokość obrączki oraz wielkość oprawy. Masywny pierścionek zużywa
        go po prostu więcej niż delikatny.
      </p>
      <h3>Praca złotnika</h3>
      <p>
        Prosta oprawa jednego kamienia powstaje szybciej niż ażurowa korona z kilkunastoma kamieniami. W pracowni kamienie
        oprawiamy ręcznie, a wykończenie i polerowanie też robimy ręcznie, więc złożoność wzoru przekłada się na czas.
      </p>

      <h2 id="wyzej-nizej">Co podnosi, a co obniża cenę</h2>
      <div className="guide-table-wrap">
        <table className="guide-table">
          <caption className="sr-only">Decyzje, które podnoszą albo obniżają cenę pierścionka</caption>
          <thead>
            <tr>
              <th scope="col">Decyzja</th>
              <th scope="col">Cena rośnie, gdy</th>
              <th scope="col">Cena spada, gdy</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Rodzaj kamienia</th>
              <td>wybierasz diament, szafir, rubin albo szmaragd wysokiej jakości</td>
              <td>wybierasz topaz, ametyst, cytryn albo turmalin</td>
            </tr>
            <tr>
              <th scope="row">Wielkość kamienia</th>
              <td>kamień jest większy, zwłaszcza powyżej pełnego karata</td>
              <td>kamień jest nieco mniejszy, a wrażenie wielkości daje oprawa</td>
            </tr>
            <tr>
              <th scope="row">Kamienie boczne</th>
              <td>jest ich dużo albo tworzą pełną obwódkę</td>
              <td>kamień główny stoi sam albo ma kilka akcentów</td>
            </tr>
            <tr>
              <th scope="row">Obrączka i oprawa</th>
              <td>pierścionek jest masywny albo bogato zdobiony</td>
              <td>obrączka jest smukła, a oprawa prosta</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="budzet">Jak zmieścić się w budżecie</h2>
      <ul>
        <li>
          <strong>Powiedz o budżecie w pierwszej rozmowie.</strong> To nie jest niezręczne pytanie, tylko najważniejsza
          informacja dla złotnika. Od niej zależy, jakie kamienie warto w ogóle oglądać.
        </li>
        <li>
          <strong>Zmień kamień, nie projekt.</strong> Ten sam wzór z innym kamieniem może kosztować zupełnie inaczej. Czym
          różnią się kamienie, opisujemy w poradniku{' '}
          <Link href={guidePath('kamienie-do-pierscionka-zareczynowego')}>jaki kamień do pierścionka zaręczynowego</Link>.
        </li>
        <li>
          <strong>Zdecyduj, co jest najważniejsze.</strong> Kolor, wielkość kamienia czy bogactwo oprawy. Rzadko wszystko
          naraz mieści się w jednej kwocie, a jedna mocna cecha wystarcza, żeby pierścionek zapadał w pamięć.
        </li>
        <li>
          <strong>Wykorzystaj to, co już masz.</strong> Złoto albo kamień po bliskiej osobie mogą stać się częścią nowego
          pierścionka. Powiedz o nich w pierwszej rozmowie.
        </li>
      </ul>

      {examples.length > 0 ? (
        <>
          <h2 id="przyklady">Przykłady cen z naszej kolekcji</h2>
          <p>
            Ceny dotyczą wersji ze zdjęć. Inny kamień, kolor złota albo rozmiar mogą je zmienić w obie strony.
          </p>
          <ul className="ring-grid guide-rings guide-rings-4">
            {examples.map((r) => (
              <RingCard
                alt={r.alt}
                detailed
                gold={r.goldLabel}
                image={r.image}
                key={r.slug}
                name={r.name}
                price={r.price}
                sizes="(max-width: 720px) 50vw, 200px"
                slug={r.slug}
                stone={r.stone}
              />
            ))}
          </ul>
          <p>
            <Link className="tl" href={catalogHref({ stone: 'all', gold: 'all', page: 1, sort: 'cena-rosnaco' })}>
              Zobacz całą kolekcję od najniższej ceny
            </Link>
          </p>
        </>
      ) : null}

      <h2 id="wycena">Jak wygląda wycena i płatność</h2>
      <ol>
        <li>
          <strong>Rozmowa.</strong> W pracowni albo przez telefon. Mówisz, dla kogo jest pierścionek, na jaką okazję i jaki
          masz budżet.
        </li>
        <li>
          <strong>Projekt i wycena.</strong> Dobieramy kamień, kolor złota i proporcje. Dostajesz wycenę do akceptacji.
        </li>
        <li>
          <strong>Zaliczka.</strong> Po akceptacji wpłacasz 30% ceny, BLIK-iem albo przelewem, i wtedy zaczynamy pracę.
        </li>
        <li>
          <strong>Odbiór.</strong> Resztę rozliczamy przy odbiorze w pracowni albo przed wysyłką kurierem. Od rozmowy do
          odbioru mija zwykle 4–6 tygodni.
        </li>
      </ol>
      <p>
        Cały przebieg, także dla osób spoza Buska-Zdroju, opisujemy na stronie{' '}
        <Link href="/na-zamowienie">Pierścionek na zamówienie</Link>.
      </p>

      <h2 id="pytania">Częste pytania</h2>
      <dl className="guide-faq">
        {FAQ_BASE.map((item) => (
          <div key={item.q}>
            <dt>{item.q}</dt>
            <dd>{item.text}</dd>
          </div>
        ))}
      </dl>
    </GuideLayout>
  )
}
