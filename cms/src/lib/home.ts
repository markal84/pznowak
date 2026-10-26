import { pickByName } from './catalog'
import type { SiteProduct } from './public-products'

/** Ile pierścionków pokazuje sekcja „Wybrane pierścionki” na stronie głównej. */
export const HOME_RINGS_LIMIT = 4

/** Pierścionek z hero (po nazwie; bez niego pierwszy z katalogu). */
export const HERO_RING_NAME = 'Phoebe'

/** Zapas, gdy w panelu nic nie zaznaczono: kolejność z wcześniejszej wersji strony. */
export const HOME_RINGS_FALLBACK = ['Phoebe', 'Harmonia', 'Athena', 'Nyx', 'Pyrrha', 'Cyane', 'Eirene', 'Daphne']

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
