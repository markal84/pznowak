'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import {
  GOLD_FILTERS,
  STONE_FILTERS,
  catalogHref,
  filterRings,
  paginate,
  parseCatalogParams,
  pluralRing,
  sortRings,
  VISIBLE_CATALOG_SORTS,
  type CatalogRing,
  type CatalogParams,
  type CatalogSort,
} from '@/lib/catalog'
import { rememberCatalogRing, ringAnchorId, takeCatalogReturn } from '@/lib/catalog-return'
import RingCard from './RingCard'

/** Pierwszy rząd siatki (4 karty na komputerze, 2 rzędy po 2 na telefonie) ładuje zdjęcia od razu: to element LCP. */
const EAGER_CARDS = 4

export default function CatalogBrowser({ rings }: { rings: CatalogRing[] }) {
  const router = useRouter()
  // Powrót z karty pierścionka (okruszek albo „wstecz”): przewiń do rzędu klikniętej karty.
  useEffect(() => {
    const slug = takeCatalogReturn()
    if (!slug) return
    const card = document.getElementById(ringAnchorId(slug))
    if (card) card.scrollIntoView({ block: 'center' })
  }, [])
  const searchParams = useSearchParams()
  // Filtry, sortowanie i numer strony żyją w adresie: odświeżenie, link i „wstecz” przeglądarki wracają do tego samego widoku.
  const {
    stone,
    gold,
    sort,
    page: requestedPage,
  } = parseCatalogParams((key) => searchParams.get(key))
  const all = sortRings(filterRings(rings, stone, gold), sort)
  const { items, page, pages } = paginate(all, requestedPage)
  const filtered = stone !== 'all' || gold !== 'all'
  // Zmiana filtra albo sortowania wraca na pierwszą stronę.
  const setFilters = (next: Partial<CatalogParams>) =>
    router.replace(catalogHref({ stone, gold, sort, page: 1, ...next }), { scroll: false })
  const clear = () => setFilters({ stone: 'all', gold: 'all' })
  const countLabel = filtered
    ? `Pasujące do filtrów: ${all.length} ${pluralRing(all.length)}`
    : `${all.length} ${pluralRing(all.length)} w kolekcji`

  return (
    <>
      <section aria-label="Filtry" className="wrap stack" style={{ gap: 18 }}>
        <div className="filters">
          <div aria-labelledby="f-kamien" className="chip-group" role="group">
            <span className="chip-label" id="f-kamien">
              Kolor kamienia
            </span>
            <div className="chip-row">
              {STONE_FILTERS.map((s) => (
                <button
                  aria-pressed={stone === s.id}
                  className="chip"
                  key={s.id}
                  onClick={() => setFilters({ stone: s.id })}
                  type="button"
                >
                  {s.color ? (
                    <span aria-hidden="true" className="chip-dot" style={{ background: s.color }} />
                  ) : null}
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div aria-labelledby="f-zloto" className="chip-group" role="group">
            <span className="chip-label" id="f-zloto">
              Kolor złota
            </span>
            <div className="chip-row">
              {GOLD_FILTERS.map((g) => (
                <button
                  aria-pressed={gold === g.id}
                  className="chip"
                  key={g.id}
                  onClick={() => setFilters({ gold: g.id })}
                  type="button"
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', gap: '8px 24px' }}>
          <p aria-live="polite" style={{ fontSize: 15, color: 'var(--graphite-2)' }}>
            {countLabel}
          </p>
          <div className="row" style={{ gap: '8px 24px' }}>
            {filtered ? (
              <button className="linkbtn" onClick={clear} type="button">
                Wyczyść filtry
              </button>
            ) : null}
            <label className="sort">
              <span className="chip-label">Sortuj</span>
              <select
                className="sort-select"
                onChange={(event) => setFilters({ sort: event.target.value as CatalogSort })}
                value={sort}
              >
                {VISIBLE_CATALOG_SORTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 28, paddingBottom: 104 }}>
        {all.length > 0 ? (
          <>
            <ul
              className="ring-grid ring-grid-lg"
              onClickCapture={(event) => {
                const link = (event.target as HTMLElement).closest<HTMLElement>('a[data-ring-slug]')
                if (link?.dataset.ringSlug) rememberCatalogRing(link.dataset.ringSlug)
              }}
            >
              {items.map((r, index) => (
                <RingCard
                  alt={r.alt}
                  detailed
                  eager={index < EAGER_CARDS}
                  image={r.image}
                  key={r.slug}
                  gold={r.goldLabel}
                  name={r.name}
                  price={r.price}
                  sizes="(max-width: 720px) 50vw, (max-width: 1320px) 30vw, 300px"
                  slug={r.slug}
                  stone={r.stone}
                />
              ))}
              {page === pages ? (
                <li className="cta-card">
                  <span className="big">Nie ma tu Twojego pierścionka?</span>
                  <p>
                    Zaprojektujemy go od podstaw. Zacznij od kilku zdań o tym, dla kogo ma powstać.
                  </p>
                  <Link
                    className="btn btn-light"
                    href="/na-zamowienie"
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Pierścionek na zamówienie
                  </Link>
                </li>
              ) : null}
            </ul>
            {pages > 1 ? (
              <nav aria-label="Strony listy" className="pager">
                {page > 1 ? (
                  <Link
                    className="pager-link"
                    href={catalogHref({ stone, gold, sort, page: page - 1 })}
                    rel="prev"
                  >
                    Poprzednia
                  </Link>
                ) : null}
                <ol>
                  {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                    <li key={n}>
                      <Link
                        aria-current={n === page ? 'page' : undefined}
                        aria-label={`Strona ${n}`}
                        className="pager-link"
                        href={catalogHref({ stone, gold, sort, page: n })}
                      >
                        {n}
                      </Link>
                    </li>
                  ))}
                </ol>
                {page < pages ? (
                  <Link
                    className="pager-link"
                    href={catalogHref({ stone, gold, sort, page: page + 1 })}
                    rel="next"
                  >
                    Następna
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </>
        ) : (
          <div
            className="stack"
            style={{ alignItems: 'flex-start', gap: 18, padding: '56px 0 24px', maxWidth: '36em' }}
          >
            <h2 className="h2" style={{ fontSize: 36, lineHeight: 1.1 }}>
              Nie mamy jeszcze takiego połączenia w kolekcji
            </h2>
            <p className="text" style={{ fontSize: 16 }}>
              Każdy projekt możemy wykonać w innym kolorze złota albo z innym kamieniem. Wyczyść
              filtry albo napisz, czego szukasz.
            </p>
            <div className="row" style={{ gap: '12px 24px' }}>
              <button className="btn" onClick={clear} type="button">
                Pokaż wszystkie pierścionki
              </button>
              <Link className="tl" href="/kontakt?temat=kolekcja">
                Zapytaj o projekt
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
