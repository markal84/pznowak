/**
 * Parametry pierścionka na karcie (Marcin 21.11.2026): próba złota, szlif i wymiary kamienia głównego.
 * Jedno miejsce na listy wyboru w panelu (Products.ts) i na teksty wierszy na stronie.
 */

export const GOLD_FINENESS_OPTIONS = [
  { value: '585', label: '585 (14 karatów)' },
  { value: '750', label: '750 (18 karatów)' },
] as const

export type GoldFineness = (typeof GOLD_FINENESS_OPTIONS)[number]['value']

/** `label` widać w panelu, `text` na karcie w wierszu „Szlif kamienia”. */
export const STONE_CUT_OPTIONS = [
  { value: 'okragly', label: 'Okrągły', text: 'okrągły' },
  { value: 'owalny', label: 'Owalny', text: 'owalny' },
  { value: 'szmaragdowy', label: 'Szmaragdowy (prostokąt ze ściętymi rogami, schodkowy)', text: 'szmaragdowy, prostokątny' },
  { value: 'radiant', label: 'Radiant (prostokąt ze ściętymi rogami, iskrzący)', text: 'radiant, prostokątny' },
  { value: 'poduszka', label: 'Poduszka', text: 'poduszkowy' },
  { value: 'kwadratowy', label: 'Kwadratowy (princessa)', text: 'kwadratowy (princessa)' },
  { value: 'kropla', label: 'Kropla', text: 'kropla' },
  { value: 'markiza', label: 'Markiza', text: 'markiza' },
  { value: 'serce', label: 'Serce', text: 'serce' },
  { value: 'kaboszon', label: 'Kaboszon (gładki, bez faset)', text: 'kaboszon, gładki' },
] as const

export type StoneCut = (typeof STONE_CUT_OPTIONS)[number]['value']

/** „585” → „próba 585”; nieznana albo pusta wartość → ''. */
export function finenessText(value: string | null | undefined): string {
  return GOLD_FINENESS_OPTIONS.some((option) => option.value === value) ? `próba ${value}` : ''
}

/** Wartość z panelu → tekst na karcie („owalny”); nieznana albo pusta → ''. */
export function stoneCutText(value: string | null | undefined): string {
  return STONE_CUT_OPTIONS.find((option) => option.value === value)?.text ?? ''
}

/**
 * Wymiary z panelu → tekst na karcie. „6x4”, „6 x 4 mm”, „6×4” → „6 × 4 mm”; „5” → „5 mm”; kropka dziesiętna → przecinek.
 * Tekst, którego nie da się tak odczytać, idzie bez zmian (Marcin mógł wpisać coś opisowo).
 */
export function stoneSizeText(value: string | null | undefined): string {
  const raw = (value ?? '').trim()
  if (!raw) return ''
  const body = raw.replace(/\s*mm\.?$/i, '').trim()
  const parts = body.split(/\s*[x×*]\s*/i)
  if (parts.every((part) => /^\d+(?:[.,]\d+)?$/.test(part))) {
    return `${parts.map((part) => part.replace('.', ',')).join(' × ')} mm`
  }
  return raw
}
