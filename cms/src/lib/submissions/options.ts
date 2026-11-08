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
  {
    id: 'nowy',
    label: 'Pierścionek lub obrączki na zamówienie',
    hint: 'Według zdjęcia, szkicu lub opisu',
  },
  { id: 'kolekcja', label: 'Projekt z kolekcji', hint: 'W Twoim rozmiarze lub z innym kamieniem' },
  { id: 'obraczki', label: 'Obrączki ślubne', hint: 'Przymiarka dla Was dwojga' },
  { id: 'naprawa', label: 'Naprawa lub przeróbka', hint: 'Rozmiar, oprawa, rodzinne złoto' },
  { id: 'inne', label: 'Inne pytanie', hint: 'Wszystko, czego nie ma wyżej' },
] as const

export type ContactTopicId = (typeof CONTACT_TOPICS)[number]['id']

export const isContactTopic = (value: string | undefined): value is ContactTopicId =>
  CONTACT_TOPICS.some((t) => t.id === value)

/** Temat na starcie formularza: z adresu (`?temat=`), a z karty pierścionka (`?projekt=`) „Projekt z kolekcji”. */
export const initialContactTopic = (
  topic: string | undefined,
  project: string | undefined,
): ContactTopicId => (isContactTopic(topic) ? topic : project ? 'kolekcja' : 'nowy')

/** Tematy, przy których formularz pyta o grawer i rozmiar (pierścionek lub obrączki do wykonania). */
export const RING_DETAIL_TOPICS: readonly ContactTopicId[] = ['nowy', 'kolekcja']

export const RING_SIZE_KNOWN = [
  { id: 'known', label: 'Znam rozmiar' },
  { id: 'unknown', label: 'Nie znam' },
] as const

export type RingSizeKnownId = (typeof RING_SIZE_KNOWN)[number]['id']

/**
 * Rozmiary w polskiej skali: rozmiar = obwód wewnętrzny w milimetrach minus 40 (np. 14 = 54 mm).
 * Zakres 5–35 obejmuje rozmiary dziecięce i duże męskie; serwer przyjmuje tylko wartości z tej listy.
 */
export const RING_SIZES = Array.from({ length: 31 }, (_, i) => String(5 + i))

export const ringSizeLabel = (size: string) => `${size} (obwód ${Number(size) + 40} mm)`

/**
 * Budżet przy zamówieniu (temat „nowy”). „Podam kwotę” odsłania pole na kwotę w złotych (same cyfry, serwer
 * sprawdza zakres: `BUDGET_AMOUNT`). W zgłoszeniu zapisuje się identyfikator i kwota, w podsumowaniu etykieta.
 */
export const BUDGETS = [
  { id: 'nie-wiem', label: 'Jeszcze nie wiem' },
  { id: 'do-4000', label: 'do 4 000 zł' },
  { id: '4000-10000', label: '4 000–10 000 zł' },
  { id: 'powyzej-10000', label: 'powyżej 10 000 zł' },
  { id: 'kwota', label: 'Podam kwotę' },
] as const

export type BudgetId = (typeof BUDGETS)[number]['id']

/** Kwota podana przez klienta: całe złote, 1–9 999 999 (najwyżej 7 cyfr). */
export const BUDGET_AMOUNT = { min: 1, maxDigits: 7 } as const

/** „4 000 zł”: grupy cyfr oddzielone spacją, jak w etykietach przedziałów. */
export const formatZloty = (amount: number) =>
  `${String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} zł`

/**
 * Jak klient woli porozmawiać o zamówieniu (od 2027 klienci z całej Polski). Pierwsza opcja jest domyślna.
 * Pracownia nie wysyła miarek ani obrączek do przymiarki, a o wysyłce gotowej biżuterii decyduje Michał,
 * więc wariant zdalny obiecuje tylko rozmowę, zdjęcia i filmy.
 */
export const MEETING_MODES = [
  { id: 'pracownia', label: 'W pracowni w Busku-Zdroju' },
  { id: 'zdalnie', label: 'Telefonicznie albo przez wideo – mieszkam dalej' },
] as const

export type MeetingModeId = (typeof MEETING_MODES)[number]['id']

/** Naprawa to usługa na miejscu (biżuterię trzeba przynieść), więc przy niej formularz nie pyta o formę rozmowy. */
export const MEETING_TOPICS: readonly ContactTopicId[] = ['nowy', 'kolekcja', 'obraczki', 'inne']

/** Preferowany kontakt; przy e-mailu adres staje się wymagany. Telefon jest wymagany zawsze. */
export const CONTACT_PREFERENCES = [
  { id: 'telefon', label: 'Telefon', sent: 'telefonicznie' },
  { id: 'sms', label: 'SMS', sent: 'SMS-em' },
  { id: 'email', label: 'E-mail', sent: 'e-mailem' },
] as const

export type ContactPreferenceId = (typeof CONTACT_PREFERENCES)[number]['id']

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
  kreator: 'Zgadzam się na kontakt w sprawie projektu. Akceptuję Regulamin i Politykę prywatności.',
  kontakt:
    'Zgadzam się na kontakt w sprawie mojej wiadomości. Dane przetwarzamy tylko w tym celu. Akceptuję Regulamin i Politykę prywatności.',
} as const

export type FormKind = keyof typeof CONSENT_TEXT

export function labelOf<T extends { id: string; label: string }>(
  list: readonly T[],
  id: string,
): string {
  return list.find((item) => item.id === id)?.label ?? id
}
