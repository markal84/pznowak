import { createHash } from 'node:crypto'

import type { LexicalNode, RichTextValue } from '../lib/guide-types'

/**
 * Budowanie stanu edytora Lexical (format Payload) z krótkiego zapisu: `**pogrubienie**`, `*kursywa*`,
 * `[tekst linku](/adres)`. Używane przez treść startową poradników (src/content/guides-seed.ts) i testy.
 */

const IS_BOLD = 1
const IS_ITALIC = 2

let counter = 0
/** Stałe identyfikatory (24 znaki szesnastkowe jak w Payload), żeby kolejne uruchomienia dawały ten sam JSON. */
const nextId = () => createHash('sha1').update(`guide-seed-${counter++}`).digest('hex').slice(0, 24)

const textNode = (text: string, format = 0): LexicalNode => ({
  type: 'text',
  version: 1,
  text,
  format,
  detail: 0,
  mode: 'normal',
  style: '',
})

const element = (type: string, children: LexicalNode[], extra: Record<string, unknown> = {}): LexicalNode => ({
  type,
  version: 1,
  children,
  direction: 'ltr',
  format: '',
  indent: 0,
  ...extra,
})

const INLINE = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g

/** Tekst z `**…**`, `*…*` i `[…](…)` jako węzły Lexical. */
export function inline(source: string): LexicalNode[] {
  const nodes: LexicalNode[] = []
  let last = 0
  for (const match of source.matchAll(INLINE)) {
    if (match.index > last) nodes.push(textNode(source.slice(last, match.index)))
    if (match[1] !== undefined) nodes.push(textNode(match[1], IS_BOLD))
    else if (match[2] !== undefined) nodes.push(textNode(match[2], IS_ITALIC))
    else nodes.push(link(match[4], match[3]))
    last = match.index + match[0].length
  }
  if (last < source.length) nodes.push(textNode(source.slice(last)))
  return nodes
}

export const link = (url: string, label: string): LexicalNode => ({
  ...element('link', inline(label)),
  version: 3,
  id: nextId(),
  fields: { linkType: 'custom', url, newTab: false },
})

export const p = (source: string): LexicalNode => element('paragraph', inline(source), { textFormat: 0, textStyle: '' })

export const h3 = (source: string): LexicalNode => element('heading', inline(source), { tag: 'h3' })

const list = (listType: 'bullet' | 'number', items: string[]): LexicalNode =>
  element(
    'list',
    items.map((item, index) => element('listitem', inline(item), { value: index + 1 })),
    { listType, tag: listType === 'number' ? 'ol' : 'ul', start: 1 },
  )

export const ol = (...items: string[]) => list('number', items)
export const ul = (...items: string[]) => list('bullet', items)

export const block = (blockType: string, fields: Record<string, unknown> = {}): LexicalNode => ({
  type: 'block',
  version: 2,
  format: '',
  fields: { id: nextId(), blockName: '', blockType, ...fields },
})

export const doc = (...children: LexicalNode[]): RichTextValue => ({
  root: element('root', children),
})

/** Kilka akapitów z samych tekstów. */
export const paragraphs = (...sources: string[]): RichTextValue => doc(...sources.map(p))
