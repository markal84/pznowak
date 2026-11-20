/**
 * „Ten model” na karcie: akapit z nazwami innych kart zamienionymi w linki (np. „zobacz pierścionek Ianthe”). Nazwa
 * musi stać w mianowniku i jako osobne słowo; własna nazwa karty i odmienione formy zostają zwykłym tekstem.
 */
export type NoteSegment = { text: string; slug?: string }
export type NoteCard = { name: string; slug: string }

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function uniqueNoteSegments(text: string, cards: readonly NoteCard[], selfSlug: string): NoteSegment[] {
  const targets = cards.filter((card) => card.slug !== selfSlug && card.name.trim().length > 1)
  if (!text || !targets.length) return text ? [{ text }] : []
  const bySlug = new Map(targets.map((card) => [card.name.trim(), card.slug]))
  const names = [...bySlug.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp)
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${names.join('|')})(?![\\p{L}\\p{N}])`, 'gu')
  const segments: NoteSegment[] = []
  const linked = new Set<string>()
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const name = match[1]
    // Jeden link na kartę: kolejne wzmianki zostają tekstem.
    if (linked.has(name)) continue
    linked.add(name)
    const start = match.index ?? 0
    if (start > last) segments.push({ text: text.slice(last, start) })
    segments.push({ text: name, slug: bySlug.get(name) })
    last = start + name.length
  }
  if (last < text.length) segments.push({ text: text.slice(last) })
  return segments
}
