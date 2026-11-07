import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import GoogleReviews from '@/components/site/GoogleReviews'
import { fetchPlaceDetails, placesEnv, placeToReviewsConfig, PLACES_FIELD_MASK, type PlaceDetails } from '@/lib/google-places'
import { formatReviewMonth, reviewsReady } from '@/lib/reviews'

const review = (rating: number, name: string, extra: Record<string, unknown> = {}) => ({
  rating,
  text: { text: `Tłumaczenie ${name}`, languageCode: 'pl' },
  originalText: { text: `Oryginał ${name}`, languageCode: 'pl' },
  authorAttribution: { displayName: name, uri: `https://maps.google.com/u/${name}`, photoUri: `https://lh3.googleusercontent.com/${name}` },
  publishTime: '2026-10-14T10:00:00Z',
  relativePublishTimeDescription: 'miesiąc temu',
  googleMapsUri: `https://maps.google.com/r/${name}`,
  ...extra,
})

const place: PlaceDetails = {
  rating: 4.8,
  userRatingCount: 57,
  googleMapsUri: 'https://maps.google.com/?cid=1',
  googleMapsLinks: { reviewsUri: 'https://maps.google.com/?cid=1&reviews' },
  reviews: [review(5, 'Anna'), review(3, 'Bartek'), review(4, 'Celina'), review(5, 'Darek'), review(5, 'Ela'), review(1, 'Franek')],
}

describe('opinie Google z Places API', () => {
  it('bierze tylko oceny 4–5, najwyżej 4, w kolejności od Google', () => {
    const config = placeToReviewsConfig(place)
    expect(config.reviews.map((r) => r.author)).toEqual(['Anna', 'Celina', 'Darek', 'Ela'])
    expect(config.reviews.every((r) => r.rating >= 4)).toBe(true)
    expect(config.source).toBe('google')
    expect(reviewsReady(config)).toBe(true)
  })

  it('średnia i liczba ze wszystkich opinii, link do listy opinii', () => {
    expect(placeToReviewsConfig(place).summary).toEqual({ average: 4.8, count: 57, url: 'https://maps.google.com/?cid=1&reviews' })
  })

  it('oryginalny tekst autora, przypisanie autora i data miesiąc + rok', () => {
    const [first] = placeToReviewsConfig(place).reviews
    expect(first).toMatchObject({
      text: 'Oryginał Anna',
      authorUrl: 'https://maps.google.com/u/Anna',
      photoUrl: 'https://lh3.googleusercontent.com/Anna',
      url: 'https://maps.google.com/r/Anna',
      date: 'październik 2026',
    })
  })

  it('notatka mówi, jak opinie są wybrane (wymóg Google i informacja dla klienta)', () => {
    expect(placeToReviewsConfig(place).sourceNote).toMatch(/od 4 do 5.*wszystkie opinie/)
    expect(placeToReviewsConfig(place, { minRating: 5 }).sourceNote).toMatch(/z oceną 5 /)
  })

  it('minRating 5 i limit', () => {
    expect(placeToReviewsConfig(place, { minRating: 5, limit: 2 }).reviews.map((r) => r.author)).toEqual(['Anna', 'Darek'])
  })

  it('pomija opinie bez tekstu albo autora; bez średniej sekcja nie jest gotowa', () => {
    const config = placeToReviewsConfig({
      reviews: [review(5, 'A', { text: undefined, originalText: undefined }), review(5, 'B', { authorAttribution: {} })],
    })
    expect(config.reviews).toEqual([])
    expect(config.summary).toBeNull()
    expect(reviewsReady(config)).toBe(false)
  })

  it('zmienne środowiskowe: oba wymagane', () => {
    expect(placesEnv({ GOOGLE_PLACES_API_KEY: 'k' })).toBeNull()
    expect(placesEnv({ GOOGLE_PLACE_ID: 'p' })).toBeNull()
    expect(placesEnv({ GOOGLE_PLACES_API_KEY: ' k ', GOOGLE_PLACE_ID: 'p' })).toEqual({ apiKey: 'k', placeId: 'p' })
  })

  it('zapytanie do Place Details: klucz w nagłówku, maska pól, język polski', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(place), { status: 200 }))
    await fetchPlaceDetails({ apiKey: 'KEY', placeId: 'ChIJabc' }, fetchMock as unknown as typeof fetch)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://places.googleapis.com/v1/places/ChIJabc?languageCode=pl&regionCode=PL')
    expect(init.headers).toMatchObject({ 'X-Goog-Api-Key': 'KEY', 'X-Goog-FieldMask': PLACES_FIELD_MASK })
  })

  it('błąd Google jest wyjątkiem (strona wtedy bierze ręczną konfigurację)', async () => {
    const fetchMock = vi.fn(async () => new Response('denied', { status: 403 }))
    await expect(fetchPlaceDetails({ apiKey: 'K', placeId: 'P' }, fetchMock as unknown as typeof fetch)).rejects.toThrow(/403/)
  })

  it('formatReviewMonth', () => {
    expect(formatReviewMonth('2026-01-03T00:00:00Z')).toBe('styczeń 2026')
    expect(formatReviewMonth('nie-data')).toBe('')
    expect(formatReviewMonth(undefined)).toBe('')
  })
})

describe('sekcja z danymi z Google', () => {
  const longText = 'Bardzo długa opinia. '.repeat(20)
  const config = placeToReviewsConfig({
    ...place,
    reviews: [review(5, 'Anna', { originalText: { text: longText } }), review(4, 'Celina')],
  })
  const markup = renderToStaticMarkup(createElement(GoogleReviews, { config }))

  it('autor z linkiem do profilu i zdjęciem, podpis „Google Maps” i notatka o wyborze', () => {
    expect(markup).toContain('href="https://maps.google.com/u/Anna"')
    expect(markup).toContain('review-avatar')
    expect(markup).toContain('Źródło: Google Maps')
    expect(markup).toContain('z oceną od 4 do 5')
    expect(markup).toContain('4,8')
    expect(markup).toContain('57 opinii w Google')
  })

  it('długa opinia: pełny tekst w HTML, przycięcie tylko w CSS i link do całości', () => {
    expect(markup).toContain(longText.trim())
    expect(markup).toContain('review-clamp')
    expect(markup).toContain('Cała opinia w Google')
  })
})
