# Pracownia Złotnicza Michał Nowak – strona (Next.js)

Frontend strony [pznowak.pl](https://pznowak.pl). Treści (katalog, galeria, strona „O nas”) pochodzą z WordPress REST API.

## Uruchomienie

```bash
npm install
npm run dev        # http://localhost:3000
```

Zmienne środowiskowe (`.env.local`):

```
NEXT_PUBLIC_WP_API_URL=https://<domena>/wp-json/wp/v2
NEXT_PUBLIC_PHP_ENDPOINT=https://<domena>/send-contact.php
```

Bez `NEXT_PUBLIC_WP_API_URL` aplikacja używa danych podglądowych z `src/lib/mock-data.ts`
(kilka przykładowych pierścionków i treść strony „O nas”), żeby można było pracować nad
wyglądem bez dostępu do WordPressa. Na produkcji zmienna musi być ustawiona.

## Struktura

- `src/app/*` – strony (App Router): główna, `katalog`, `katalog/[slug]`, `o-nas`, `galeria`, `kontakt`
- `src/components/*` – komponenty; `SketchReveal` (suwak szkic → pierścionek) i `ProcessSteps` to elementy interaktywne strony głównej
- `src/app/globals.css` – tokeny kolorów, typografia i klasy pomocnicze (`container-x`, `section`, `section-dark`, `reveal`, `lift`)
- `src/lib/wordpress.ts` – pobieranie danych z WP, `src/lib/socials.ts` – dane kontaktowe i godziny otwarcia

## Zasady wizualne

- Jedna paleta: kość słoniowa / grafit / złoto. Ciemne sekcje przez klasę `section-dark`, bez automatycznego trybu ciemnego.
- Fonty: Cormorant Garamond (nagłówki) + Inter (tekst), ładowane przez `next/font`.
- Animacje zmieniają wyłącznie `opacity`/`transform`/`clip-path`; żaden element nie zmienia rozmiaru ani położenia sąsiadów.
- Nagłówek ma stałą wysokość (`--header-height`), menu mobilne jest warstwą `fixed`, a na telefonie na dole jest stały pasek „Zadzwoń / Napisz / Dojazd”.
