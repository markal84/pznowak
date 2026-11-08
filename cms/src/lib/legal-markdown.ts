/**
 * Zamiana tekstu regulaminu i polityki (wiersze z `content/legal.ts`) na bloki do wyrenderowania.
 * Obsługuje tylko to, czego używają dokumenty: nagłówek `#` (tytuł strony), `##` (paragrafy), akapity,
 * listy numerowane `1.` i punktowane `-` oraz zagnieżdżone punkty wcięte spacjami. `**tekst**` to pogrubienie.
 */

export type LegalItem = { text: string; children: LegalItem[] }

type OpenList = { kind: 'ol' | 'ul'; items: LegalItem[] }

export type LegalBlock =
  | { kind: 'h2'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ol' | 'ul'; items: LegalItem[] }

export type LegalDocument = { title: string; blocks: LegalBlock[] }

export function parseLegal(lines: readonly string[]): LegalDocument {
  const blocks: LegalBlock[] = []
  const state: { title: string; paragraph: string[]; list: OpenList | null } = { title: '', paragraph: [], list: null }

  const endParagraph = () => {
    if (state.paragraph.length) blocks.push({ kind: 'p', text: state.paragraph.join(' ') })
    state.paragraph = []
  }
  const endList = () => {
    const done = state.list
    if (done) blocks.push(done)
    state.list = null
  }
  const addItem = (kind: 'ol' | 'ul', text: string) => {
    endParagraph()
    const current = state.list
    if (current && current.kind === kind) {
      current.items.push({ text, children: [] })
      return
    }
    endList()
    state.list = { kind, items: [{ text, children: [] }] }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      endParagraph()
      endList()
      continue
    }
    const heading = /^# (.+)$/.exec(line)
    if (heading) {
      state.title = heading[1]
      continue
    }
    const section = /^## (.+)$/.exec(line)
    if (section) {
      endParagraph()
      endList()
      blocks.push({ kind: 'h2', text: section[1] })
      continue
    }
    const nested = /^\s+- (.+)$/.exec(line)
    const parent = state.list?.items[state.list.items.length - 1]
    if (nested && parent) {
      parent.children.push({ text: nested[1], children: [] })
      continue
    }
    const bullet = /^- (.+)$/.exec(line)
    if (bullet) {
      addItem('ul', bullet[1])
      continue
    }
    const numbered = /^\d+\. (.+)$/.exec(line)
    if (numbered) {
      addItem('ol', numbered[1])
      continue
    }
    endList()
    state.paragraph.push(line.trim())
  }
  endParagraph()
  endList()
  return { title: state.title, blocks }
}
