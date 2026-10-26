import type { ReactNode } from 'react'

export type FaqItem = { q: string; a: ReactNode }

export default function Faq({ items, openFirst = true }: { items: readonly FaqItem[]; openFirst?: boolean }) {
  return (
    <div className="faq">
      {items.map((item, i) => (
        <details key={item.q} open={openFirst && i === 0}>
          <summary>
            {item.q}
            <span aria-hidden="true" className="plus">
              +
            </span>
          </summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  )
}
