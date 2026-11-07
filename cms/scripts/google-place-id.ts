/**
 * Szuka Place ID wizytówki pracowni w Google (Places API (New), Text Search) i wypisuje kandydatów
 * ze średnią i liczbą opinii. Wynik wpisać do `GOOGLE_PLACE_ID` (Vercel: Production i Preview, lokalnie .env.local).
 *
 *   GOOGLE_PLACES_API_KEY=... npm run google:place-id
 *   GOOGLE_PLACES_API_KEY=... npm run google:place-id -- "inna fraza"
 *
 * Text Search z samymi polami id/nazwa/adres jest w darmowym limicie (SKU „Text Search Essentials (IDs Only)”
 * + Pro dla nazwy i adresu). Jedno uruchomienie = jedno zapytanie.
 */
const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim()
if (!apiKey) {
  console.error('Brak GOOGLE_PLACES_API_KEY.')
  process.exit(1)
}

const query = process.argv[2] ?? 'Pracownia Złotnicza Michał Nowak, Kilińskiego 12, Busko-Zdrój'

const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri',
  },
  body: JSON.stringify({ textQuery: query, languageCode: 'pl', regionCode: 'PL' }),
})

if (!response.ok) {
  console.error(`Places API: HTTP ${response.status}`, await response.text())
  process.exit(1)
}

type Place = {
  id: string
  displayName?: { text?: string }
  formattedAddress?: string
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
}
const { places = [] } = (await response.json()) as { places?: Place[] }
if (places.length === 0) {
  console.log(`Nic nie znaleziono dla: ${query}`)
  process.exit(1)
}
for (const p of places) {
  console.log(`${p.displayName?.text ?? '?'} | ${p.formattedAddress ?? ''}`)
  console.log(`  GOOGLE_PLACE_ID=${p.id}`)
  console.log(`  ocena ${p.rating ?? '-'} z ${p.userRatingCount ?? 0} opinii | ${p.googleMapsUri ?? ''}`)
}
export {}
