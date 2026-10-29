/**
 * Adresy starej strony pznowak.pl (eksport statyczny z lutego 2026 + zaplecze WordPress na home.pl) i ich nowe
 * odpowiedniki. Źródło prawdy dla `next.config.ts` (przekierowania trwałe, 308), testów i tabeli
 * `docs/seo/przekierowania.md`. Zasady (Zlecenie D):
 *  - jedno przekierowanie prosto na adres docelowy, także dla wersji ze skośnikiem na końcu (stara strona
 *    miała skośniki: `/katalog/aria/`), bez łańcuchów A → B → C;
 *  - żadnych masowych przekierowań na stronę główną;
 *  - adresy bez odpowiednika nie są tu wpisywane: zwracają 404 (lista w dokumentacji).
 */

export type LegacyRedirect = {
  /** Stary adres bez skośnika na końcu, np. `/katalog/aria`. */
  from: string
  /** Nowy adres bez skośnika na końcu (`/` dla strony głównej). */
  to: string
  /** `static`: eksport statyczny widoczny dla Google (mapa witryny); `wordpress`: zaplecze WordPress na tej samej domenie; `catalog`: adres z nowego serwisu sprzed zmiany nazwy adresu karty. */
  origin: 'static' | 'wordpress' | 'catalog'
  reason: string
}

/**
 * Adresy zindeksowane przez Google wg Search Console (usługa domenowa pznowak.pl, odczyt 22.10.2026). Strona
 * główna jest zindeksowana, ale się nie zmienia, więc nie ma jej w przekierowaniach.
 */
export const GSC_INDEXED_PATHS = [
  '/',
  '/galeria',
  '/o-nas',
  '/katalog/cassiopeia',
  '/katalog/celaeno',
  '/katalog/merope-2',
  '/katalog/taygete',
  '/katalog/pierscionek-8',
  '/katalog/pierscionek-10',
  '/katalog/pierscionek-12',
  '/katalog/pierscionek-21',
] as const

/** Slugi pierścionków przeniesione bez zmian ze starego katalogu (`data/legacy/collection.json`). */
export const LEGACY_RING_SLUGS = [
  'merope-2',
  'electra-2',
  'prometheus-2',
  'euterpe-2',
  'leto-2',
  'celaeno',
  'taygete',
  'maia',
  'cassiopeia',
  'thalia',
  'terpsichore',
  'pierscionek-22',
  'pierscionek-21',
  'pierscionek-20',
  'pierscionek-19',
  'pierscionek-18',
  'pierscionek-17',
  'pierscionek-16',
  'pierscionek-15',
  'pierscionek-14',
  'pierscionek-13',
  'pierscionek-12',
  'pierscionek-11',
  'pierscionek-10',
  'aria',
  'pierscionek-9',
  'pierscionek-8',
  'iris',
  'ione',
  'gaia',
  'adamas',
  'asteria',
  'pierscionek-2',
  'pierscionek-1',
] as const

/** Strony statyczne starego frontu (mapa witryny z 6.02.2026). */
const PAGES: LegacyRedirect[] = [
  { from: '/katalog', to: '/pierscionki', origin: 'static', reason: 'Lista katalogu to dziś „Pierścionki”.' },
  { from: '/galeria', to: '/realizacje', origin: 'static', reason: 'Galeria zdjęć to dziś „Realizacje”.' },
  { from: '/o-nas', to: '/pracownia', origin: 'static', reason: 'Strona o rodzinie i pracowni.' },
  { from: '/index.html', to: '/', origin: 'static', reason: 'Stary eksport statyczny serwował też ten adres; ta sama strona główna.' },
]

/**
 * Czyste adresy kart zamiast `merope-2` i `pierscionek-N` (zlecenie K, pkt 6): stary adres → adres z nazwy karty.
 * Zmieniają się też slugi w CMS (`npm run k:dane`, plan z `scripts/pierscionki/przygotuj_zmiany.py`); kod i dane
 * trzeba wdrożyć razem, bo przekierowanie na adres, którego jeszcze nie ma w bazie, kończy się 404.
 */
export const RENAMED_RING_SLUGS: Readonly<Record<string, string>> = {
  'merope-2': 'merope',
  'electra-2': 'electra',
  'prometheus-2': 'prometheus',
  'euterpe-2': 'euterpe',
  'leto-2': 'leto',
  'pierscionek-22': 'daphne',
  'pierscionek-21': 'pyrrha',
  'pierscionek-20': 'thalassa',
  'pierscionek-19': 'urania',
  'pierscionek-18': 'nyx',
  'pierscionek-17': 'eirene',
  'pierscionek-16': 'harmonia',
  'pierscionek-15': 'cyane',
  'pierscionek-14': 'hestia',
  'pierscionek-13': 'dione',
  'pierscionek-12': 'athena',
  'pierscionek-11': 'chryse',
  'pierscionek-10': 'phoebe',
  'pierscionek-9': 'helios',
  'pierscionek-8': 'pelagia',
  'pierscionek-2': 'delos',
  'pierscionek-1': 'egea',
}

/** Aktualny adres karty o slugu ze starego katalogu (po zmianie nazwy adresu albo ten sam). */
export const currentRingSlug = (legacySlug: string): string => RENAMED_RING_SLUGS[legacySlug] ?? legacySlug

/**
 * `/katalog/<slug>` (eksport statyczny, to indeksuje Google) i `/ring/<slug>` (zaplecze WordPress, adresy publiczne
 * na pznowak.pl, kanoniczne wskazują gdzie indziej). Cel to od razu nowy adres karty, bez przystanku na `merope-2`.
 */
const RINGS: LegacyRedirect[] = LEGACY_RING_SLUGS.flatMap((slug): LegacyRedirect[] => {
  const renamed = currentRingSlug(slug) !== slug
  return [
    {
      from: `/katalog/${slug}`,
      to: `/pierscionki/${currentRingSlug(slug)}`,
      origin: 'static',
      reason: renamed ? 'Ten sam pierścionek; adres z nazwy karty zamiast numeru.' : 'Ten sam pierścionek, ten sam slug.',
    },
    {
      from: `/ring/${slug}`,
      to: `/pierscionki/${currentRingSlug(slug)}`,
      origin: 'wordpress',
      reason: renamed ? 'Wpis WordPress „ring”; adres z nazwy karty zamiast numeru.' : 'Wpis WordPress „ring”; ten sam pierścionek.',
    },
  ]
})

/** Adresy kart w nowym serwisie sprzed zmiany nazwy adresu (podglądy, linki wysłane klientom, zapisane zakładki). */
const RENAMED: LegacyRedirect[] = Object.entries(RENAMED_RING_SLUGS).map(([from, to]) => ({
  from: `/pierscionki/${from}`,
  to: `/pierscionki/${to}`,
  origin: 'catalog',
  reason: 'Adres z nazwy karty zamiast numeru ze starej strony.',
}))

/** Elementy galerii WordPress (11 wpisów, w tym przykładowe) nie mają własnych stron w nowym układzie. */
export const LEGACY_GALLERY_SLUGS = [
  'przykladowe-zdjecie',
  'zdjecie-2',
  'galeria-3',
  'zdjecie-4',
  'zdjecie-5',
  'pierscionek-6',
  'pierscionek-77',
  'pierscionek-88',
  'pierscionek-99',
  'piersionek-100',
  'pierscionek-101',
] as const

const GALLERY: LegacyRedirect[] = LEGACY_GALLERY_SLUGS.map((slug) => ({
  from: `/gallery/${slug}`,
  to: '/realizacje',
  origin: 'wordpress',
  reason: 'Wpis galerii WordPress; najbliższa lista to „Realizacje”.',
}))

export const LEGACY_REDIRECTS: readonly LegacyRedirect[] = [...PAGES, ...RINGS, ...RENAMED, ...GALLERY]

/**
 * Wbudowane przekierowanie skośnika na końcu (`/x/` → `/x`) w Next działa PRZED przekierowaniami z konfiguracji,
 * więc `/katalog/aria/` szłoby dwoma skokami. Dlatego `skipTrailingSlashRedirect: true`: wersje ze skośnikiem
 * są wpisane tu jawnie (jeden skok), a reszta adresów ze skośnikiem dostaje ogólną regułę na końcu listy.
 */
export function legacyRedirectRules(): { source: string; destination: string; permanent: true }[] {
  return LEGACY_REDIRECTS.flatMap(({ from, to }) => [
    { source: `${from}/`, destination: to, permanent: true as const },
    { source: from, destination: to, permanent: true as const },
  ])
}

/** Adresy ze starej mapy witryny, które w nowej stronie mają ten sam adres (zmienia się tylko skośnik na końcu). */
export const LEGACY_UNCHANGED_PAGES = ['/', '/kontakt'] as const

/**
 * Stare adresy bez odpowiednika: nie ma dla nich przekierowania, odpowiadają 404 (nic z nich nie jest w Google
 * pod pznowak.pl, kanoniczne adresy WordPressa wskazują na home.pl). Wyłącznie dla dokumentacji i testów.
 */
export const LEGACY_WITHOUT_COUNTERPART = [
  { path: '/przykladowa-strona', note: 'Strona przykładowa WordPressa.' },
  { path: '/witaj-swiecie', note: 'Wpis przykładowy WordPressa.' },
  { path: '/category/bez-kategorii', note: 'Kategoria WordPressa bez treści.' },
  { path: '/feed', note: 'Kanał RSS WordPressa.' },
  { path: '/wp-json', note: 'API WordPressa.' },
  { path: '/wp-sitemap.xml', note: 'Mapa WordPressa z błędnym adresem witryny (home.pl); zastępuje ją /sitemap.xml.' },
] as const
