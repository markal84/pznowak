import {
  CUTS,
  GEMS,
  type CutId,
  type GemId,
  type MetalId,
  type PaveId,
  type SettingId,
  type WidthId,
} from '../ring-geometry'

/**
 * Wartości, które kreator i formularz kontaktowy mogą wysłać. Ten sam moduł czyta interfejs i serwer,
 * więc serwer przyjmuje tylko to, co da się wybrać na stronie (walidacja: validation.ts).
 */

export const OCCASIONS = [
  { id: 'zareczyny', label: 'Zaręczyny', hint: 'Pierścionek zaręczynowy', icon: 'okazja' },
  { id: 'rocznica', label: 'Rocznica', hint: 'Na ważną datę', icon: 'kalendarz' },
  { id: 'prezent', label: 'Prezent', hint: 'Dla bliskiej osoby', icon: 'prezent' },
  { id: 'dla-siebie', label: 'Dla siebie', hint: 'Bo tak', icon: 'pierscionek' },
] as const

export type OccasionId = (typeof OCCASIONS)[number]['id']

export const SETTINGS: { id: SettingId; label: string; hint: string }[] = [
  { id: 'lapki-4', label: 'Cztery łapki', hint: 'Klasyka. Do kamienia wpada najwięcej światła.' },
  {
    id: 'lapki-6',
    label: 'Sześć łapek',
    hint: 'Kamień trzymany pewniej, kształt bardziej okrągły.',
  },
  {
    id: 'kaszta',
    label: 'Kaszta',
    hint: 'Kamień w metalowej obwódce. Wygodny na co dzień, nie zahacza.',
  },
  { id: 'halo', label: 'Halo', hint: 'Wianek drobnych diamentów. Kamień wydaje się większy.' },
  {
    id: 'trylogia',
    label: 'Trylogia',
    hint: 'Trzy kamienie: przeszłość, teraźniejszość i przyszłość.',
  },
]

export const METALS: { id: MetalId; label: string; gradient: string; name: string }[] = [
  {
    id: 'au',
    label: 'Żółte',
    name: 'żółte złoto',
    gradient: 'linear-gradient(135deg, #8A6A28, #EBD08A 45%, #B38B3E)',
  },
  {
    id: 'ag',
    label: 'Białe',
    name: 'białe złoto',
    gradient: 'linear-gradient(135deg, #85898D, #F4F4F1 45%, #AEB1B4)',
  },
  {
    id: 'dwa',
    label: 'Dwukolorowe',
    name: 'żółte i białe złoto',
    gradient: 'linear-gradient(135deg, #B38B3E 0 50%, #D9DADB 50% 100%)',
  },
]

export const WIDTHS: { id: WidthId; label: string; hint: string }[] = [
  { id: 'cienka', label: 'Delikatna', hint: 'Lekka, dyskretna' },
  { id: 'klasyczna', label: 'Klasyczna', hint: 'Najczęstszy wybór' },
  { id: 'szeroka', label: 'Wyraźna', hint: 'Mocniejszy akcent' },
]

export const PAVES: { id: PaveId; label: string }[] = [
  { id: 'nie', label: 'Gładkie' },
  { id: 'tak', label: 'Z drobnymi diamentami' },
]

export const GEM_IDS = Object.keys(GEMS) as GemId[]
export const CUT_IDS = Object.keys(CUTS) as CutId[]

export const CONTACT_TOPICS = [
  { id: 'nowy', label: 'Nowy pierścionek', hint: 'Projekt od podstaw' },
  { id: 'kolekcja', label: 'Projekt z kolekcji', hint: 'W Twoim rozmiarze lub z innym kamieniem' },
  { id: 'obraczki', label: 'Obrączki ślubne', hint: 'Przymiarka dla Was dwojga' },
  { id: 'naprawa', label: 'Naprawa lub przeróbka', hint: 'Rozmiar, oprawa, rodzinne złoto' },
  { id: 'inne', label: 'Inne pytanie', hint: 'Wszystko, czego nie ma wyżej' },
] as const

export type ContactTopicId = (typeof CONTACT_TOPICS)[number]['id']

export const BUDGETS = [
  'Jeszcze nie wiem',
  '[przedział 1]',
  '[przedział 2]',
  '[przedział 3]',
] as const

/** Limity długości pól; interfejs ustawia z nich `maxLength`, serwer odrzuca dłuższe. */
export const LIMITS = {
  name: 60,
  phone: 20,
  email: 120,
  when: 60,
  engraving: 24,
  notes: 1000,
  message: 2000,
  occasionText: 80,
  project: 80,
  weddingDate: 60,
  bandChoice: 160,
} as const

/** Treść zgody pokazywana przy formularzu. Serwer zapisuje ją przy zgłoszeniu (rozliczalność, RODO). */
export const CONSENT_TEXT = {
  kreator: 'Zgadzam się na kontakt w sprawie projektu. Polityka prywatności [wkrótce]',
  kontakt:
    'Zgadzam się na kontakt w sprawie mojej wiadomości. Dane przetwarzamy tylko w tym celu. Polityka prywatności [wkrótce]',
} as const

export type FormKind = keyof typeof CONSENT_TEXT

export function labelOf<T extends { id: string; label: string }>(
  list: readonly T[],
  id: string,
): string {
  return list.find((item) => item.id === id)?.label ?? id
}
