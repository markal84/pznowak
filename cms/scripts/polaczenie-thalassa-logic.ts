/**
 * Połączenie Thalassa → Aion w jeden fason (Marcin 07.11, lista PZ Nowak 5.2): dane i czysta logika planu (bez bazy),
 * żeby dało się ją sprawdzić testem. Używa tego `scripts/staging-polaczenie-thalassa.ts` (tylko staging) oraz
 * `tests/int/polaczenie-thalassa.int.spec.ts`. Wzorzec jak zlecenie AB (Urania + Pyrrha + Nyx).
 *
 * Karta docelowa to Aion (obrączka eternity). Prawdziwe zdjęcia (i film) Thalassy zastępują zielony wariant z wizualizacją
 * („Szmaragd i diamenty”): te same pliki Media, bez ponownego wgrywania i bez plakietki „Wizualizacja”. Wizualizacji nie ma.
 */
import { type MergeSpec, planVariant, type VariantPlan, type VariantState } from './polaczenie-ab-logic'

export { assetId, featuredTransfer, imageIds, planArchive, videoId } from './polaczenie-ab-logic'

export const TARGET = { slug: 'aion', name: 'Aion' } as const

/** Kamienie na zdjęciach Thalassy: jasne diamenty na przemian z zielonkawymi (Marcin: „zielony wariant Aiona”). */
export const MERGE: MergeSpec = {
  slug: 'thalassa',
  name: 'Thalassa',
  stone: 'Zielone i białe diamenty',
  swatch: 'zielony',
  alt: 'Aion z zielonymi i białymi diamentami w żółtym złocie',
}

/** Wizualizacja, którą zastępują prawdziwe zdjęcia (kółko „zielony”). */
export const REPLACED_STONE = 'Szmaragd i diamenty'

const norm = (value: string | null | undefined) => (value ?? '').replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * Opis fasonu Aion po połączeniu (standard zlecenia U/AC: `lintAc` pilnuje tego w teście). Dopisane jedno zdanie
 * o zielonym wariancie z prawdziwych zdjęć.
 */
export const CARD_TEXT = {
  lead: 'Obrączka eternity z kamieniami w kwadratowych oprawkach – nieprzerwany rząd blasku dookoła palca.',
  description: [
    'Obrączka typu eternity z żółtego złota próby 585 (14k). Każdy kamień siedzi w osobnej kwadratowej oprawce na czterech łapkach, a oprawki łączą się w równy, nieprzerwany rząd dookoła palca.',
    'Obrączkę wykonaliśmy ręcznie od podstaw, na zamówienie złożone online – bez przymiarek w pracowni. Na zdjęciach różowe szafiry przeplatają się z diamentami. Wersję z zielonymi i białymi diamentami pokazujemy na prawdziwych zdjęciach, pod galerią w sekcji „Zamów z innym kamieniem”.',
    'Ten fason wykonamy w wybranym rozmiarze, także z kamieniami w innym kolorze.',
  ].join('\n\n'),
} as const

/** Tekst Aiona sprzed tego połączenia (opisy AC): jedyny, który wolno nadpisać. */
export const PREVIOUS_TEXT = {
  lead: CARD_TEXT.lead,
  description: [
    'Obrączka typu eternity z żółtego złota próby 585 (14k). Każdy kamień siedzi w osobnej kwadratowej oprawce na czterech łapkach, a oprawki łączą się w równy, nieprzerwany rząd dookoła palca.',
    'Obrączkę wykonaliśmy ręcznie od podstaw, na zamówienie złożone online – bez przymiarek w pracowni. Na zdjęciach różowe szafiry przeplatają się z diamentami.',
    'Ten fason wykonamy w wybranym rozmiarze, także z kamieniami w innym kolorze.',
  ].join('\n\n'),
} as const

export type TextState = { name: string; lead?: string | null; description?: string | null }
export type TextPlan =
  | { action: 'zmien'; data: { lead: string; description: string }; note: string }
  | { action: 'juz' | 'pomin'; note: string }

/** `known`: teksty, które karta ma prawo mieć przed zmianą; inny tekst to ręczna poprawka w panelu i zostaje. */
export function planText(card: TextState, known: readonly { lead: string; description: string }[] = [PREVIOUS_TEXT]): TextPlan {
  if (card.name !== TARGET.name) return { action: 'pomin', note: `nazwa „${card.name}” nie zgadza się z „${TARGET.name}”` }
  const sameLead = norm(card.lead) === norm(CARD_TEXT.lead)
  const sameDescription = norm(card.description) === norm(CARD_TEXT.description)
  if (sameLead && sameDescription) return { action: 'juz', note: 'opis fasonu już zapisany' }
  const leadOk = sameLead || known.some((text) => norm(text.lead) === norm(card.lead))
  const descriptionOk = sameDescription || known.some((text) => norm(text.description) === norm(card.description))
  if (!leadOk || !descriptionOk) {
    return { action: 'pomin', note: 'lead albo opis zmienione ręcznie w panelu, nie nadpisuję (sprawdź tekst ręcznie)' }
  }
  return { action: 'zmien', data: { lead: CARD_TEXT.lead, description: CARD_TEXT.description }, note: 'opis fasonu (lead + opis)' }
}

/**
 * Wariant z prawdziwych zdjęć Thalassy. Najpierw wypada zielona wizualizacja (`REPLACED_STONE`), ale tylko jeśli to
 * wciąż wizualizacja: prawdziwe zdjęcia dodane ręcznie w panelu zostają. Nowy wariant staje na miejscu starego.
 */
export function planGreen<T extends VariantState>(
  existing: readonly T[],
  sourceImages: readonly number[],
  sourceVideo: number | null,
): { plan: VariantPlan; removeAt: number } {
  const removeAt = existing.findIndex((variant) => norm(variant.stone) === norm(REPLACED_STONE) && variant.isVisualization !== false)
  const rest = removeAt < 0 ? existing : existing.filter((_, i) => i !== removeAt)
  const plan = planVariant(rest, MERGE, sourceImages, sourceVideo)
  return { plan, removeAt }
}
