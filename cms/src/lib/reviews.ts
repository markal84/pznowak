export type GoogleReview = {
  author: string
  /** Treść opinii, najwyżej 2–3 zdania; skracać tylko z zachowaniem sensu. */
  text: string
  /** Ocena 1–5. */
  rating: number
  /** Data opinii, np. „październik 2026”. */
  date: string
  /** Link do tej opinii w Google (opcjonalnie). */
  url?: string
  /** Profil autora w Google (z Places API; wymagane przypisanie autora). */
  authorUrl?: string
  /** Zdjęcie profilowe autora (z Places API). */
  photoUrl?: string
}

export type ReviewsConfig = {
  /** Podsumowanie wizytówki Google. Średnia i liczba opinii są obowiązkowe obok wybranych cytatów. */
  summary: {
    /** Średnia ocena, np. 4.9. */
    average: number
    /** Liczba wszystkich opinii w wizytówce. */
    count: number
    /** Link „zobacz wszystkie w Google” (adres wizytówki lub listy opinii). */
    url: string
  } | null
  /** Jedno zdanie o tym, skąd pochodzą opinie (wymóg informacyjny; treść potwierdzamy osobno). */
  sourceNote: string | null
  /** Wybrane 3–4 opinie. */
  reviews: GoogleReview[]
  /** Skąd są dane: `google` = pobrane z Places API (wymaga podpisu „Google Maps”), `manual` = wpisane w tym pliku. */
  source?: 'google' | 'manual'
}

/**
 * Ręczna konfiguracja opinii: zapas, gdy nie ma klucza Google Places API (`GOOGLE_PLACES_API_KEY`
 * i `GOOGLE_PLACE_ID`) albo Google nie odpowiada. Z kluczem sekcja bierze opinie automatycznie
 * z wizytówki (`src/lib/google-places.ts`). Pusta: podgląd pokazuje placeholder, produkcja nie renderuje sekcji.
 */
export const GOOGLE_REVIEWS: ReviewsConfig = {
  // Stan wizytówki z 7.11.2026 (panel menedżera). Średnią i liczbę aktualizować raz w miesiącu.
  summary: {
    average: 4.7,
    count: 15,
    url: 'https://www.google.com/maps/search/?api=1&query=Pracownia%20Z%C5%82otnicza%20Micha%C5%82%20Nowak%20Busko-Zdr%C3%B3j',
  },
  sourceNote:
    'Wybrane opinie z naszej wizytówki Google, przepisane bez zmian. Średnia i liczba obejmują wszystkie opinie (stan na listopad 2026).',
  reviews: [
    {
      author: 'A.J.',
      rating: 5,
      date: 'listopad 2026',
      text: 'Polecam ! Korzystalam wielokrotnie z uslug Pana Michala, ktory uratowal moja sentymentalna bizuterie. Wszystko zawsze na najwyzszym poziomie ! Ogromny wybor bizuterii zlotej i srebrnej, mila atmosfera.',
    },
    {
      author: 'Damian Szo',
      rating: 5,
      date: 'listopad 2026',
      text: 'Miła fachowa obsługa ,usługa w terminie i nawet czyszczenie gratis polecam i pozdrawiam !',
    },
    {
      author: 'Przemysław',
      rating: 5,
      date: 'listopad 2026',
      text: 'Szybko, fachowo i tanio. Polecam!',
    },
    {
      author: 'Dominika Łachut',
      rating: 5,
      date: 'listopad 2026',
      text: 'Bardzo miła i sprawna obsługa. Polecam serdecznie!',
    },
  ],
  source: 'manual',
}

/** Sekcja ma prawo pojawić się na produkcji tylko z opiniami i z podsumowaniem (średnia + liczba) naraz. */
export function reviewsReady(config: ReviewsConfig): boolean {
  return config.reviews.length > 0 && config.summary !== null
}

/** „4,9” zamiast „4.9”, zawsze z przecinkiem dziesiętnym. */
export function formatAverage(average: number): string {
  return average.toFixed(1).replace('.', ',')
}

export function pluralReviews(count: number): string {
  if (count === 1) return 'opinia'
  const digit = count % 10
  const hundred = count % 100
  return digit >= 2 && digit <= 4 && (hundred < 12 || hundred > 14) ? 'opinie' : 'opinii'
}

const MONTHS = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień',
]

/** „październik 2026” z daty ISO; pusty napis dla błędnej daty. */
export function formatReviewMonth(iso: string | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}
