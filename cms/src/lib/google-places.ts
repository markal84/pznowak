import { formatReviewMonth, type GoogleReview, type ReviewsConfig } from './reviews'

/**
 * Opinie z wizytówki Google przez Places API (New), Place Details:
 * https://developers.google.com/maps/documentation/places/web-service/place-details
 *
 * Wystarczy klucz API z projektu Google Cloud i identyfikator miejsca (Place ID). Nie trzeba dostępu
 * do panelu wizytówki. Google zwraca najwyżej 5 opinii, w kolejności „najtrafniejsze”; do tego średnią
 * i liczbę wszystkich opinii. Na stronie pokazujemy tylko te z oceną od `minRating` (domyślnie 4).
 *
 * Zasady Google (https://developers.google.com/maps/documentation/places/web-service/policies):
 * przy każdej opinii autor (imię, zdjęcie, link do profilu), podpis „Google Maps”, informacja, jak opinie
 * są wybrane i ułożone. Treści nie zmieniamy i nie zapisujemy w bazie; pamięć podręczna Next.js trzyma
 * odpowiedź najwyżej kilka godzin (`google-reviews-source.ts`).
 */

export const PLACES_FIELD_MASK = 'rating,userRatingCount,googleMapsUri,googleMapsLinks.reviewsUri,reviews'

/** Fragment odpowiedzi Place Details, z którego korzystamy. */
export type PlaceDetails = {
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
  googleMapsLinks?: { reviewsUri?: string }
  reviews?: PlaceReview[]
}

export type PlaceReview = {
  rating?: number
  text?: { text?: string; languageCode?: string }
  originalText?: { text?: string; languageCode?: string }
  authorAttribution?: { displayName?: string; uri?: string; photoUri?: string }
  publishTime?: string
  relativePublishTimeDescription?: string
  googleMapsUri?: string
}

export type PlaceReviewsOptions = {
  /** Najniższa ocena pokazywanej opinii (domyślnie 4, czyli 4 i 5 gwiazdek). */
  minRating?: number
  /** Ile opinii najwyżej (domyślnie 4). */
  limit?: number
}

export function sourceNoteFor(minRating: number): string {
  const range = minRating >= 5 ? 'z oceną 5' : `z oceną od ${minRating} do 5`
  return `Wybrane opinie ${range} z naszej wizytówki Google, w kolejności trafności według Google. Średnia i liczba obejmują wszystkie opinie.`
}

function toReview(r: PlaceReview): GoogleReview | null {
  // Słowa autora (oryginał), a gdy go brak, tekst w wersji od Google.
  const text = (r.originalText?.text ?? r.text?.text ?? '').trim()
  const author = r.authorAttribution?.displayName?.trim()
  const rating = Math.round(r.rating ?? 0)
  if (!text || !author || rating < 1) return null
  return {
    author,
    text,
    rating: Math.min(rating, 5),
    date: formatReviewMonth(r.publishTime) || (r.relativePublishTimeDescription ?? ''),
    url: r.googleMapsUri,
    authorUrl: r.authorAttribution?.uri,
    photoUrl: r.authorAttribution?.photoUri,
  }
}

/** Odpowiedź Places API → konfiguracja sekcji. Bez średniej i liczby opinii: `summary: null` (sekcja się nie pokaże). */
export function placeToReviewsConfig(place: PlaceDetails, options: PlaceReviewsOptions = {}): ReviewsConfig {
  const minRating = options.minRating ?? 4
  const limit = options.limit ?? 4
  const reviews = (place.reviews ?? [])
    .map(toReview)
    .filter((r): r is GoogleReview => r !== null && r.rating >= minRating)
    .slice(0, limit)
  const url = place.googleMapsLinks?.reviewsUri ?? place.googleMapsUri
  const summary =
    typeof place.rating === 'number' && typeof place.userRatingCount === 'number' && place.userRatingCount > 0 && url
      ? { average: place.rating, count: place.userRatingCount, url }
      : null
  return { summary, reviews, sourceNote: sourceNoteFor(minRating), source: 'google' }
}

export type PlacesEnv = { apiKey: string; placeId: string }

/** Klucz i Place ID ze zmiennych środowiskowych; `null`, gdy któregoś brak (wtedy sekcja używa ręcznej konfiguracji). */
export function placesEnv(env: Record<string, string | undefined> = process.env): PlacesEnv | null {
  const apiKey = env.GOOGLE_PLACES_API_KEY?.trim()
  const placeId = env.GOOGLE_PLACE_ID?.trim()
  return apiKey && placeId ? { apiKey, placeId } : null
}

/** Jedno zapytanie Place Details (rozliczane jako SKU „Place Details Enterprise + Atmosphere”). */
export async function fetchPlaceDetails({ apiKey, placeId }: PlacesEnv, fetchImpl: typeof fetch = fetch): Promise<PlaceDetails> {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=pl&regionCode=PL`
  const response = await fetchImpl(url, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': PLACES_FIELD_MASK },
    cache: 'no-store',
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`Places API: HTTP ${response.status} ${body.slice(0, 200)}`)
  }
  return (await response.json()) as PlaceDetails
}
