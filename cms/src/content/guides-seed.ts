import type { GuideDocument, GuideStoneBlock } from '../lib/guide-types'
import { block, doc, h3, ol, p, paragraphs, ul } from './lexical-build'

/**
 * Treść poradników sprzed przeniesienia do Payload, słowo w słowo (stan z 20.11.2026). Służy do jednorazowego
 * wpisania poradników do panelu (`npm run tresci:przenies`) i jako zapas, gdy baza nie ma jeszcze poradników.
 * Po przeniesieniu poprawki robi się w panelu (Strona → Poradniki), nie tutaj.
 */

const stone = (s: Omit<GuideStoneBlock, 'blockType' | 'text'> & { text: string[] }): GuideStoneBlock => ({
  blockType: 'stone',
  ...s,
  text: paragraphs(...s.text),
})

const sizeGuide: GuideDocument = {
  slug: 'jak-sprawdzic-rozmiar-pierscionka',
  title: 'Jak sprawdzić rozmiar pierścionka, także gdy to niespodzianka',
  short: 'Jak sprawdzić rozmiar pierścionka',
  description:
    'Trzy sposoby na poznanie rozmiaru pierścionka, kalkulator rozmiarów i tabela: rozmiar polski, obwód, średnica, rozmiar amerykański.',
  metaTitle: null,
  topic: 'Rozmiar',
  published: '2026-11-15',
  updated: '2026-11-15',
  minutes: 6,
  order: 1,
  lead: 'Rozmiar najłatwiej odczytać z pierścionka, który ta osoba już nosi na tym samym palcu. Wystarczy linijka. Poniżej trzy sposoby, kalkulator i tabela rozmiarów.',
  layout: [
    {
      blockType: 'section',
      heading: 'Krótka odpowiedź',
      anchor: 'krotko',
      content: doc(
        p(
          'Polski rozmiar pierścionka to **obwód wewnętrzny w milimetrach pomniejszony o 40**. Pierścionek o obwodzie wewnętrznym 52 mm ma rozmiar 12, a o obwodzie 54 mm rozmiar 14. Żeby go poznać, potrzebujesz jednej z dwóch liczb: średnicy wewnętrznej pierścionka, który pasuje, albo obwodu palca.',
        ),
        block('ringSizeFigure', { figcaption: 'Liczy się wnętrze pierścionka, bez grubości metalu.' }),
      ),
    },
    {
      blockType: 'section',
      heading: 'Sposób 1: z pierścionka, który już nosi',
      anchor: 'z-pierscionka',
      tocLabel: 'Z pierścionka, który już nosi',
      content: doc(
        p('To najpewniejsza metoda w domu i jedyna, która działa bez wiedzy drugiej osoby.'),
        ol(
          'Wybierz pierścionek noszony na **tym samym palcu tej samej ręki**, na którym ma być nowy. Palce obu rąk różnią się, czasem o cały rozmiar.',
          'Połóż go płasko na linijce i zmierz wnętrze w najszerszym miejscu, od krawędzi do krawędzi. Zapisz wynik w milimetrach.',
          'Wpisz średnicę do [kalkulatora](#kalkulator) albo znajdź ją w [tabeli](#tabela).',
        ),
        p(
          'Jeśli nie masz linijki z podziałką milimetrową, połóż pierścionek na kartce i **odrysuj jego wnętrze** cienko zaostrzonym ołówkiem. Taki rysunek możesz zmierzyć później albo pokazać złotnikowi. Możesz też pokazać sam pierścionek nam w pracowni albo jubilerowi w swojej okolicy: odczyta rozmiar na miarce w kilka sekund.',
        ),
      ),
    },
    {
      blockType: 'section',
      heading: 'Sposób 2: z obwodu palca',
      anchor: 'z-palca',
      tocLabel: 'Z obwodu palca',
      content: doc(
        p('Przydaje się, gdy nie ma pierścionka do porównania, a osoba, która będzie go nosić, wie o pomiarze.'),
        ol(
          'Utnij pasek papieru o szerokości około 5 mm.',
          'Owiń go wokół palca tam, gdzie ma leżeć pierścionek. Pasek ma przylegać, ale nie uciskać.',
          'Zaznacz miejsce, w którym koniec paska spotyka się z resztą, rozwiń pasek i zmierz długość do znaku.',
          'Sprawdź, czy tak ustawiony pasek przejdzie przez staw palca. Jeśli nie, zmierz obwód w stawie i wybierz wartość pośrednią.',
        ),
        p('Nitka i sznurek rozciągają się i dają zawyżony wynik, dlatego lepszy jest papier. Pomiar powtórz dwa, trzy razy.'),
      ),
    },
    {
      blockType: 'section',
      heading: 'Kalkulator rozmiaru pierścionka',
      anchor: 'kalkulator',
      tocLabel: 'Kalkulator rozmiaru',
      content: doc(
        p('Wpisz jedną zmierzoną wartość. Kalkulator przeliczy ją na rozmiar polski, europejski i amerykański.'),
        block('ringSizeCalculator'),
      ),
    },
    {
      blockType: 'section',
      heading: 'Tabela rozmiarów pierścionków',
      anchor: 'tabela',
      tocLabel: 'Tabela rozmiarów',
      content: doc(
        p(
          'Rozmiar europejski to sam obwód wewnętrzny w milimetrach (rozmiar polski 12 to europejski 52). Rozmiar amerykański podajemy w przybliżeniu, bo skale nie pokrywają się dokładnie.',
        ),
        block('ringSizeTable', { caption: 'Rozmiary pierścionków: polski, obwód, średnica, amerykański' }),
      ),
    },
    {
      blockType: 'section',
      heading: 'Co zmienia wynik pomiaru',
      anchor: 'bledy',
      tocLabel: 'Co zmienia wynik',
      content: doc(
        ul(
          '**Pora dnia i temperatura.** Palce są szczuplejsze rano i na zimnie, a grubsze wieczorem i w upale. Najlepiej mierzyć po południu, w temperaturze pokojowej.',
          '**Szerokość obrączki.** Szeroki pierścionek leży ciaśniej niż wąski w tym samym rozmiarze. Jeśli wzór jest szeroki, powiedz o tym przy zamówieniu.',
          '**Staw palca.** Pierścionek musi przejść przez staw, a potem nie obracać się u nasady palca. Gdy staw jest wyraźnie szerszy, rozmiar dobiera się pod niego.',
          '**Ręka.** Palce ręki, którą częściej pracujesz, bywają grubsze. Mierz tę rękę, na której pierścionek będzie noszony.',
        ),
      ),
    },
    {
      blockType: 'section',
      heading: 'Gdy to ma być niespodzianka',
      anchor: 'niespodzianka',
      tocLabel: 'Gdy to niespodzianka',
      content: doc(
        p(
          'Weź na chwilę pierścionek, który ta osoba nosi na palcu serdecznym, i zmierz jego wnętrze albo odrysuj je na kartce. Jeśli nosi pierścionki tylko na innych palcach, też się przydadzą: powiedz złotnikowi, z którego palca pochodzi pomiar. Pomóc może też ktoś z rodziny albo przyjaciółka, która zna rozmiar albo może o niego zapytać bez wzbudzania podejrzeń.',
        ),
        block('note', {
          text: doc(
            p(
              'Nie musisz trafić co do milimetra. **Rozmiar można poprawić po zaręczynach**, więc przy niespodziance wystarczy rozmiar przybliżony.',
            ),
          ),
        }),
        p(
          'Zamawiasz z daleka? Rozmiar zmierzy każdy jubiler w Twojej okolicy, a nam wystarczy liczba. Jak wygląda całe zamówienie bez przyjazdu do Buska-Zdroju, opisujemy na stronie [Pierścionek na zamówienie](/na-zamowienie). Każdy projekt z [naszej kolekcji pierścionków](/pierscionki) wykonujemy w Twoim rozmiarze.',
        ),
      ),
    },
  ],
  faq: [
    {
      question: 'Co oznacza polski rozmiar pierścionka?',
      answer:
        'Polski rozmiar to obwód wewnętrzny pierścionka w milimetrach pomniejszony o 40. Rozmiar 12 ma obwód wewnętrzny 52 mm i średnicę wewnętrzną około 16,6 mm.',
    },
    {
      question: 'Jak zmierzyć rozmiar pierścionka w domu?',
      answer:
        'Najpewniej z pierścionka, który dobrze leży na tym samym palcu: zmierz jego średnicę wewnętrzną w milimetrach i odczytaj rozmiar z tabeli albo z kalkulatora. Drugi sposób to pasek papieru owinięty wokół palca: jego długość do miejsca styku to obwód.',
    },
    {
      question: 'Co zrobić, jeśli wynik wypada między dwoma rozmiarami?',
      answer:
        'Przy wąskiej obrączce zwykle lepiej sprawdza się mniejszy rozmiar, przy szerokiej większy. Ostatecznie rozmiar potwierdza złotnik albo jubiler, który mierzy palec miarką.',
    },
    {
      question: 'Czy rozmiar pierścionka można poprawić po zaręczynach?',
      answer: 'Tak, rozmiar można poprawić po zaręczynach. Dlatego przy niespodziance wystarczy rozmiar przybliżony.',
    },
  ],
}

const stonesGuide: GuideDocument = {
  slug: 'kamienie-do-pierscionka-zareczynowego',
  title: 'Jaki kamień do pierścionka zaręczynowego? Szafir, rubin, szmaragd i inne',
  short: 'Jaki kamień do pierścionka zaręczynowego',
  description:
    'Diament, szafir, rubin, szmaragd, tanzanit, topaz, oliwin: kolory, twardość i jak dbać o kamień na co dzień. Z przykładami pierścionków z pracowni.',
  metaTitle: null,
  topic: 'Kamienie',
  published: '2026-11-15',
  updated: '2026-11-17',
  minutes: 8,
  order: 2,
  lead: 'Najtwardsze i najodporniejsze są diament, szafir i rubin. Szmaragd, tanzanit i inne kolorowe kamienie zachwycają barwą, a w dobrze dobranej oprawie też służą latami. Poniżej porównanie, przykłady z naszej pracowni i rady, jak dbać o pierścionek.',
  layout: [
    {
      blockType: 'section',
      heading: 'Krótka odpowiedź',
      anchor: 'krotko',
      content: doc(
        p(
          'Pierścionek zaręczynowy nosi się codziennie, więc kamień powinien łączyć dwie rzeczy: kolor, który podoba się osobie obdarowanej, i odporność na zwykłe życie. **Diament, szafir i rubin** są najtwardsze i najlepiej znoszą codzienne noszenie. **Szmaragd, tanzanit i kamienie o twardości około 7** dają piękne, nasycone kolory, a w dobrze dobranej oprawie też służą latami. Jak dbać o każdy z nich, piszemy [na końcu poradnika](#pielegnacja).',
        ),
      ),
    },
    {
      blockType: 'section',
      heading: 'Twardość, czyli odporność na rysy',
      anchor: 'twardosc',
      content: doc(
        p(
          'Twardość kamieni podaje się w skali Mohsa, od 1 do 10. Mówi ona, jak łatwo kamień zarysować. Granicą wartą zapamiętania jest **7**: taką twardość ma kwarc, obecny w zwykłym kurzu. Kamienie twardsze od kwarcu prawie się od niego nie rysują, a miększe z latami matowieją na krawędziach.',
        ),
        p(
          'Twardość to nie wszystko. Kamień może być twardy, a mimo to pęknąć od mocnego uderzenia, jak szmaragd albo topaz. Dlatego obok tabeli opisujemy każdy kamień osobno, a na końcu podpowiadamy, jak o niego dbać.',
        ),
      ),
    },
    {
      blockType: 'section',
      heading: 'Porównanie kamieni',
      anchor: 'porownanie',
      content: doc(
        block('stoneComparison', {
          caption: 'Kamienie do pierścionka zaręczynowego: twardość, kolory, noszenie na co dzień',
        }),
      ),
    },
    stone({
      anchor: 'diament',
      name: 'Diament',
      mohs: '10',
      colors: 'Bezbarwny, rzadziej żółty, niebieski, różowy',
      daily: 'Bardzo dobry',
      catalogStones: 'diament',
      catalogFilter: 'bezbarwne',
      catalogLinkLabel: 'pierścionki z bezbarwnymi kamieniami',
      text: [
        'Najtwardszy znany minerał: w codziennym noszeniu praktycznie się nie rysuje, dlatego od lat jest pierwszym wyborem do pierścionka zaręczynowego. Bezbarwny diament pasuje do każdego koloru złota i do każdej innej biżuterii.',
        'O cenie decydują cztery cechy: masa w karatach, barwa, czystość i szlif. Małe diamenty często towarzyszą kolorowemu kamieniowi głównemu jako kamienie boczne albo obwódka, która go rozświetla.',
      ],
    }),
    stone({
      anchor: 'szafir',
      name: 'Szafir',
      mohs: '9',
      colors: 'Niebieski, a także różowy, żółty, zielony i bezbarwny',
      daily: 'Bardzo dobry',
      catalogStones: 'szafir',
      catalogFilter: 'niebieskie',
      catalogLinkLabel: 'pierścionki z niebieskimi kamieniami',
      text: [
        'Szafir to klasyka pierścionka zaręczynowego od pokoleń. Niebieski kolor kojarzy się z wiernością i spokojem, a jego głęboki odcień pięknie wygląda zarówno w żółtym, jak i w białym złocie.',
        'Jest odmianą korundu, drugiego po diamencie najtwardszego kamienia jubilerskiego, więc można go nosić codziennie bez obaw, także przy pracy rękami. Najbardziej znany jest niebieski, od chabrowego po głęboki granat, ale szafiry bywają też różowe, żółte i zielone.',
      ],
    }),
    stone({
      anchor: 'rubin',
      name: 'Rubin',
      mohs: '9',
      colors: 'Czerwony, od różowawego po ciemną czerwień',
      daily: 'Bardzo dobry',
      catalogStones: 'rubin',
      catalogFilter: 'rozowe',
      catalogLinkLabel: 'pierścionki z czerwonymi i różowymi kamieniami',
      text: [
        'Rubin to kamień miłości i namiętności: wyraźna, ciepła czerwień, której nie pomylisz z żadnym innym kamieniem. Wybierają go osoby, które chcą, żeby pierścionek był widoczny i miał charakter.',
        'Jest czerwoną odmianą tego samego minerału co szafir, więc tak samo dobrze znosi codzienne noszenie. W żółtym złocie jego czerwień staje się cieplejsza, a w białym chłodniejsza i bardziej wyrazista.',
      ],
    }),
    stone({
      anchor: 'szmaragd',
      name: 'Szmaragd',
      mohs: '7,5–8',
      colors: 'Zielony',
      daily: 'Dobry w ochronnej oprawie',
      catalogStones: 'szmaragd',
      catalogFilter: 'zielone',
      catalogLinkLabel: 'pierścionki z zielonymi kamieniami',
      text: [
        'Szmaragd zachwyca zielenią, jakiej nie ma żaden inny kamień: głęboką, soczystą i żywą. Od wieków jest symbolem nadziei i wierności, a w pierścionku zaręczynowym wygląda szlachetnie i nieoczywiście.',
        'Naturalne szmaragdy mają w środku delikatne wrostki, które jubilerzy nazywają „ogrodem”. To znak naturalnego pochodzenia i część charakteru kamienia, dzięki której każdy szmaragd jest jedyny w swoim rodzaju. Dobieramy dla niego oprawę, która dobrze go trzyma i osłania, a o tym, jak o niego dbać, piszemy na końcu poradnika.',
      ],
    }),
    stone({
      anchor: 'tanzanit',
      name: 'Tanzanit',
      mohs: '6–7',
      colors: 'Niebieskofioletowy, zmienia odcień zależnie od światła',
      daily: 'Dobry w ochronnej oprawie',
      catalogStones: 'tanzanit',
      catalogFilter: 'niebieskie',
      catalogLinkLabel: 'pierścionki z niebieskimi kamieniami',
      text: [
        'Tanzanit ma jeden z najpiękniejszych odcieni wśród kamieni: aksamitny niebieskofiolet, który zmienia się zależnie od światła i kąta patrzenia. Wydobywa się go tylko w jednym miejscu na świecie, w północnej Tanzanii, u stóp Kilimandżaro.',
        'To wybór dla osób, które szukają koloru nieoczywistego i rzadko spotykanego. Jest delikatniejszy od szafiru, dlatego oprawiamy go tak, żeby był dobrze chroniony i służył latami.',
      ],
    }),
    stone({
      anchor: 'topaz',
      name: 'Topaz',
      mohs: '8',
      colors: 'Niebieski (także głęboki London Blue), bezbarwny, żółty',
      daily: 'Dobry',
      catalogStones: 'topaz',
      catalogFilter: 'niebieskie',
      catalogLinkLabel: 'pierścionki z niebieskimi kamieniami',
      text: [
        'Topaz daje dużo koloru i blasku w rozsądnej cenie, także w dużych rozmiarach, więc pozwala na okazały kamień bez wielkiego budżetu. Odmiana London Blue ma głęboki, lekko stalowy odcień niebieskiego, a jasny, błękitny topaz kojarzy się ze świeżością i lekkością.',
        'Jest twardy i odporny na zarysowania, dlatego dobrze sprawdza się w codziennym noszeniu.',
      ],
    }),
    stone({
      anchor: 'oliwin',
      name: 'Oliwin',
      mohs: '6,5–7',
      colors: 'Żółtozielony, soczysta zieleń, oliwkowy',
      daily: 'Dobry w ochronnej oprawie',
      catalogStones: 'oliwin',
      includeVariants: true,
      catalogFilter: 'zielone',
      catalogLinkLabel: 'pierścionki z zielonymi kamieniami',
      text: [
        'Oliwin, nazywany też perydotem, ma świeżą, żółtawozieloną barwę, od soczystej zieleni po oliwkę. Kolor daje mu żelazo zawarte w kamieniu, dlatego jest stały i nie zależy od światła. To zieleń lżejsza i bardziej słoneczna niż szmaragdu, a przy tym wyraźnie szlachetna.',
        'Jest trochę miększy od szafiru i szmaragdu, dlatego oprawiamy go tak, żeby był dobrze osłonięty, a przy cięższych pracach pierścionek warto zdjąć. Dobrze wygląda w żółtym złocie, w którym jego zieleń robi się cieplejsza, a z diamentami zyskuje dodatkowy blask.',
      ],
    }),
    stone({
      anchor: 'ametyst-cytryn',
      name: 'Ametyst i cytryn',
      mohs: '7',
      colors: 'Fioletowy (ametyst), żółty do miodowego (cytryn)',
      daily: 'Dobry',
      catalogStones: 'ametyst, cytryn',
      catalogFilter: 'fioletowe',
      catalogLinkLabel: 'pierścionki z fioletowymi kamieniami',
      text: [
        'Ametyst ma królewski fiolet, a cytryn ciepłą barwę miodu i słońca. Oba są odmianami kwarcu i dają dużo koloru oraz sporą wielkość kamienia przy przystępnej cenie, dlatego dobrze sprawdzają się, gdy najważniejszy jest ulubiony kolor i efekt.',
        'Ametyst od dawna uchodzi za kamień spokoju i równowagi, a cytryn za kamień radości. Ich twardość wystarcza do codziennego noszenia.',
      ],
    }),
    stone({
      anchor: 'turmalin-morganit',
      name: 'Turmalin i morganit',
      mohs: '7–8',
      colors: 'Różowy, malinowy, zielony (turmalin), brzoskwinioworóżowy (morganit)',
      daily: 'Dobry',
      catalogStones: 'turmalin, morganit',
      catalogFilter: 'rozowe',
      catalogLinkLabel: 'pierścionki z czerwonymi i różowymi kamieniami',
      text: [
        'Turmalin występuje w wyjątkowo wielu barwach, od malinowej po oliwkową, więc łatwo znaleźć odcień dopasowany do osoby. Morganit, krewny szmaragdu, ma delikatny, pudrowy róż, który romantycznie wygląda w żółtym złocie.',
        'Oba kamienie dobrze nadają się do codziennego noszenia i dają dużo koloru za rozsądną cenę.',
      ],
    }),
    {
      blockType: 'section',
      heading: 'Jak wybrać kamień',
      anchor: 'jak-wybrac',
      tocLabel: 'Jak wybrać',
      content: doc(
        ol(
          '**Zacznij od osoby.** Jakie kolory nosi, czy lubi biżuterię wyraźną, czy drobną. Kamień w ulubionym kolorze ucieszy bardziej niż kamień „właściwy”.',
          '**Pomyśl, jak będzie noszony.** Praca rękami, sport i małe dzieci przemawiają za diamentem, szafirem albo rubinem. Przy spokojniejszym trybie życia wybór jest szerszy.',
          '**Ustal budżet przed kamieniem.** Ten sam projekt z innym kamieniem może kosztować zupełnie inaczej. Więcej o tym w poradniku [ile kosztuje pierścionek na zamówienie](/poradniki/ile-kosztuje-pierscionek-na-zamowienie).',
        ),
        block('note', {
          text: doc(
            p(
              'Kamień w każdym projekcie z [naszej kolekcji](/pierscionki) możemy zmienić. Kamienie pokazujemy na żywo w pracowni, a gdy zamawiasz z daleka, na zdjęciach i filmach.',
            ),
          ),
        }),
      ),
    },
    {
      blockType: 'section',
      heading: 'Jak dbać o kamienie i pierścionki',
      anchor: 'pielegnacja',
      content: doc(
        p(
          'Każdy pierścionek, nawet z diamentem, posłuży dłużej, jeśli pamiętasz o kilku prostych zasadach. Przy kamieniach kolorowych mają one większe znaczenie, dlatego przy każdej zasadzie piszemy, których kamieni dotyczy najbardziej.',
        ),
        h3('Kiedy zdejmować pierścionek'),
        ul(
          'Do sprzątania ze środkami czystości, pracy w ogrodzie, remontu i sportu, zwłaszcza na siłowni.',
          'Na basen i do sauny, bo chlor i wysoka temperatura nie służą ani kamieniom, ani złotu.',
          'Na noc. Krem, balsam i perfumy nałóż przed założeniem pierścionka, a nie po.',
        ),
        h3('Kamienie, które lubią trochę więcej ostrożności'),
        ul(
          '**Szmaragd.** Naturalne wrostki sprawiają, że gorzej znosi mocne uderzenia i gwałtowne zmiany temperatury. Nie czyść go w myjce ultradźwiękowej ani parą i nie zostawiaj w gorącej wodzie.',
          '**Tanzanit.** Jest miększy od szafiru, więc z czasem może łapać drobne rysy. Chroń go przed uderzeniami i nagłą zmianą temperatury, a do czyszczenia używaj tylko wody z płynem.',
          '**Oliwin.** Jest delikatniejszy od szafiru i może łapać drobne rysy, a mocne uderzenie albo nagła zmiana temperatury mu nie służą. Czyść go wodą z płynem, bez myjki ultradźwiękowej i bez kwasów.',
          '**Topaz.** Przy silnym, punktowym uderzeniu może pęknąć wzdłuż płaszczyzny kryształu. W zwykłym noszeniu rzadko ma to znaczenie, ale do cięższych prac lepiej go zdjąć.',
          '**Ametyst i cytryn.** Po latach na krawędziach szlifu mogą pojawić się drobne przetarcia. Kamień można wtedy przeszlifować i przywrócić mu blask.',
          '**Morganit i jasne kamienie.** Szybciej pokazują zabrudzenia od kremu i mydła, więc warto czyścić je częściej.',
        ),
        h3('Czyszczenie w domu'),
        ol(
          'Przygotuj miskę ciepłej, nie gorącej wody z kroplą płynu do naczyń.',
          'Miękką szczoteczką do zębów delikatnie oczyść kamień, także od spodu, gdzie zbiera się najwięcej brudu.',
          'Opłucz pod bieżącą wodą (zatkaj odpływ) i osusz miękką, niepylącą ściereczką.',
        ),
        p(
          'Diament, szafir i rubin możesz krótko namoczyć. Szmaragd, tanzanit i oliwin tylko przetrzyj, bez moczenia. Nie używaj pasty do zębów, sody ani środków z chlorem, bo rysują złoto i matowią kamienie.',
        ),
        h3('Przechowywanie'),
        p(
          'Trzymaj pierścionek osobno, w miękkim woreczku albo przegródce szkatułki. Diament i szafir są tak twarde, że mogą zarysować inne kamienie i złoto, jeśli biżuteria leży razem.',
        ),
        h3('Przegląd w pracowni'),
        p(
          'Raz w roku warto pokazać pierścionek złotnikowi. Sprawdzimy, czy kamienie dobrze siedzą w oprawie, w razie potrzeby dociśniemy łapki, a pierścionek wyczyścimy i wypolerujemy. Więcej o tym na stronie [Naprawy i przeróbki](/naprawy).',
        ),
      ),
    },
  ],
  faq: [
    {
      question: 'Jaki kamień jest najtrwalszy w pierścionku zaręczynowym?',
      answer:
        'Diament, który ma twardość 10 w skali Mohsa. Tuż za nim są szafir i rubin z twardością 9. Te trzy kamienie najlepiej znoszą noszenie na co dzień przez wiele lat.',
    },
    {
      question: 'Czy pierścionek zaręczynowy musi mieć diament?',
      answer:
        'Nie. Szafir, rubin czy szmaragd są używane w pierścionkach zaręczynowych od dawna. Kolorowy kamień pozwala dobrać pierścionek do osoby, a przy tym samym budżecie często daje większy kamień.',
    },
    {
      question: 'Czy szmaragd nadaje się na co dzień?',
      answer:
        'Tak. Szmaragd ma twardość 7,5–8 w skali Mohsa i w dobrze dobranej oprawie służy latami. Wystarczy zdejmować go do sprzątania, sportu i cięższych prac, tak jak każdy pierścionek z kolorowym kamieniem.',
    },
    {
      question: 'Jak wyczyścić pierścionek z kamieniem w domu?',
      answer:
        'Ciepłą wodą z kroplą płynu do naczyń i miękką szczoteczką, delikatnie także od spodu kamienia. Potem opłucz i osusz miękką ściereczką. Szmaragdu, tanzanitu i oliwinu nie mocz długo i nie czyść w myjce ultradźwiękowej.',
    },
    {
      question: 'Czy w projekcie z kolekcji można zmienić kamień?',
      answer:
        'Tak. Każdy projekt z naszej kolekcji wykonamy z innym kamieniem i w innym kolorze złota. Do pierścionka z kamieniami naturalnymi dołączamy certyfikat.',
    },
  ],
}

const priceGuide: GuideDocument = {
  slug: 'ile-kosztuje-pierscionek-na-zamowienie',
  title: 'Ile kosztuje pierścionek zaręczynowy na zamówienie',
  short: 'Ile kosztuje pierścionek na zamówienie',
  description:
    'Z czego składa się cena pierścionka na zamówienie, co ją podnosi, a co obniża, i jak zmieścić się w budżecie bez rezygnowania z jakości.',
  metaTitle: null,
  topic: 'Cena',
  published: '2026-11-15',
  updated: '2026-11-16',
  minutes: 6,
  order: 3,
  lead: 'Nie ma jednej ceny, bo każdy pierścionek ma inny kamień i inną ilość złota. Da się za to dokładnie powiedzieć, z czego cena się składa i którymi decyzjami można ją zmienić.',
  layout: [
    {
      blockType: 'section',
      heading: 'Krótka odpowiedź',
      anchor: 'krotko',
      content: doc(
        block('ifPrices', {
          withPrices: doc(
            p(
              'Pierścionki z naszej kolekcji kosztują **{cena}**. Pierścionek projektowany od zera wyceniamy po rozmowie, bo jego cena zależy od wybranego kamienia i złota.',
            ),
          ),
          withoutPrices: doc(
            p(
              'Pierścionek na zamówienie wyceniamy po rozmowie, bo jego cena zależy od wybranego kamienia i złota. Aktualne ceny gotowych projektów znajdziesz w [kolekcji pierścionków](/pierscionki).',
            ),
          ),
        }),
        p(
          'Wycenę zawsze dostajesz **przed rozpoczęciem pracy**. Powiedz nam na początku, jaki budżet planujesz: to nie jest niezręczne pytanie, tylko najważniejsza informacja dla złotnika. Dopasujemy do niego kamień, jego wielkość i oprawę.',
        ),
      ),
    },
    {
      blockType: 'section',
      heading: 'Z czego składa się cena pierścionka',
      anchor: 'skladniki',
      tocLabel: 'Z czego składa się cena',
      content: doc(
        h3('Kamień główny'),
        p(
          'To on najczęściej decyduje o cenie. Liczą się rodzaj kamienia, jego masa w karatach i jakość: barwa, czystość i szlif. Cena kamienia rośnie szybciej niż jego masa, bo duże, czyste kamienie są dużo rzadsze od małych. Dwa razy cięższy kamień tej samej jakości kosztuje zwykle wyraźnie więcej niż dwa razy tyle.',
        ),
        h3('Kamienie boczne'),
        p(
          'Małe diamenty po bokach albo w obwódce dodają blasku i pracy: każdy z nich trzeba osobno oprawić. Im jest ich więcej, tym więcej godzin przy stole.',
        ),
        h3('Złoto'),
        p(
          'Na cenę wpływa ilość złota, czyli grubość i szerokość obrączki oraz wielkość oprawy. Masywny pierścionek zużywa go po prostu więcej niż delikatny.',
        ),
        h3('Praca złotnika'),
        p(
          'Prosta oprawa jednego kamienia powstaje szybciej niż ażurowa korona z kilkunastoma kamieniami. W pracowni kamienie oprawiamy ręcznie, a wykończenie i polerowanie też robimy ręcznie, więc złożoność wzoru przekłada się na czas.',
        ),
      ),
    },
    {
      blockType: 'section',
      heading: 'Co podnosi, a co obniża cenę',
      anchor: 'wyzej-nizej',
      content: doc(
        block('dataTable', {
          caption: 'Decyzje, które podnoszą albo obniżają cenę pierścionka',
          columns: [{ label: 'Decyzja' }, { label: 'Cena rośnie, gdy' }, { label: 'Cena spada, gdy' }],
          rows: [
            {
              label: 'Rodzaj kamienia',
              cells: [
                { text: 'wybierasz diament, szafir, rubin albo szmaragd wysokiej jakości' },
                { text: 'wybierasz topaz, ametyst, cytryn albo turmalin' },
              ],
            },
            {
              label: 'Wielkość kamienia',
              cells: [
                { text: 'kamień jest większy, zwłaszcza powyżej pełnego karata' },
                { text: 'kamień jest nieco mniejszy, a wrażenie wielkości daje oprawa' },
              ],
            },
            {
              label: 'Kamienie boczne',
              cells: [{ text: 'jest ich dużo albo tworzą pełną obwódkę' }, { text: 'kamień główny stoi sam albo ma kilka akcentów' }],
            },
            {
              label: 'Obrączka i oprawa',
              cells: [{ text: 'pierścionek jest masywny albo bogato zdobiony' }, { text: 'obrączka jest smukła, a oprawa prosta' }],
            },
          ],
        }),
      ),
    },
    {
      blockType: 'section',
      heading: 'Jak zmieścić się w budżecie',
      anchor: 'budzet',
      content: doc(
        ul(
          '**Powiedz o budżecie w pierwszej rozmowie.** To nie jest niezręczne pytanie, tylko najważniejsza informacja dla złotnika. Od niej zależy, jakie kamienie warto w ogóle oglądać.',
          '**Zmień kamień, nie projekt.** Ten sam wzór z innym kamieniem może kosztować zupełnie inaczej. Czym różnią się kamienie, opisujemy w poradniku [jaki kamień do pierścionka zaręczynowego](/poradniki/kamienie-do-pierscionka-zareczynowego).',
          '**Zdecyduj, co jest najważniejsze.** Kolor, wielkość kamienia czy bogactwo oprawy. Rzadko wszystko naraz mieści się w jednej kwocie, a jedna mocna cecha wystarcza, żeby pierścionek zapadał w pamięć.',
          '**Wykorzystaj to, co już masz.** Złoto albo kamień po bliskiej osobie mogą stać się częścią nowego pierścionka. Powiedz o nich w pierwszej rozmowie.',
        ),
      ),
    },
    {
      blockType: 'priceExamples',
      heading: 'Przykłady cen z naszej kolekcji',
      anchor: 'przyklady',
      tocLabel: 'Przykłady z kolekcji',
      intro: paragraphs(
        'Ceny dotyczą pierścionków takich jak na zdjęciach. Inny kamień, kolor złota albo rozmiar mogą je zmienić w obie strony.',
      ),
      linkLabel: 'Zobacz całą kolekcję od najniższej ceny',
    },
    {
      blockType: 'section',
      heading: 'Jak wygląda wycena i płatność',
      anchor: 'wycena',
      tocLabel: 'Wycena i płatność',
      content: doc(
        ol(
          '**Rozmowa.** W pracowni albo przez telefon. Mówisz, dla kogo jest pierścionek, na jaką okazję i jaki masz budżet.',
          '**Projekt i wycena.** Dobieramy kamień, kolor złota i proporcje. Dostajesz wycenę do akceptacji.',
          '**Zaliczka.** Po akceptacji wpłacasz 30% ceny, BLIK-iem albo przelewem, i wtedy zaczynamy pracę.',
          '**Odbiór.** Resztę rozliczamy przy odbiorze w pracowni albo przed wysyłką kurierem. Od rozmowy do odbioru mija zwykle 4–6 tygodni.',
        ),
        p('Cały przebieg, także dla osób spoza Buska-Zdroju, opisujemy na stronie [Pierścionek na zamówienie](/na-zamowienie).'),
      ),
    },
  ],
  faq: [
    {
      question: 'Od czego zależy cena pierścionka na zamówienie?',
      answer:
        'Od kamienia głównego (rodzaju, masy i jakości), kamieni bocznych, ilości i koloru złota oraz od tego, ile pracy wymaga oprawa. Największą różnicę robi zwykle kamień główny.',
    },
    {
      question: 'Kiedy poznam cenę?',
      answer:
        'Przed rozpoczęciem pracy. Po rozmowie i ustaleniu projektu dostajesz wycenę do akceptacji. Nic nie wykonujemy bez Twojej zgody na projekt i cenę.',
    },
    {
      question: 'Jak wygląda płatność?',
      answer:
        'Po akceptacji projektu i wyceny wpłacasz zaliczkę w wysokości 30% ceny, BLIK-iem albo przelewem. Pozostałą kwotę rozliczamy przy odbiorze w pracowni albo przed wysyłką kurierem.',
    },
    {
      question: 'Czy mogę podać budżet zamiast wybierać projekt?',
      answer: 'Tak. Powiedz, jaki budżet planujesz, a dopasujemy do niego projekt: kamień, jego wielkość i oprawę.',
    },
  ],
}

export const GUIDE_SEED: readonly GuideDocument[] = [sizeGuide, stonesGuide, priceGuide]
