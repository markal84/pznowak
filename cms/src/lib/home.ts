import { pickByName } from './catalog'
import type { SiteProduct } from './public-products'

/** Ile pierścionków pokazuje sekcja „Wybrane pierścionki” na stronie głównej. */
export const HOME_RINGS_LIMIT = 4

/**
 * Witryna w hero strony głównej: pierścionki z katalogu (po nazwie) i ich najlepsze zdjęcia w pełnej rozdzielczości
 * (sesja z Facebooka, 1320 × 1980 px, w `public/zdjecia/hero/`). Kolejność = kolejność miniatur; pierwszy pokazuje się od razu.
 * `pos` to kadr na komputerze (wysoki panel), `posMobile` na telefonie (niski, szeroki kadr). Pierścionek, którego nie ma
 * w opublikowanym katalogu, jest pomijany, więc zmiana nazwy w panelu niczego nie psuje.
 */
export const HERO_VITRINE: readonly { name: string; src: string; pos: string; posMobile: string }[] = [
  { name: 'Phoebe', src: '/zdjecia/hero/phoebe.webp', pos: '50% 30%', posMobile: '50% 32%' },
  { name: 'Thalia', src: '/zdjecia/hero/thalia.webp', pos: '50% 34%', posMobile: '50% 30%' },
  { name: 'Cyane', src: '/zdjecia/hero/cyane.webp', pos: '50% 36%', posMobile: '50% 38%' },
  { name: 'Eirene', src: '/zdjecia/hero/eirene.webp', pos: '50% 40%', posMobile: '50% 40%' },
  { name: 'Athena', src: '/zdjecia/hero/athena.webp', pos: '50% 34%', posMobile: '50% 32%' },
]

/** Pierścionek z hero (po nazwie; bez niego pierwszy z katalogu). */
export const HERO_RING_NAME = 'Phoebe'

/** Zapas, gdy w panelu nic nie zaznaczono: kolejność z wcześniejszej wersji strony (Nyx i Pyrrha to od zlecenia AB warianty Uranii). */
export const HOME_RINGS_FALLBACK = ['Phoebe', 'Harmonia', 'Athena', 'Urania', 'Cyane', 'Eirene', 'Daphne']

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
