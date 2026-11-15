import type { ReactNode } from 'react'

/** `text`: odpowiedź zwykłym tekstem do danych strukturalnych, gdy `a` zawiera link albo inne znaczniki. */
export type FaqItem = { q: string; a: ReactNode; text?: string }

/** Pytania w postaci dla `faqJsonLd`: tekst odpowiedzi z `text`, a gdy go brak, z `a` będącego zwykłym tekstem. */
export function faqPlainItems(items: readonly FaqItem[]): { q: string; text?: string }[] {
  return items.map(({ q, a, text }) => ({ q, text: text ?? (typeof a === 'string' ? a : undefined) }))
}

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
