// Dane zastępcze używane WYŁĄCZNIE, gdy NEXT_PUBLIC_WP_API_URL nie jest ustawione
// (lokalny podgląd bez dostępu do WordPressa). Na produkcji nie są używane.
import type { Product, Page } from './wordpress'

const img = (id: number, src: string, alt: string) => ({
  id,
  source_url: src,
  alt_text: alt,
  media_details: { width: 1536, height: 1024, sizes: { large: { source_url: src, width: 1536, height: 1024 } } },
})

const make = (
  id: number,
  slug: string,
  title: string,
  src: string,
  acf: Product['acf'],
  content: string,
): Product => ({
  id,
  slug,
  title: { rendered: title },
  content: { rendered: content },
  excerpt: { rendered: '' },
  featured_media: id * 10,
  acf,
  _embedded: { 'wp:featuredmedia': [img(id * 10, src, title)] },
  date: '2025-01-01T00:00:00',
})

export const MOCK_PRODUCTS: Product[] = [
  make(1, 'athena', 'Athena', '/mock/ring-sapphire.png', {
    lead: 'Owalny szafir w klasycznej oprawie czterołapkowej. Pierścionek, który nie potrzebuje ozdobników, żeby zwracać uwagę.',
    czy_posiada_kamien: true, rodzaj_kamienia: 'Szafir', kolor_metalu: 'Złoto żółte 585', czystosc_kamienia: 'VS', masa_karatowa: '2,10 ct',
  }, '<p>Ręcznie kuta szyna o zaokrąglonym przekroju, ozdobiona subtelnym grawerem po obu stronach kamienia. Oprawa wykonana w całości w naszej pracowni.</p>'),
  make(2, 'pyrrha', 'Pyrrha', '/mock/ring-ruby.png', {
    lead: 'Rubin o głębokiej barwie, osadzony nisko, żeby pierścionek był wygodny na co dzień.',
    czy_posiada_kamien: true, rodzaj_kamienia: 'Rubin', kolor_metalu: 'Złoto żółte 750', czystosc_kamienia: 'VVS', masa_karatowa: '1,80 ct',
  }, '<p>Model o klasycznej sylwetce. Grawer celtycki na ramionach nawiązuje do projektów z lat 80. wykonywanych w naszej pracowni.</p>'),
  make(3, 'taygete', 'Taygete', '/mock/ring-vintage.png', {
    lead: 'Tanzanit w oprawie w stylu art déco, otoczony drobnymi diamentami.',
    czy_posiada_kamien: true, rodzaj_kamienia: 'Tanzanit', kolor_metalu: 'Złoto białe 585', czystosc_kamienia: 'VS', masa_karatowa: '0,55 ct',
  }, '<p>Projekt inspirowany biżuterią międzywojenną. Ażurowa, ręcznie piłowana oprawa.</p>'),
  make(4, 'pelagia', 'Pelagia', '/mock/ring-sapphire.png', {
    lead: 'Delikatny pierścionek zaręczynowy z szafirem i cienką szyną.',
    czy_posiada_kamien: true, rodzaj_kamienia: 'Szafir', kolor_metalu: 'Złoto żółte 585', masa_karatowa: '1,20 ct',
  }, '<p>Lekka forma, pełna trwałość. Szyna wzmocniona w dolnej części.</p>'),
  make(5, 'helena', 'Helena', '/mock/ring-ruby.png', {
    lead: 'Rubin w oprawie zamkniętej, styl vintage.',
    czy_posiada_kamien: true, rodzaj_kamienia: 'Rubin', kolor_metalu: 'Złoto różowe 585', masa_karatowa: '1,05 ct',
  }, '<p>Oprawa zamknięta chroni kamień i podkreśla jego kolor.</p>'),
  make(6, 'kalliope', 'Kalliope', '/mock/ring-vintage.png', {
    lead: 'Pierścionek z tanzanitem i diamentami bocznymi.',
    czy_posiada_kamien: true, rodzaj_kamienia: 'Tanzanit', kolor_metalu: 'Złoto białe 750', masa_karatowa: '0,70 ct',
  }, '<p>Model z serii ażurowej. Wykonany w całości ręcznie.</p>'),
]

export const MOCK_ABOUT_PAGE: Page = {
  id: 100,
  slug: 'o-nas',
  title: { rendered: 'O nas' },
  content: {
    rendered: `
<p>Jesteśmy rodzinną pracownią złotniczą z Buska-Zdroju. Od czterech pokoleń wykonujemy biżuterię ręcznie, według indywidualnych projektów.</p>
<section id="about-intro"><h3>Kim jesteśmy</h3><p>Rodzinna pracownia prowadzona przez Michała Nowaka, kontynuatora tradycji sięgającej 1890 roku.</p><p>Każdy pierścionek powstaje na miejscu, od szkicu po polerowanie.</p></section>
<section id="about-mission"><h3>Misja</h3><p>Chcemy, żeby biżuteria, którą wykonujemy, służyła przez pokolenia i była naprawiana, a nie wymieniana.</p><p>Dlatego stawiamy na solidne oprawy i sprawdzone materiały.</p></section>
<section id="about-craft"><h3>Rzemiosło</h3><p>Ręczna oprawa kamieni, kucie szyn, grawer. Techniki, które w wielu pracowniach zastąpiły maszyny.</p><p>U nas nadal robimy to rękami.</p></section>
`,
  },
}

export const MOCK_GALLERY = MOCK_PRODUCTS.map((p) => ({
  id: 500 + p.id,
  title: { rendered: p.title.rendered },
  content: { rendered: '' },
  _embedded: p._embedded,
}))
