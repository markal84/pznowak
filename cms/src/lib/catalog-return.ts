/**
 * Powrót z karty pierścionka na listę w to samo miejsce. Przy kliknięciu karty zapamiętujemy w sessionStorage, który
 * pierścionek i która strona/filtry listy to były. Lista przewija do tej karty tylko wtedy, gdy wracamy świadomie
 * (okruszek „Pierścionki” albo „wstecz” przeglądarki), a nie przy zwykłym wejściu z menu.
 */
const KEY = 'pn:catalog-return'

type Saved = { slug: string; href: string; back: boolean }

function read(): Saved | null {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    const data = raw ? (JSON.parse(raw) as Partial<Saved>) : null
    if (data && typeof data.slug === 'string' && typeof data.href === 'string') {
      return { slug: data.slug, href: data.href, back: data.back === true }
    }
  } catch {
    // sessionStorage może być zablokowane (tryb prywatny); wtedy działa zwykła lista.
  }
  return null
}

function write(data: Saved | null) {
  try {
    if (data) window.sessionStorage.setItem(KEY, JSON.stringify(data))
    else window.sessionStorage.removeItem(KEY)
  } catch {
    // jw.
  }
}

export const ringAnchorId = (slug: string) => `pierscionek-${slug}`

/** Wywoływane przy kliknięciu karty na liście. */
export function rememberCatalogRing(slug: string) {
  write({ slug, href: window.location.pathname + window.location.search, back: false })
}

/** Adres listy, z której wszedłeś na kartę tego pierścionka (strona i filtry), albo zwykła lista. */
export function catalogReturnHref(slug: string): string {
  const saved = read()
  return saved && saved.slug === slug ? saved.href : '/pierscionki'
}

/** Wywoływane przy powrocie na listę (okruszek albo „wstecz”). */
export function markCatalogReturn() {
  const saved = read()
  if (saved) write({ ...saved, back: true })
}

/** Lista po wczytaniu pyta, do którego pierścionka przewinąć; zapis jest jednorazowy. */
export function takeCatalogReturn(): string | null {
  const saved = read()
  write(null)
  return saved?.back ? saved.slug : null
}
