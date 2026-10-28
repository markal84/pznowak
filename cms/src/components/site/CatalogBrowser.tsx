'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  GOLD_FILTERS,
  STONE_FILTERS,
  filterRings,
  pluralRing,
  type CatalogRing,
  type GoldGroup,
  type StoneGroup,
} from '@/lib/catalog'
import RingCard from './RingCard'

export default function CatalogBrowser({ rings }: { rings: CatalogRing[] }) {
  const [stone, setStone] = useState<'all' | StoneGroup>('all')
  const [gold, setGold] = useState<'all' | GoldGroup>('all')
  const items = filterRings(rings, stone, gold)
  const filtered = stone !== 'all' || gold !== 'all'
  const clear = () => {
    setStone('all')
    setGold('all')
  }
  const countLabel = filtered
    ? `Pasujące do filtrów: ${items.length} ${pluralRing(items.length)}`
    : `${items.length} ${pluralRing(items.length)} w kolekcji`

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
                  onClick={() => setStone(s.id)}
                  type="button"
                >
                  {s.color ? <span aria-hidden="true" className="chip-dot" style={{ background: s.color }} /> : null}
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
                <button aria-pressed={gold === g.id} className="chip" key={g.id} onClick={() => setGold(g.id)} type="button">
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
          {filtered ? (
            <button className="linkbtn" onClick={clear} type="button">
              Wyczyść filtry
            </button>
          ) : null}
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 28, paddingBottom: 104 }}>
        {items.length > 0 ? (
          <ul className="ring-grid ring-grid-lg">
            {items.map((r) => (
              <RingCard
                alt={r.alt}
                detailed
                image={r.image}
                key={r.slug}
                gold={r.goldLabel}
                name={r.name}
                sizes="(max-width: 720px) 50vw, (max-width: 1320px) 30vw, 300px"
                slug={r.slug}
                stone={r.stone}
              />
            ))}
            <li className="cta-card">
              <span className="big">Nie ma tu Twojego pierścionka?</span>
              <p>Zaprojektujemy go od podstaw. Zacznij od kilku zdań o tym, dla kogo ma powstać.</p>
              <Link className="btn btn-light" href="/na-zamowienie" style={{ alignSelf: 'flex-start' }}>
                Pierścionek na zamówienie
              </Link>
            </li>
          </ul>
        ) : (
          <div className="stack" style={{ alignItems: 'flex-start', gap: 18, padding: '56px 0 24px', maxWidth: '36em' }}>
            <h2 className="h2" style={{ fontSize: 36, lineHeight: 1.1 }}>
              Nie mamy jeszcze takiego połączenia w kolekcji
            </h2>
            <p className="text" style={{ fontSize: 16 }}>
              Każdy projekt możemy wykonać w innym kolorze złota albo z innym kamieniem. Wyczyść filtry albo napisz,
              czego szukasz.
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
