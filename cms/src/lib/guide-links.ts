import { mainStoneOf } from './catalog'

/**
 * Kotwica sekcji w poradniku o kamieniach dla kamienia głównego z karty („Szafir i diamenty” → `szafir`).
 * Identyfikatory muszą zgadzać się z kotwicami bloków „Kamień” poradnika o kamieniach (panel: Strona → Poradniki);
 * `null`, gdy poradnik nie opisuje tego kamienia (link prowadzi wtedy na początek poradnika).
 */
const ANCHORS: [RegExp, string][] = [
  [/^diament/, 'diament'],
  [/^szafir/, 'szafir'],
  [/^rubin/, 'rubin'],
  [/^szmaragd/, 'szmaragd'],
  [/^tanzanit/, 'tanzanit'],
  [/^topaz/, 'topaz'],
  [/^(oliwin|perydot)/, 'oliwin'],
  [/^(ametyst|cytryn)/, 'ametyst-cytryn'],
  [/^(turmalin|morganit)/, 'turmalin-morganit'],
]

export function mainStoneGuideAnchor(stone: string | null | undefined): string | null {
  const main = mainStoneOf(stone ?? '')
  return ANCHORS.find(([pattern]) => pattern.test(main))?.[1] ?? null
}
