'use client'

import Link from 'next/link'
import { useState } from 'react'
import Photo from './Photo'
import Tag from './Tag'

export type Work = { id: number; kind: 'zamowienie' | 'naprawa'; kindLabel: string; title: string; text: string; image: string; alt: string }

const KINDS = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'zamowienie', label: 'Na zamówienie' },
  { id: 'naprawa', label: 'Naprawy i przeróbki' },
] as const

export default function WorksBrowser({ works }: { works: Work[] }) {
  const [kind, setKind] = useState<(typeof KINDS)[number]['id']>('all')
  const items = works.filter((w) => kind === 'all' || w.kind === kind)

  return (
    <section className="wrap stack" style={{ paddingBottom: 104, gap: 28 }}>
      <div aria-label="Rodzaj realizacji" className="row" role="group" style={{ gap: 10, borderTop: '1px solid var(--line)', paddingTop: 24 }}>
        {KINDS.map((c) => (
          <button aria-pressed={c.id === kind} className="chip" key={c.id} onClick={() => setKind(c.id)} type="button">
            {c.label}
          </button>
        ))}
      </div>
      {items.length > 0 ? (
        <ul className="work-grid">
          {items.map((w) => (
            <li className="work-card stack" key={w.id} style={{ gap: 14 }}>
              <span className="card-overlay">
                <Photo alt={w.alt} sizes="(max-width: 720px) 50vw, 240px" src={w.image} />
                <Tag className="tag-corner" name={w.kindLabel} />
              </span>
              <h3>{w.title}</h3>
              <p>{w.text}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="row" style={{ gap: 24, justifyContent: 'space-between', padding: 40, background: 'var(--shade)' }}>
          <p style={{ maxWidth: '34em', fontSize: 16, lineHeight: 1.6 }}>
            Zdjęcia napraw „przed i po” dopiero zbieramy. Do tego czasu zobacz, jak pracujemy z biżuterią z historią.
          </p>
          <Link className="btn" href="/naprawy">Naprawy i przeróbki</Link>
        </div>
      )}
    </section>
  )
}
