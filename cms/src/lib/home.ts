import { pickByName } from './catalog'
import type { SiteProduct } from './public-products'

/** Ile pierścionków pokazuje sekcja „Wybrane pierścionki” na stronie głównej. */
export const HOME_RINGS_LIMIT = 4

/**
 * Witryna w hero strony głównej: pierścionki z katalogu (po nazwie) i ich najlepsze zdjęcia w pełnej rozdzielczości
 * (sesja z Facebooka, 1320 × 1980 px, w `public/zdjecia/hero/`). Pozostałe pierścionki katalogu też trafiają do losowania (`shuffleVitrine`), ze swoim głównym zdjęciem i kadrem 50% 50%.
 * `pos` to kadr na komputerze (wysoki panel), `posMobile` na telefonie (niski, szeroki kadr). Pierścionek, którego nie ma
 * w opublikowanym katalogu, jest pomijany, więc zmiana nazwy w panelu niczego nie psuje. `stone`: kamień ze zdjęcia, gdy to
 * wariant karty, a nie jej główny kamień (Harmonia z malinowym turmalinem, dawniej karta Eirene).
 */
export const HERO_VITRINE: readonly { name: string; stone?: string; src: string; pos: string; posMobile: string }[] = [
  { name: 'Phoebe', src: '/zdjecia/hero/phoebe.webp', pos: '50% 30%', posMobile: '50% 32%' },
  { name: 'Thalia', src: '/zdjecia/hero/thalia.webp', pos: '50% 34%', posMobile: '50% 30%' },
  { name: 'Cyane', src: '/zdjecia/hero/cyane.webp', pos: '50% 36%', posMobile: '50% 38%' },
  { name: 'Harmonia', stone: 'Turmalin malinowy i diamenty', src: '/zdjecia/hero/eirene.webp', pos: '50% 40%', posMobile: '50% 40%' },
  { name: 'Athena', src: '/zdjecia/hero/athena.webp', pos: '50% 34%', posMobile: '50% 32%' },
]

/** Ile pierścionków (i miniatur) pokazuje witryna w hero; losowane z całego katalogu przy każdym wejściu. */
export const VITRINE_SIZE = 5

/**
 * Losowa kolejność witryny (Fisher–Yates, nowa tablica). Strona główna renderuje się przy każdym wejściu
 * (`force-dynamic`), więc po każdym odświeżeniu na start pokazuje się inny pierścionek (prośba Michała, 25.11.2026).
 * Kolejność liczy serwer, więc przeglądarka dostaje gotowy HTML bez przeskoku po załadowaniu.
 */
export function shuffleVitrine<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Pierścionek z hero (po nazwie; bez niego pierwszy z katalogu). */
export const HERO_RING_NAME = 'Phoebe'

/** Zapas, gdy w panelu nic nie zaznaczono: kolejność z wcześniejszej wersji strony (Nyx i Pyrrha to od zlecenia AB warianty Uranii, a Eirene i Leto – Harmonii). */
export const HOME_RINGS_FALLBACK = ['Phoebe', 'Harmonia', 'Athena', 'Urania', 'Cyane', 'Daphne']

export function heroRing<T extends { name: string }>(products: readonly T[]): T | undefined {
  return products.find((p) => p.name === HERO_RING_NAME) ?? products[0]
}

/**
 * Pierścionki „na główną”: zaznaczone w panelu (`featuredOnHome`) wg pola `homeOrder`, potem wg kolejności katalogu.
 * Pierścionka z hero nie powtarzamy w siatce. Gdy zaznaczono mniej niż `limit` (albo nic), siatkę uzupełnia lista
 * zapasowa `HOME_RINGS_FALLBACK`, żeby w rzędzie nie było dziury.
 */
export function pickHomeRings(
  products: readonly SiteProduct[],
  hero: { slug: string } | undefined,
  limit: number = HOME_RINGS_LIMIT,
): SiteProduct[] {
  const rest = products.filter((p) => p.slug !== hero?.slug)
  const chosen = rest
    .filter((p) => p.featuredOnHome)
    .sort((a, b) => a.homeOrder - b.homeOrder)
    .slice(0, limit)
  if (chosen.length >= limit) return chosen
  const fill = pickByName(
    rest.filter((p) => !chosen.includes(p)),
    HOME_RINGS_FALLBACK,
    limit - chosen.length,
  )
  return [...chosen, ...fill]
}
