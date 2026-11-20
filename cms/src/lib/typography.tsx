import { Fragment, type ReactNode } from 'react'

/**
 * Twarda spacja po jednoliterowych słowach (i, w, z, o, a, u), żeby nie zostawały na końcu linii.
 * Dla tekstów z panelu, które wcześniej miały w kodzie ręcznie wstawione ` `.
 */
export function keepShortWords(text: string): string {
  return text.replace(/(?<=^|[\s („])([aiouwzAIOUWZ]) +/g, '$1 ')
}

/**
 * Nagłówek z fragmentem w gwiazdkach: „Rzemiosło, które docenisz. *Biżuteria, którą pokochasz.*” →
 * `<span className={plain}>…</span> <em className={emphasis}>…</em>`. Fragmenty rozdziela spacja.
 */
export function starredHeading(text: string, classNames: { plain?: string; emphasis?: string } = {}): ReactNode {
  const parts = text
    .split(/(\*[^*]+\*)/)
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.map((part, index) => {
    const starred = part.length > 2 && part.startsWith('*') && part.endsWith('*')
    return (
      <Fragment key={index}>
        {index > 0 ? ' ' : null}
        {starred ? (
          <em className={classNames.emphasis}>{part.slice(1, -1).trim()}</em>
        ) : (
          <span className={classNames.plain}>{part}</span>
        )}
      </Fragment>
    )
  })
}
