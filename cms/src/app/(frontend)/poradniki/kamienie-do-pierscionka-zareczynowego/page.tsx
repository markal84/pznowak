import type { Metadata } from 'next'
import Link from 'next/link'
import GuideLayout from '@/components/site/GuideLayout'
import RingCard from '@/components/site/RingCard'
import { getProducts } from '@/lib/collection'
import { catalogHref, formatStone, mainStoneOf, ringsWithMainStone, toCatalogRing, type StoneGroup } from '@/lib/catalog'
import { findGuide, guidePath } from '@/lib/guides'
import { pageMetadata } from '@/lib/seo'
import { variantImageAlt } from '@/lib/stone-variants'

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
  daily: 'Bardzo dobry' | 'Dobry' | 'Dobry w ochronnej oprawie'
  /** Kamień główny w kartach katalogu, które pokazujemy jako przykłady. */
  match: RegExp
  /**
   * Gdy kamień ma mało pierścionków jako kamień główny, uzupełniamy przykłady kartami, które oferują go jako wariant
   * kamienia (`?kamien=…`); wzorzec dotyczy nazwy kamienia wariantu.
   */
  variantMatch?: RegExp
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
      'Szafir to klasyka pierścionka zaręczynowego od pokoleń. Niebieski kolor kojarzy się z wiernością i spokojem, a jego głęboki odcień pięknie wygląda zarówno w żółtym, jak i w białym złocie.',
      'Jest odmianą korundu, drugiego po diamencie najtwardszego kamienia jubilerskiego, więc można go nosić codziennie bez obaw, także przy pracy rękami. Najbardziej znany jest niebieski, od chabrowego po głęboki granat, ale szafiry bywają też różowe, żółte i zielone.',
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
      'Rubin to kamień miłości i namiętności: wyraźna, ciepła czerwień, której nie pomylisz z żadnym innym kamieniem. Wybierają go osoby, które chcą, żeby pierścionek był widoczny i miał charakter.',
      'Jest czerwoną odmianą tego samego minerału co szafir, więc tak samo dobrze znosi codzienne noszenie. W żółtym złocie jego czerwień staje się cieplejsza, a w białym chłodniejsza i bardziej wyrazista.',
    ],
  },
  {
    id: 'szmaragd',
    name: 'Szmaragd',
    mohs: '7,5–8',
    colors: 'Zielony',
    daily: 'Dobry w ochronnej oprawie',
    match: /^szmaragd/,
    filter: 'zielone',
    filterLabel: 'pierścionki z zielonymi kamieniami',
    text: [
      'Szmaragd zachwyca zielenią, jakiej nie ma żaden inny kamień: głęboką, soczystą i żywą. Od wieków jest symbolem nadziei i wierności, a w pierścionku zaręczynowym wygląda szlachetnie i nieoczywiście.',
      'Naturalne szmaragdy mają w środku delikatne wrostki, które jubilerzy nazywają „ogrodem”. To znak naturalnego pochodzenia i część charakteru kamienia, dzięki której każdy szmaragd jest jedyny w swoim rodzaju. Dobieramy dla niego oprawę, która dobrze go trzyma i osłania, a o tym, jak o niego dbać, piszemy na końcu poradnika.',
    ],
  },
  {
    id: 'tanzanit',
    name: 'Tanzanit',
    mohs: '6–7',
    colors: 'Niebieskofioletowy, zmienia odcień zależnie od światła',
    daily: 'Dobry w ochronnej oprawie',
    match: /^tanzanit/,
    filter: 'niebieskie',
    filterLabel: 'pierścionki z niebieskimi kamieniami',
    text: [
      'Tanzanit ma jeden z najpiękniejszych odcieni wśród kamieni: aksamitny niebieskofiolet, który zmienia się zależnie od światła i kąta patrzenia. Wydobywa się go tylko w jednym miejscu na świecie, w północnej Tanzanii, u stóp Kilimandżaro.',
      'To wybór dla osób, które szukają koloru nieoczywistego i rzadko spotykanego. Jest delikatniejszy od szafiru, dlatego oprawiamy go tak, żeby był dobrze chroniony i służył latami.',
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
      'Topaz daje dużo koloru i blasku w rozsądnej cenie, także w dużych rozmiarach, więc pozwala na okazały kamień bez wielkiego budżetu. Odmiana London Blue ma głęboki, lekko stalowy odcień niebieskiego, a jasny, błękitny topaz kojarzy się ze świeżością i lekkością.',
      'Jest twardy i odporny na zarysowania, dlatego dobrze sprawdza się w codziennym noszeniu.',
    ],
  },
  {
    id: 'oliwin',
    name: 'Oliwin',
    mohs: '6,5–7',
    colors: 'Żółtozielony, soczysta zieleń, oliwkowy',
    daily: 'Dobry w ochronnej oprawie',
    match: /^oliwin/,
    variantMatch: /^oliwin/,
    filter: 'zielone',
    filterLabel: 'pierścionki z zielonymi kamieniami',
    text: [
      'Oliwin, nazywany też perydotem, ma świeżą, żółtawozieloną barwę, od soczystej zieleni po oliwkę. Kolor daje mu żelazo zawarte w kamieniu, dlatego jest stały i nie zależy od światła. To zieleń lżejsza i bardziej słoneczna niż szmaragdu, a przy tym wyraźnie szlachetna.',
      'Jest trochę miększy od szafiru i szmaragdu, dlatego oprawiamy go tak, żeby był dobrze osłonięty, a przy cięższych pracach pierścionek warto zdjąć. Dobrze wygląda w żółtym złocie, w którym jego zieleń robi się cieplejsza, a z diamentami zyskuje dodatkowy blask.',
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
      'Ametyst ma królewski fiolet, a cytryn ciepłą barwę miodu i słońca. Oba są odmianami kwarcu i dają dużo koloru oraz sporą wielkość kamienia przy przystępnej cenie, dlatego dobrze sprawdzają się, gdy najważniejszy jest ulubiony kolor i efekt.',
      'Ametyst od dawna uchodzi za kamień spokoju i równowagi, a cytryn za kamień radości. Ich twardość wystarcza do codziennego noszenia.',
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
      'Turmalin występuje w wyjątkowo wielu barwach, od malinowej po oliwkową, więc łatwo znaleźć odcień dopasowany do osoby. Morganit, krewny szmaragdu, ma delikatny, pudrowy róż, który romantycznie wygląda w żółtym złocie.',
      'Oba kamienie dobrze nadają się do codziennego noszenia i dają dużo koloru za rozsądną cenę.',
    ],
  },
]

/** Środek przedziału twardości z zapisu „7,5–8”; do ułożenia tabeli od najtwardszego do najbardziej miękkiego kamienia. */
const mohsMidpoint = (mohs: string) => {
  const values = mohs.split('–').map((part) => Number(part.replace(',', '.')))
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const STONES_BY_HARDNESS = [...STONES].sort((a, b) => mohsMidpoint(b.mohs) - mohsMidpoint(a.mohs))

const SECTIONS = [
  { id: 'krotko', label: 'Krótka odpowiedź' },
  { id: 'twardosc', label: 'Twardość, czyli odporność na rysy' },
  { id: 'porownanie', label: 'Porównanie kamieni' },
  ...STONES.map((s) => ({ id: s.id, label: s.name })),
  { id: 'jak-wybrac', label: 'Jak wybrać' },
  { id: 'pielegnacja', label: 'Jak dbać o kamienie i pierścionki' },
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
    text: 'Tak. Szmaragd ma twardość 7,5–8 w skali Mohsa i w dobrze dobranej oprawie służy latami. Wystarczy zdejmować go do sprzątania, sportu i cięższych prac, tak jak każdy pierścionek z kolorowym kamieniem.',
  },
  {
    q: 'Jak wyczyścić pierścionek z kamieniem w domu?',
    text: 'Ciepłą wodą z kroplą płynu do naczyń i miękką szczoteczką, delikatnie także od spodu kamienia. Potem opłucz i osusz miękką ściereczką. Szmaragdu, tanzanitu i oliwinu nie mocz długo i nie czyść w myjce ultradźwiękowej.',
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
      lead="Najtwardsze i najodporniejsze są diament, szafir i rubin. Szmaragd, tanzanit i inne kolorowe kamienie zachwycają barwą, a w dobrze dobranej oprawie też służą latami. Poniżej porównanie, przykłady z naszej pracowni i rady, jak dbać o pierścionek."
      sections={SECTIONS}
    >
      <h2 id="krotko">Krótka odpowiedź</h2>
      <p>
        Pierścionek zaręczynowy nosi się codziennie, więc kamień powinien łączyć dwie rzeczy: kolor, który podoba się osobie
        obdarowanej, i odporność na zwykłe życie. <strong>Diament, szafir i rubin</strong> są najtwardsze i najlepiej znoszą
        codzienne noszenie. <strong>Szmaragd, tanzanit i kamienie o twardości około 7</strong> dają piękne, nasycone
        kolory, a w dobrze dobranej oprawie też służą latami. Jak dbać o każdy z nich, piszemy{' '}
        <a href="#pielegnacja">na końcu poradnika</a>.
      </p>

      <h2 id="twardosc">Twardość, czyli odporność na rysy</h2>
      <p>
        Twardość kamieni podaje się w skali Mohsa, od 1 do 10. Mówi ona, jak łatwo kamień zarysować. Granicą wartą
        zapamiętania jest <strong>7</strong>: taką twardość ma kwarc, obecny w zwykłym kurzu. Kamienie twardsze od kwarcu
        prawie się od niego nie rysują, a miększe z latami matowieją na krawędziach.
      </p>
      <p>
        Twardość to nie wszystko. Kamień może być twardy, a mimo to pęknąć od mocnego uderzenia, jak szmaragd albo topaz.
        Dlatego obok tabeli opisujemy każdy kamień osobno, a na końcu podpowiadamy, jak o niego dbać.
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
            {STONES_BY_HARDNESS.map((s) => (
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
        const direct = ringsWithMainStone(products, s.match, 3).map((p) => ({ ...toCatalogRing(p), href: undefined as string | undefined }))
        const variants = s.variantMatch
          ? products
              .filter((p) => !direct.some((r) => r.slug === p.slug))
              .flatMap((p) =>
                p.stoneVariants
                  .filter((v) => s.variantMatch?.test(mainStoneOf(v.stone)))
                  .slice(0, 1)
                  .map((v) => ({
                    slug: p.slug,
                    name: p.name,
                    stone: formatStone(v.stone),
                    image: v.image,
                    alt: variantImageAlt(`Pierścionek ${p.name}`, v),
                    href: `/pierscionki/${p.slug}?kamien=${v.slug}`,
                  })),
              )
          : []
        const examples = [...direct, ...variants].slice(0, 3)
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
                      href={r.href}
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


      <h2 id="pielegnacja">Jak dbać o kamienie i pierścionki</h2>
      <p>
        Każdy pierścionek, nawet z diamentem, posłuży dłużej, jeśli pamiętasz o kilku prostych zasadach. Przy kamieniach
        kolorowych mają one większe znaczenie, dlatego przy każdej zasadzie piszemy, których kamieni dotyczy najbardziej.
      </p>
      <h3>Kiedy zdejmować pierścionek</h3>
      <ul>
        <li>Do sprzątania ze środkami czystości, pracy w ogrodzie, remontu i sportu, zwłaszcza na siłowni.</li>
        <li>Na basen i do sauny, bo chlor i wysoka temperatura nie służą ani kamieniom, ani złotu.</li>
        <li>Na noc. Krem, balsam i perfumy nałóż przed założeniem pierścionka, a nie po.</li>
      </ul>
      <h3>Kamienie, które lubią trochę więcej ostrożności</h3>
      <ul>
        <li>
          <strong>Szmaragd.</strong> Naturalne wrostki sprawiają, że gorzej znosi mocne uderzenia i gwałtowne zmiany
          temperatury. Nie czyść go w myjce ultradźwiękowej ani parą i nie zostawiaj w gorącej wodzie.
        </li>
        <li>
          <strong>Tanzanit.</strong> Jest miększy od szafiru, więc z czasem może łapać drobne rysy. Chroń go przed
          uderzeniami i nagłą zmianą temperatury, a do czyszczenia używaj tylko wody z płynem.
        </li>
        <li>
          <strong>Oliwin.</strong> Jest delikatniejszy od szafiru i może łapać drobne rysy, a mocne uderzenie albo nagła
          zmiana temperatury mu nie służą. Czyść go wodą z płynem, bez myjki ultradźwiękowej i bez kwasów.
        </li>
        <li>
          <strong>Topaz.</strong> Przy silnym, punktowym uderzeniu może pęknąć wzdłuż płaszczyzny kryształu. W zwykłym
          noszeniu rzadko ma to znaczenie, ale do cięższych prac lepiej go zdjąć.
        </li>
        <li>
          <strong>Ametyst i cytryn.</strong> Po latach na krawędziach szlifu mogą pojawić się drobne przetarcia. Kamień
          można wtedy przeszlifować i przywrócić mu blask.
        </li>
        <li>
          <strong>Morganit i jasne kamienie.</strong> Szybciej pokazują zabrudzenia od kremu i mydła, więc warto czyścić je
          częściej.
        </li>
      </ul>
      <h3>Czyszczenie w domu</h3>
      <ol>
        <li>Przygotuj miskę ciepłej, nie gorącej wody z kroplą płynu do naczyń.</li>
        <li>Miękką szczoteczką do zębów delikatnie oczyść kamień, także od spodu, gdzie zbiera się najwięcej brudu.</li>
        <li>Opłucz pod bieżącą wodą (zatkaj odpływ) i osusz miękką, niepylącą ściereczką.</li>
      </ol>
      <p>
        Diament, szafir i rubin możesz krótko namoczyć. Szmaragd, tanzanit i oliwin tylko przetrzyj, bez moczenia. Nie
        używaj pasty do zębów, sody ani środków z chlorem, bo rysują złoto i matowią kamienie.
      </p>
      <h3>Przechowywanie</h3>
      <p>
        Trzymaj pierścionek osobno, w miękkim woreczku albo przegródce szkatułki. Diament i szafir są tak twarde, że mogą
        zarysować inne kamienie i złoto, jeśli biżuteria leży razem.
      </p>
      <h3>Przegląd w pracowni</h3>
      <p>
        Raz w roku warto pokazać pierścionek złotnikowi. Sprawdzimy, czy kamienie dobrze siedzą w oprawie, w razie potrzeby
        dociśniemy łapki, a pierścionek wyczyścimy i wypolerujemy. Więcej o tym na stronie{' '}
        <Link href="/naprawy">Naprawy i przeróbki</Link>.
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
