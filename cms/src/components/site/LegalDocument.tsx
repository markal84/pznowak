import { Fragment, type ReactNode } from 'react'
import { type LegalItem, parseLegal } from '@/lib/legal-markdown'

const EMAIL = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/

/**
 * Adresy e-mail jako osobne linki `mailto:`. Cloudflare (Email Obfuscation) podmienia w HTML adres na swój
 * element, a jego skrypt odtwarza go jako osobny węzeł tekstowy. Gdy adres siedział w środku zwykłego tekstu
 * („E-mail: kontakt@…”), drzewo w przeglądarce rozjeżdżało się z tym z serwera i React rzucał błąd hydratacji #418.
 */
function withEmails(text: string, key: string): ReactNode {
  return text.split(EMAIL).map((part, i) =>
    i % 2 === 1 ? (
      <a className="legal-link" href={`mailto:${part}`} key={`${key}-${i}`}>
        {part}
      </a>
    ) : part ? (
      <Fragment key={`${key}-${i}`}>{part}</Fragment>
    ) : null,
  )
}

/** Pogrubienia `**…**` w tekście dokumentu. */
function inline(text: string): ReactNode {
  return text.split(/\*\*(.+?)\*\*/).map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{withEmails(part, String(i))}</strong> : withEmails(part, String(i)),
  )
}

function renderItems(items: LegalItem[]): ReactNode {
  return items.map((item, i) => (
    <li key={i}>
      {inline(item.text)}
      {item.children.length ? <ul>{renderItems(item.children)}</ul> : null}
    </li>
  ))
}

/** Regulamin albo polityka prywatności: tekst z `content/legal.ts`, bez zmian w treści. Działa na serwerze. */
export default function LegalDocument({ lines }: { lines: readonly string[] }) {
  const { title, blocks } = parseLegal(lines)
  return (
    <article className="legal wrap">
      <h1 className="h1 legal-title">{title}</h1>
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'h2':
            return (
              <h2 className="legal-h2" key={i}>
                {block.text}
              </h2>
            )
          case 'ol':
            return (
              <ol className="legal-list" key={i}>
                {renderItems(block.items)}
              </ol>
            )
          case 'ul':
            return (
              <ul className="legal-list" key={i}>
                {renderItems(block.items)}
              </ul>
            )
          case 'p':
            return (
              <p className="legal-p" key={i}>
                {inline(block.text)}
              </p>
            )
        }
      })}
    </article>
  )
}
