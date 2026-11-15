import type { Metadata } from 'next'
import Link from 'next/link'
import GuideLayout from '@/components/site/GuideLayout'
import RingCard from '@/components/site/RingCard'
import { getProducts } from '@/lib/collection'
import { catalogHref, ringsWithMainStone, toCatalogRing, type StoneGroup } from '@/lib/catalog'
import { findGuide, guidePath } from '@/lib/guides'
import { pageMetadata } from '@/lib/seo'

export const dynamic = 'force-dynamic'

const guide = findGuide('kamienie-do-pierscionka-zareczynowego')

export const metadata: Metadata = pageMetadata({
  title: guide.title,
  description: guide.description,
  path: guidePath(guide.slug),
})

type Stone = {
  id: string
  name: string
  /** Twardość w skali Mohsa (dane mineralogiczne). */
  mohs: string
  colors: string
  daily: 'Bardzo dobry' | 'Dobry' | 'Wymaga uwagi'
  /** Kamień główny w kartach katalogu, które pokazujemy jako przykłady. */
  match: RegExp
  /** Filtr koloru w katalogu, do którego prowadzi link pod przykładami. */
  filter: StoneGroup
  filterLabel: string
  text: string[]
}

const STONES: Stone[] = [
  {
    id: 'diament',
    name: 'Diament',
    mohs: '10',
    colors: 'Bezbarwny, rzadziej żółty, niebieski, różowy',
    daily: 'Bardzo dobry',
    match: /^diament/,
    filter: 'bezbarwne',
    filterLabel: 'pierścionki z bezbarwnymi kamieniami',
    text: [
      'Najtwardszy znany minerał: w codziennym noszeniu praktycznie się nie rysuje, dlatego od lat jest pierwszym wyborem do pierścionka zaręczynowego. Bezbarwny diament pasuje do każdego koloru złota i do każdej innej biżuterii.',
      'O cenie decydują cztery cechy: masa w karatach, barwa, czystość i szlif. Małe diamenty często towarzyszą kolorowemu kamieniowi głównemu jako kamienie boczne albo obwódka, która go rozświetla.',
    ],
  },
  {
    id: 'szafir',
    name: 'Szafir',
    mohs: '9',
    colors: 'Niebieski, a także różowy, żółty, zielony i bezbarwny',
    daily: 'Bardzo dobry',
    match: /^szafir/,
    filter: 'niebieskie',
    filterLabel: 'pierścionki z niebieskimi kamieniami',
    text: [
      'Szafir to odmiana korundu, drugiego po diamencie najtwardszego kamienia jubilerskiego. Dobrze znosi codzienne noszenie, także przy pracy rękami.',
      'Najbardziej znany jest niebieski, od jasnego, chabrowego, po głęboki granat. Ten sam minerał występuje też w innych barwach, więc szafir nie musi być niebieski.',
    ],
  },
  {
    id: 'rubin',
    name: 'Rubin',
    mohs: '9',
    colors: 'Czerwony, od różowawego po ciemną czerwień',
    daily: 'Bardzo dobry',
    match: /^rubin/,
    filter: 'rozowe',
    filterLabel: 'pierścionki z czerwonymi i różowymi kamieniami',
    text: [
      'Rubin to czerwona odmiana tego samego minerału co szafir, więc jest równie twardy i odporny. Wybierają go osoby, które chcą koloru wyraźnego i ciepłego.',
      'Czerwień rubinu dobrze wygląda w żółtym złocie, które podbija jej ciepło, i w białym, które ją chłodzi i wyostrza.',
    ],
  },
  {
    id: 'szmaragd',
    name: 'Szmaragd',
    mohs: '7,5–8',
    colors: 'Zielony',
    daily: 'Wymaga uwagi',
    match: /^szmaragd/,
    filter: 'zielone',
    filterLabel: 'pierścionki z zielonymi kamieniami',
    text: [
      'Szmaragd jest twardy, ale kruchy. Niemal każdy naturalny szmaragd ma wewnątrz drobne wrostki, które są jego znakiem rozpoznawczym, a jednocześnie sprawiają, że gorzej znosi mocne uderzenia i gwałtowne zmiany temperatury.',
      'To nie przeszkoda, tylko wskazówka: pierścionek ze szmaragdem warto zdejmować do sprzątania, sportu i pracy w ogrodzie, a oprawę dobrać tak, żeby osłaniała krawędzie kamienia.',
    ],
  },
  {
    id: 'tanzanit',
    name: 'Tanzanit',
    mohs: '6–7',
    colors: 'Niebieskofioletowy, zmienia odcień zależnie od światła',
    daily: 'Wymaga uwagi',
    match: /^tanzanit/,
    filter: 'niebieskie',
    filterLabel: 'pierścionki z niebieskimi kamieniami',
    text: [
      'Tanzanit wydobywa się tylko w jednym rejonie świata, w północnej Tanzanii. Jego barwa przechodzi z niebieskiej w fioletową, gdy ogląda się kamień pod innym kątem albo w innym świetle.',
      'Jest miększy od szafiru, więc z czasem może łapać drobne rysy. Sprawdza się w oprawie, która chroni kamień, i u osoby, która zdejmuje pierścionek do cięższych prac.',
    ],
  },
  {
    id: 'topaz',
    name: 'Topaz',
    mohs: '8',
    colors: 'Niebieski (także głęboki London Blue), bezbarwny, żółty',
    daily: 'Dobry',
    match: /^topaz/,
    filter: 'niebieskie',
    filterLabel: 'pierścionki z niebieskimi kamieniami',
    text: [
      'Topaz jest twardy i odporny na zarysowania, a przy tym dostępny w dużych rozmiarach, więc pozwala na okazały kamień w rozsądnej cenie. Odmiana London Blue ma głęboki, lekko stalowy odcień niebieskiego.',
      'Ma jedną słabość: przy silnym, punktowym uderzeniu może pęknąć wzdłuż płaszczyzny kryształu. W zwykłym noszeniu rzadko ma to znaczenie.',
    ],
  },
  {
    id: 'ametyst-cytryn',
    name: 'Ametyst i cytryn',
    mohs: '7',
    colors: 'Fioletowy (ametyst), żółty do miodowego (cytryn)',
    daily: 'Dobry',
    match: /^(ametyst|cytryn)/,
    filter: 'fioletowe',
    filterLabel: 'pierścionki z fioletowymi kamieniami',
    text: [
      'Oba kamienie to odmiany kwarcu. Dają dużo koloru i sporą wielkość przy przystępnej cenie, dlatego dobrze sprawdzają się, gdy ważniejszy jest efekt niż rzadkość kamienia.',
      'Twardość 7 wystarcza na co dzień, choć po latach na krawędziach szlifu mogą pojawić się drobne przetarcia. Kamień można wtedy przeszlifować albo wymienić.',
    ],
  },
  {
    id: 'turmalin-morganit',
    name: 'Turmalin i morganit',
    mohs: '7–8',
    colors: 'Różowy, malinowy, zielony (turmalin), brzoskwinioworóżowy (morganit)',
    daily: 'Dobry',
    match: /^(turmalin|morganit)/,
    filter: 'rozowe',
    filterLabel: 'pierścionki z czerwonymi i różowymi kamieniami',
    text: [
      'Turmalin występuje w wyjątkowo wielu barwach, od malinowej po oliwkową. Morganit, krewny szmaragdu, ma delikatny, pudrowy róż, który dobrze łączy się z żółtym złotem.',
      'Oba nadają się do codziennego noszenia. Jasny morganit szybciej pokazuje zabrudzenia od kremu i mydła, więc warto go regularnie czyścić.',
    ],
  },
]

const SECTIONS = [
  { id: 'krotko', label: 'Krótka odpowiedź' },
  { id: 'twardosc', label: 'Twardość, czyli odporność na rysy' },
  { id: 'porownanie', label: 'Porównanie kamieni' },
  ...STONES.map((s) => ({ id: s.id, label: s.name })),
  { id: 'jak-wybrac', label: 'Jak wybrać' },
  { id: 'pytania', label: 'Częste pytania' },
]

const FAQ = [
  {
    q: 'Jaki kamień jest najtrwalszy w pierścionku zaręczynowym?',
    text: 'Diament, który ma twardość 10 w skali Mohsa. Tuż za nim są szafir i rubin z twardością 9. Te trzy kamienie najlepiej znoszą noszenie na co dzień przez wiele lat.',
  },
  {
    q: 'Czy pierścionek zaręczynowy musi mieć diament?',
    text: 'Nie. Szafir, rubin czy szmaragd są używane w pierścionkach zaręczynowych od dawna. Kolorowy kamień pozwala dobrać pierścionek do osoby, a przy tym samym budżecie często daje większy kamień.',
  },
  {
    q: 'Czy szmaragd nadaje się na co dzień?',
    text: 'Tak, jeśli pamięta się o jego kruchości. Pierścionek ze szmaragdem warto zdejmować do sprzątania, sportu i cięższych prac, a oprawa powinna osłaniać krawędzie kamienia.',
  },
  {
    q: 'Czy w projekcie z kolekcji można zmienić kamień?',
    text: 'Tak. Każdy projekt z naszej kolekcji wykonamy z innym kamieniem i w innym kolorze złota. Do pierścionka z kamieniami naturalnymi dołączamy certyfikat.',
  },
]

export default async function StonesGuidePage() {
  const products = await getProducts()
  return (
    <GuideLayout
      faq={FAQ}
      guide={guide}
      lead="Do noszenia na co dzień najlepiej nadają się diament, szafir i rubin. Szmaragd i tanzanit są delikatniejsze, ale dobrze oprawione też służą latami. Poniżej porównanie i przykłady z naszej pracowni."
      sections={SECTIONS}
    >
      <h2 id="krotko">Krótka odpowiedź</h2>
      <p>
        Pierścionek zaręczynowy nosi się codziennie, więc kamień powinien łączyć dwie rzeczy: kolor, który podoba się osobie
        obdarowanej, i odporność na zwykłe życie. <strong>Diament, szafir i rubin</strong> wybaczają najwięcej.{' '}
        <strong>Szmaragd, tanzanit i kamienie o twardości około 7</strong> wymagają trochę więcej uwagi i dobrze dobranej
        oprawy.
      </p>

      <h2 id="twardosc">Twardość, czyli odporność na rysy</h2>
      <p>
        Twardość kamieni podaje się w skali Mohsa, od 1 do 10. Mówi ona, jak łatwo kamień zarysować. Granicą wartą
        zapamiętania jest <strong>7</strong>: taką twardość ma kwarc, obecny w zwykłym kurzu. Kamienie twardsze od kwarcu
        prawie się od niego nie rysują, a miększe z latami matowieją na krawędziach.
      </p>
      <p>
        Twardość to nie wszystko. Kamień może być twardy, a mimo to pęknąć od mocnego uderzenia, jak szmaragd albo topaz.
        Dlatego obok tabeli opisujemy każdy kamień osobno.
      </p>

      <h2 id="porownanie">Porównanie kamieni</h2>
      <div className="guide-table-wrap">
        <table className="guide-table">
          <caption className="sr-only">Kamienie do pierścionka zaręczynowego: twardość, kolory, noszenie na co dzień</caption>
          <thead>
            <tr>
              <th scope="col">Kamień</th>
              <th scope="col">Twardość (Mohs)</th>
              <th scope="col">Kolory</th>
              <th scope="col">Na co dzień</th>
            </tr>
          </thead>
          <tbody>
            {STONES.map((s) => (
              <tr key={s.id}>
                <th scope="row">
                  <a href={`#${s.id}`}>{s.name}</a>
                </th>
                <td>{s.mohs}</td>
                <td>{s.colors}</td>
                <td>{s.daily}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {STONES.map((s) => {
        const examples = ringsWithMainStone(products, s.match, 3).map(toCatalogRing)
        return (
          <section aria-labelledby={s.id} className="guide-stone" key={s.id}>
            <h2 id={s.id}>{s.name}</h2>
            <p className="guide-stone-facts">
              Twardość {s.mohs} · {s.colors}
            </p>
            {s.text.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {examples.length > 0 ? (
              <>
                <h3>Z naszej pracowni</h3>
                <ul className="ring-grid guide-rings">
                  {examples.map((r) => (
                    <RingCard
                      alt={r.alt}
                      image={r.image}
                      key={r.slug}
                      name={r.name}
                      sizes="(max-width: 720px) 50vw, 240px"
                      slug={r.slug}
                      stone={r.stone}
                    />
                  ))}
                </ul>
              </>
            ) : null}
            <p>
              <Link className="tl" href={catalogHref({ stone: s.filter, gold: 'all', page: 1 })}>
                Zobacz {s.filterLabel}
              </Link>
            </p>
          </section>
        )
      })}

      <h2 id="jak-wybrac">Jak wybrać kamień</h2>
      <ol>
        <li>
          <strong>Zacznij od osoby.</strong> Jakie kolory nosi, czy lubi biżuterię wyraźną, czy drobną. Kamień w ulubionym
          kolorze ucieszy bardziej niż kamień „właściwy”.
        </li>
        <li>
          <strong>Pomyśl, jak będzie noszony.</strong> Praca rękami, sport i małe dzieci przemawiają za diamentem, szafirem
          albo rubinem. Przy spokojniejszym trybie życia wybór jest szerszy.
        </li>
        <li>
          <strong>Ustal budżet przed kamieniem.</strong> Ten sam projekt z innym kamieniem może kosztować zupełnie inaczej.
          Więcej o tym w poradniku{' '}
          <Link href={guidePath('ile-kosztuje-pierscionek-na-zamowienie')}>ile kosztuje pierścionek na zamówienie</Link>.
        </li>
      </ol>
      <p className="guide-note">
        Kamień w każdym projekcie z <Link href="/pierscionki">naszej kolekcji</Link> możemy zmienić. Kamienie pokazujemy na
        żywo w pracowni, a gdy zamawiasz z daleka, na zdjęciach i filmach.
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
