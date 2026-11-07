import opinieGoogle from './opinie-google.json'

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
  /** Skąd są dane: `google` = pobrane z Places API (wymaga podpisu „Google Maps”), `manual` = wpisane w opinie-google.json. */
  source?: 'google' | 'manual'
}

/**
 * Ręczne opinie z `opinie-google.json`: jedyny plik do edycji przy aktualizacji (opis: cms/docs/opinie-google.md).
 * Działają, gdy nie ma klucza Google Places API (`GOOGLE_PLACES_API_KEY` i `GOOGLE_PLACE_ID`) albo Google
 * nie odpowiada; z kluczem sekcja bierze opinie automatycznie (`src/lib/google-places.ts`).
 * Pusta lista albo `liczbaOpinii: 0`: podgląd pokazuje placeholder, produkcja nie renderuje sekcji.
 */
export const GOOGLE_REVIEWS: ReviewsConfig = {
  summary:
    opinieGoogle.liczbaOpinii > 0
      ? { average: opinieGoogle.srednia, count: opinieGoogle.liczbaOpinii, url: opinieGoogle.linkDoWizytowki }
      : null,
  sourceNote: opinieGoogle.notatka || null,
  reviews: opinieGoogle.opinie.map((o) => ({ author: o.autor, rating: o.ocena, date: o.data, text: o.tekst })),
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
