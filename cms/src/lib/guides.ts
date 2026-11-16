/**
 * Poradniki pracowni (/poradniki). Treść każdego poradnika jest stroną w `src/app/(frontend)/poradniki/<slug>/page.tsx`;
 * tu jest tylko spis: tytuły, opisy i daty, z których korzystają lista poradników, strona główna, mapa strony
 * i dane strukturalne. Nowy poradnik = nowy wpis tutaj + strona pod tym samym `slug`.
 *
 * Daty w zapisie `RRRR-MM-DD`. `updated` zmieniaj tylko przy merytorycznej zmianie treści (trafia do mapy strony
 * i do danych strukturalnych jako data aktualizacji).
 */
export type Guide = {
  slug: string
  /** Tytuł strony i nagłówek H1. */
  title: string
  /** Krótka nazwa na kafelku i w linkach z innych stron. */
  short: string
  /** Opis do wyników wyszukiwania i na kafelek (do ok. 155 znaków). */
  description: string
  /** Etykieta nad tytułem kafelka. */
  topic: string
  published: string
  updated: string
  /** Szacowany czas czytania w minutach. */
  minutes: number
}

export const GUIDES: readonly Guide[] = [
  {
    slug: 'jak-sprawdzic-rozmiar-pierscionka',
    title: 'Jak sprawdzić rozmiar pierścionka, także gdy to niespodzianka',
    short: 'Jak sprawdzić rozmiar pierścionka',
    description:
      'Trzy sposoby na poznanie rozmiaru pierścionka, kalkulator rozmiarów i tabela: rozmiar polski, obwód, średnica, rozmiar amerykański.',
    topic: 'Rozmiar',
    published: '2026-11-15',
    updated: '2026-11-15',
    minutes: 6,
  },
  {
    slug: 'kamienie-do-pierscionka-zareczynowego',
    title: 'Jaki kamień do pierścionka zaręczynowego? Szafir, rubin, szmaragd i inne',
    short: 'Jaki kamień do pierścionka zaręczynowego',
    description:
      'Diament, szafir, rubin, szmaragd, tanzanit, topaz: kolory, twardość i jak dbać o kamień na co dzień. Z przykładami pierścionków z pracowni.',
    topic: 'Kamienie',
    published: '2026-11-15',
    updated: '2026-11-16',
    minutes: 8,
  },
  {
    slug: 'ile-kosztuje-pierscionek-na-zamowienie',
    title: 'Ile kosztuje pierścionek zaręczynowy na zamówienie',
    short: 'Ile kosztuje pierścionek na zamówienie',
    description:
      'Z czego składa się cena pierścionka na zamówienie, co ją podnosi, a co obniża, i jak zmieścić się w budżecie bez rezygnowania z jakości.',
    topic: 'Cena',
    published: '2026-11-15',
    updated: '2026-11-16',
    minutes: 6,
  },
]

export const GUIDES_PATH = '/poradniki'

export const guidePath = (slug: string) => `${GUIDES_PATH}/${slug}`

export function findGuide(slug: string): Guide {
  const guide = GUIDES.find((g) => g.slug === slug)
  if (!guide) throw new Error(`Nieznany poradnik: ${slug}`)
  return guide
}

/** „15 listopada 2026” z daty `RRRR-MM-DD` (bez `Intl`, żeby tekst był ten sam na serwerze i w przeglądarce). */
export function guideDateLabel(date: string): string {
  const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']
  const [year, month, day] = date.split('-').map(Number)
  return `${day} ${months[month - 1]} ${year}`
}
