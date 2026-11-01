/**
 * Czysta logika seeda „Realizacje” (bez bazy), żeby dało się ją sprawdzić testem: dopasowanie karty z katalogu
 * i decyzja, czy istniejącej realizacji wolno poprawić kolejność zdjęć.
 */
import type { SeedWork } from './realizacje-data'

export type CatalogProduct = {
  id: number
  name: string
  status?: string | null
  archived?: boolean | null
  /** `source.facebookPayload` karty z importu z Facebooka (posty źródłowe z `postId` i adresem). */
  facebookPayload?: unknown
}

export type ProductMatch = { product: CatalogProduct; by: 'post' | 'nazwa' } | null

/** Link ma sens tylko do karty opublikowanej i niezarchiwizowanej; reszta zostaje bez linku do następnego uruchomienia. */
const linkable = (product: CatalogProduct) => product.status === 'published' && !product.archived

/** Karta z katalogu dla realizacji: najpierw po id posta z Facebooka w danych źródłowych, potem po dokładnej nazwie. */
export function matchProduct(products: readonly CatalogProduct[], wanted: SeedWork['product']): ProductMatch {
  if (!wanted) return null
  const usable = products.filter(linkable)
  for (const postId of wanted.postIds ?? []) {
    const found = usable.find((product) => JSON.stringify(product.facebookPayload ?? null).includes(postId))
    if (found) return { product: found, by: 'post' }
  }
  const names = [wanted.name, ...(wanted.altNames ?? [])].filter((name): name is string => Boolean(name))
  const byName = names.length ? usable.find((product) => names.includes(product.name)) : undefined
  return byName ? { product: byName, by: 'nazwa' } : null
}

type PhotoRef = { file: string | null; alt: string }
const sameOrder = (a: readonly PhotoRef[], b: readonly PhotoRef[]) =>
  a.length === b.length && a.every((photo, i) => photo.file === b[i].file && photo.alt === b[i].alt)

export type PhotoPlan = 'aktualne' | 'przestaw' | 'reczne'

/**
 * Czy zdjęcia istniejącej realizacji trzeba przestawić na układ z seeda? Tylko gdy są dokładnie takie (pliki, kolejność
 * i opisy), jak zrobiła je wcześniejsza wersja seeda; wszystko inne to ręczna zmiana, której nie ruszamy.
 */
export function planPhotos(current: readonly PhotoRef[], work: SeedWork): PhotoPlan {
  if (sameOrder(current, work.photos)) return 'aktualne'
  if (work.previousPhotos && sameOrder(current, work.previousPhotos)) return 'przestaw'
  return 'reczne'
}
