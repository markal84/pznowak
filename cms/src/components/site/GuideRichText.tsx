import { Fragment, type ReactNode } from 'react'
import Link from 'next/link'

import RingSizeTool from '@/components/site/RingSizeTool'
import type { GuideBodyBlock, GuideStoneBlock, LexicalNode, RichTextValue } from '@/lib/guide-types'
import { formatNumberPl, ringSizeTable } from '@/lib/ring-size'

/**
 * Tekst poradnika z Payload (stan edytora Lexical) jako HTML strony. Własny, mały renderer zamiast gotowego z Payload,
 * żeby znaczniki były dokładnie takie jak w poradnikach pisanych wcześniej w kodzie (bez dodatkowych klas i atrybutów).
 * Obsługuje: akapity, pogrubienie, kursywę, linki, listy, H3 i bloki osadzone poradników.
 */

export type GuideRenderContext = {
  /** Najniższa cena z kolekcji („od 1900 zł”); `null`, gdy żaden pierścionek nie ma ceny. */
  lowestPrice: string | null
  /** Kamienie poradnika (bloki „Kamień”) do tabeli porównania. */
  stones: readonly GuideStoneBlock[]
}

const IS_BOLD = 1
const IS_ITALIC = 1 << 1

function formatText(node: LexicalNode, context: GuideRenderContext): ReactNode {
  let text = node.text ?? ''
  if (text.includes('{cena}')) text = text.replaceAll('{cena}', context.lowestPrice ?? '')
  const format = typeof node.format === 'number' ? node.format : 0
  let result: ReactNode = text
  if (format & IS_ITALIC) result = <em>{result}</em>
  if (format & IS_BOLD) result = <strong>{result}</strong>
  return result
}

function renderLink(node: LexicalNode, children: ReactNode, key: number): ReactNode {
  const url = typeof node.fields?.url === 'string' ? node.fields.url.trim() : ''
  if (!url) return <Fragment key={key}>{children}</Fragment>
  if (node.fields?.newTab) {
    return (
      <a href={url} key={key} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    )
  }
  if (url.startsWith('/') && !url.startsWith('//')) {
    return (
      <Link href={url} key={key}>
        {children}
      </Link>
    )
  }
  return (
    <a href={url} key={key}>
      {children}
    </a>
  )
}

export function renderNodes(nodes: readonly LexicalNode[] | undefined, context: GuideRenderContext): ReactNode[] {
  return (nodes ?? []).map((node, index) => renderNode(node, index, context))
}

function renderNode(node: LexicalNode, key: number, context: GuideRenderContext): ReactNode {
  const children = () => renderNodes(node.children, context)
  switch (node.type) {
    case 'text':
      return <Fragment key={key}>{formatText(node, context)}</Fragment>
    case 'linebreak':
      return <br key={key} />
    case 'tab':
      return <Fragment key={key}>{'\t'}</Fragment>
    case 'paragraph':
      // Pusty akapit (Enter na końcu tekstu w edytorze) nie daje pustego <p>.
      return node.children?.length ? <p key={key}>{children()}</p> : null
    case 'heading': {
      const Tag = node.tag === 'h4' ? 'h4' : 'h3'
      return <Tag key={key}>{children()}</Tag>
    }
    case 'list':
      return node.listType === 'number' ? <ol key={key}>{children()}</ol> : <ul key={key}>{children()}</ul>
    case 'listitem':
      return <li key={key}>{children()}</li>
    case 'link':
    case 'autolink':
      return renderLink(node, children(), key)
    case 'block':
      return <Fragment key={key}>{renderBodyBlock(node.fields as unknown as GuideBodyBlock, context)}</Fragment>
    default:
      return node.children ? <Fragment key={key}>{children()}</Fragment> : null
  }
}

/** Cały tekst (np. treść sekcji). */
export function GuideRichText({ value, context }: { value: RichTextValue; context: GuideRenderContext }) {
  return <>{renderNodes(value?.root?.children, context)}</>
}

/** Akapity tekstu jako osobne `<p className=…>` (wyróżniona uwaga). */
function paragraphsWithClass(value: RichTextValue, className: string, context: GuideRenderContext): ReactNode {
  return (value?.root?.children ?? []).map((node, index) =>
    node.children?.length ? (
      <p className={className} key={index}>
        {renderNodes(node.children, context)}
      </p>
    ) : null,
  )
}

/** Środek przedziału twardości z zapisu „7,5–8”; do ułożenia tabeli od najtwardszego do najbardziej miękkiego kamienia. */
export const mohsMidpoint = (mohs: string) => {
  const values = mohs.split(/[–-]/).map((part) => Number(part.trim().replace(',', '.')))
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function RingSizeFigure({ caption }: { caption: string }) {
  return (
    <figure className="guide-figure">
      <svg aria-labelledby="rys-rozmiar" role="img" viewBox="0 0 560 220">
        <title id="rys-rozmiar">
          Pierścionek widziany z przodu: średnica wewnętrzna mierzona w najszerszym miejscu i obwód wewnętrzny
        </title>
        <circle cx="150" cy="110" fill="none" r="78" stroke="currentColor" strokeWidth="14" />
        <line stroke="var(--patina)" strokeWidth="2" x1="79" x2="221" y1="110" y2="110" />
        <path d="M79 110 l10 -6 v12 z M221 110 l-10 -6 v12 z" fill="var(--patina)" />
        <text fill="var(--patina)" fontSize="15" textAnchor="middle" x="150" y="100">
          średnica wewnętrzna
        </text>
        <circle cx="410" cy="110" fill="none" r="78" stroke="currentColor" strokeWidth="14" />
        <circle cx="410" cy="110" fill="none" r="69" stroke="var(--patina)" strokeDasharray="6 6" strokeWidth="2" />
        <text fill="var(--patina)" fontSize="15" textAnchor="middle" x="410" y="106">
          obwód wewnętrzny
        </text>
        <text fill="var(--patina)" fontSize="15" textAnchor="middle" x="410" y="126">
          = średnica × 3,14
        </text>
      </svg>
      {caption ? <figcaption className="fig-cap">{caption}</figcaption> : null}
    </figure>
  )
}

function renderBodyBlock(block: GuideBodyBlock | undefined, context: GuideRenderContext): ReactNode {
  switch (block?.blockType) {
    case 'ringSizeCalculator':
      return <RingSizeTool />
    case 'ringSizeFigure':
      return <RingSizeFigure caption={block.figcaption ?? ''} />
    case 'ringSizeTable':
      return (
        <div className="guide-table-wrap">
          <table className="guide-table">
            {block.caption ? <caption className="sr-only">{block.caption}</caption> : null}
            <thead>
              <tr>
                <th scope="col">Rozmiar polski</th>
                <th scope="col">Obwód wewnętrzny (rozmiar europejski)</th>
                <th scope="col">Średnica wewnętrzna</th>
                <th scope="col">Rozmiar amerykański</th>
              </tr>
            </thead>
            <tbody>
              {ringSizeTable().map((row) => (
                <tr key={row.pl}>
                  <th scope="row">{row.pl}</th>
                  <td>{row.circumferenceMm} mm</td>
                  <td>{formatNumberPl(row.diameterMm)} mm</td>
                  <td>ok. {formatNumberPl(row.us, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'stoneComparison': {
      const stones = [...context.stones].sort((a, b) => mohsMidpoint(b.mohs) - mohsMidpoint(a.mohs))
      return (
        <div className="guide-table-wrap">
          <table className="guide-table">
            {block.caption ? <caption className="sr-only">{block.caption}</caption> : null}
            <thead>
              <tr>
                <th scope="col">Kamień</th>
                <th scope="col">Twardość (Mohs)</th>
                <th scope="col">Kolory</th>
                <th scope="col">Na co dzień</th>
              </tr>
            </thead>
            <tbody>
              {stones.map((s) => (
                <tr key={s.anchor}>
                  <th scope="row">
                    <a href={`#${s.anchor}`}>{s.name}</a>
                  </th>
                  <td>{s.mohs}</td>
                  <td>{s.colors}</td>
                  <td>{s.daily}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    case 'dataTable':
      return (
        <div className="guide-table-wrap">
          <table className="guide-table">
            {block.caption ? <caption className="sr-only">{block.caption}</caption> : null}
            <thead>
              <tr>
                {(block.columns ?? []).map((column, index) => (
                  <th key={index} scope="col">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(block.rows ?? []).map((row, index) => (
                <tr key={index}>
                  <th scope="row">{row.label}</th>
                  {(row.cells ?? []).map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell.text}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'note':
      return paragraphsWithClass(block.text, 'guide-note', context)
    case 'ifPrices':
      return <GuideRichText context={context} value={context.lowestPrice !== null ? block.withPrices : block.withoutPrices} />
    default:
      return null
  }
}
