/**
 * Treść startowa strony „Realizacje” (zlecenie R): 6 historii z postów Michała na Facebooku, ze zdjęciami z `cms/seed/realizacje`.
 * Teksty to szkice do potwierdzenia przez Michała (`needsConfirmation: true`); nie ma w nich faktów spoza postów
 * (karaty, czasu wykonania, cen), a „Czas” zostaje pusty.
 * Używa tego `scripts/seed-realizacje.ts` (tylko staging) oraz test `tests/int/realizacje-seed.int.spec.ts`.
 */

export type SeedWork = {
  slug: string
  title: string
  kind: 'zamowienie' | 'przerobka'
  jewelryType: 'pierscionek' | 'obraczka' | 'kolczyki' | 'inne'
  year: number
  task: string
  whatWeDid: string
  featured?: boolean
  /**
   * Karta w katalogu, do której prowadzi „Zobacz w katalogu”. Najpierw szukamy po id posta z Facebooka, z którego powstał
   * szkic karty (`source.facebookPayload.posts[].postId`), a nazwa jest zapasem. Gdy karty nie ma albo nie jest opublikowana,
   * realizacja zostaje bez linku.
   */
  product?: { postIds?: string[]; name?: string; /** Inne nazwy tej samej karty (np. imię po zleceniu S); dopasowanie jak do `name`. */ altNames?: string[] }
  /** Pliki z `cms/seed/realizacje` w kolejności wyświetlania; pierwszy to okładka. */
  photos: { file: string; alt: string }[]
  /** Poprzedni układ zdjęć z wcześniejszej wersji seeda (do jednorazowej, bezpiecznej poprawki istniejącej realizacji). */
  previousPhotos?: { file: string; alt: string }[]
}

export const SEED_WORKS: SeedWork[] = [
  {
    slug: 'pierscionek-zareczynowy-wyspa',
    title: 'Pierścionek zaręczynowy z niebieskim diamentem',
    kind: 'zamowienie',
    jewelryType: 'pierscionek',
    year: 2026,
    featured: true,
    task: 'Przyszły narzeczony zaprojektował pierścionek razem z Michałem. Chciał niebieski diament z białymi kamieniami, w białym złocie.',
    whatWeDid: 'Pierścionek zrobiliśmy ręcznie od podstaw. Zaręczyny odbyły się na wyspie.',
    product: { name: 'Pierścionek zaręczynowy klienta (wyspa)', altNames: ['Calypso'] },
    photos: [
      { file: '1-wyspa_01_dlonie-z-pierscionkiem.webp', alt: 'Splecione dłonie pary, na palcu narzeczonej pierścionek z niebieskim diamentem' },
      { file: '1-wyspa_02_narzeczona-nad-morzem.webp', alt: 'Narzeczona nad morzem o zachodzie słońca wyciąga dłoń z pierścionkiem zaręczynowym' },
      { file: '1-wyspa_03_packshot-zloty-lisc.webp', alt: 'Pierścionek z niebieskim diamentem i białymi kamieniami, ułożony na złotym liściu' },
      { file: '1-wyspa_04_packshot-ciemne-tlo.webp', alt: 'Pierścionek z niebieskim diamentem w białym złocie na ciemnym tle, widok od przodu' },
      { file: '1-wyspa_05_packshot-marzec.webp', alt: 'Pierścionek z niebieskim diamentem na złotym tle, ujęcie z bliska' },
      { file: '1-wyspa_06_packshot-odbicie.webp', alt: 'Pierścionek z niebieskim diamentem odbity w ciemnej, błyszczącej powierzchni' },
      { file: '1-wyspa_07_packshot-ciemny.webp', alt: 'Pierścionek z niebieskim diamentem na ciemnym tle' },
    ],
  },
  {
    slug: 'brylant-w-szlifie-szmaragdowym',
    title: 'Pierścionek z brylantem w szlifie szmaragdowym',
    kind: 'zamowienie',
    jewelryType: 'pierscionek',
    year: 2024,
    task: 'Klientka wymarzyła sobie kamień o dokładnie takim kształcie i szlifie.',
    whatWeDid: 'Brylant w szlifie szmaragdowym, z certyfikatem GIA, oprawiliśmy w pierścionek wykonany ręcznie od podstaw.',
    product: { name: 'Brylant w szlifie szmaragdowym 0,41 ct', altNames: ['Leucothea'] },
    photos: [
      { file: '2-gia_01.webp', alt: 'Pierścionek z brylantem w szlifie szmaragdowym i drobnymi kamieniami w obrączce, na kamiennym podłożu' },
      { file: '2-gia_02_certyfikat.webp', alt: 'Pierścionek z brylantem w szlifie szmaragdowym obok certyfikatu GIA' },
      { file: '2-gia_03_pion.webp', alt: 'Pierścionek z brylantem w szlifie szmaragdowym ustawiony pionowo, przytrzymany pęsetą' },
      { file: '2-gia_04_ciemne.webp', alt: 'Pierścionek z brylantem w szlifie szmaragdowym na ciemnym tle' },
      { file: '2-gia_05_czarno-biale.webp', alt: 'Pierścionek z brylantem w szlifie szmaragdowym, ujęcie czarno-białe' },
    ],
  },
  {
    slug: 'pierscionek-waz-z-diamentami',
    title: 'Pierścionek „wąż” z diamentami',
    kind: 'zamowienie',
    jewelryType: 'pierscionek',
    year: 2025,
    task: 'Klientka chciała pierścionek z motywem zwierzęcym: wężem z oczami z czarnych diamentów.',
    whatWeDid: 'Pierścionek w kształcie węża, z diamentami. Oczy zrobiliśmy z czarnych diamentów, tak jak chciała klientka.',
    photos: [
      { file: '3-waz_01.webp', alt: 'Pierścionek w kształcie węża z diamentami, leży na niebieskim aksamicie' },
      { file: '3-waz_02.webp', alt: 'Pierścionek-wąż z diamentami, widok z boku, na niebieskim aksamicie' },
      { file: '3-waz_03.webp', alt: 'Pierścionek-wąż z diamentami, widać wnętrze obrączki' },
      { file: '3-waz_04_proces.webp', alt: 'Pierścionek-wąż w trakcie pracy w warsztacie, obok drobne kamienie' },
    ],
  },
  {
    slug: 'obraczka-eternity-na-wzor',
    title: 'Obrączka eternity odtworzona na wzór',
    kind: 'zamowienie',
    jewelryType: 'obraczka',
    year: 2026,
    task: 'Klientka chciała odtworzyć obrączkę eternity, tak żeby pasowała do jej pierścionka zaręczynowego.',
    whatWeDid: 'Dobraliśmy proporcje i rozmiar. Diamenty osadziliśmy w mikropavé.',
    product: { postIds: ['122171835092616875'], name: 'Obrączka eternity odtworzona dla klientki' },
    photos: [
      { file: '4-eternity_01_komplet.webp', alt: 'Pierścionek zaręczynowy z kwadratowym brylantem i dwie obrączki eternity, ułożone jako komplet' },
      { file: '4-eternity_02_stos.webp', alt: 'Stos obrączek eternity z pierścionkiem zaręczynowym na górze' },
      { file: '4-eternity_03_w-palcach.webp', alt: 'Cienka obrączka eternity z drobnymi diamentami, trzymana w palcach' },
    ],
  },
  {
    slug: 'pierscionek-z-morganitem',
    title: 'Pierścionek z morganitem „Od niego. Dla niej.”',
    kind: 'zamowienie',
    jewelryType: 'pierscionek',
    year: 2026,
    task: 'Klient zainspirował się fasonem z naszej pracowni. Chciał wersję w innym kolorze, właśnie dla niej.',
    whatWeDid: 'Zrobiliśmy ten sam fason, ale z morganitem w innym kolorze niż w pracowni.',
    product: { postIds: ['122194033982616875', '122195486114616875'], name: 'Morganit w oprawie halo' },
    photos: [
      { file: '5-morganit_01-kolaz.webp', alt: 'Kolaż trzech ujęć pierścionka z morganitem w oprawie halo: na dłoni i w pudełku' },
    ],
  },
  {
    slug: 'pierscionek-z-tanzanitem',
    title: 'Pierścionek z tanzanitem z wisiorka i kolczyków',
    kind: 'przerobka',
    jewelryType: 'pierscionek',
    year: 2026,
    task: 'Klientce znudził się wisiorek i kolczyki w kształcie piór.',
    whatWeDid: 'Michał zaproponował pierścionek. Z biżuterii, którą klientka już miała, powstał pierścionek z wymarzonym tanzanitem w centrum.',
    // Okładką są zdjęcia „po”: na liście kafelków zdjęcie samego pióra wyglądało jak wisiorek, nie pierścionek.
    photos: [
      { file: '6-tanzanit_02_po.webp', alt: 'Pierścionek z tanzanitem w zielonym, aksamitnym pudełku, po przeróbce' },
      { file: '6-tanzanit_03_po.webp', alt: 'Pierścionek z tanzanitem w pudełku trzymanym w dłoni, po przeróbce' },
      { file: '6-tanzanit_01_przed-wisiorek-pioro.webp', alt: 'Przed: złoty wisiorek w kształcie pióra widziany przez lupę' },
    ],
    // Pierwsza wersja seeda (kolejność „przed” na początku). Realizację z dokładnie tym układem przestawiamy na nowy,
    // a ręcznie zmienioną zostawiamy w spokoju.
    previousPhotos: [
      { file: '6-tanzanit_01_przed-wisiorek-pioro.webp', alt: 'Złoty wisiorek w kształcie pióra widziany przez lupę, przed przeróbką' },
      { file: '6-tanzanit_02_po.webp', alt: 'Pierścionek z tanzanitem w zielonym, aksamitnym pudełku, po przeróbce' },
      { file: '6-tanzanit_03_po.webp', alt: 'Pierścionek z tanzanitem w pudełku trzymanym w dłoni, po przeróbce' },
    ],
  },
]
