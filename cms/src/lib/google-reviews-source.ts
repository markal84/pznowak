import { unstable_cache } from 'next/cache'
import { fetchPlaceDetails, placesEnv, placeToReviewsConfig, type PlaceDetails } from './google-places'
import { GOOGLE_REVIEWS, type ReviewsConfig } from './reviews'

/** Jak długo trzymamy odpowiedź Google (sekundy). 6 h = ok. 120 zapytań w miesiącu, w darmowym limicie. */
export const GOOGLE_REVIEWS_REVALIDATE = 6 * 60 * 60

// Strony z opiniami są `force-dynamic`, więc zwykły `fetch` nie korzysta z pamięci podręcznej.
// `unstable_cache` trzyma wynik w Data Cache Vercela wspólnie dla wszystkich instancji.
// Klucz cache zawiera Place ID (nie klucz API), więc zmiana miejsca od razu pobiera nowe dane.
const cachedPlace = unstable_cache(
  async (placeId: string): Promise<PlaceDetails> => {
    const env = placesEnv()
    if (!env) throw new Error('brak GOOGLE_PLACES_API_KEY')
    return fetchPlaceDetails({ apiKey: env.apiKey, placeId })
  },
  ['google-place-reviews-v1'],
  { revalidate: GOOGLE_REVIEWS_REVALIDATE, tags: ['google-reviews'] },
)

/**
 * Dane sekcji opinii: z Places API, gdy są ustawione `GOOGLE_PLACES_API_KEY` i `GOOGLE_PLACE_ID`;
 * bez nich albo przy błędzie Google ręczna konfiguracja z `reviews.ts` (strona nigdy nie pada przez Google).
 */
export async function getGoogleReviews(): Promise<ReviewsConfig> {
  const env = placesEnv()
  if (!env) return GOOGLE_REVIEWS
  try {
    const place = await cachedPlace(env.placeId)
    const minRating = Number(process.env.GOOGLE_REVIEWS_MIN_RATING) || 4
    const config = placeToReviewsConfig(place, { minRating })
    return config.reviews.length > 0 && config.summary ? config : GOOGLE_REVIEWS
  } catch (error) {
    console.error('[opinie Google]', error instanceof Error ? error.message : error)
    return GOOGLE_REVIEWS
  }
}
