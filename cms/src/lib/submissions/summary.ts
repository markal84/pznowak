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
import {
  BUDGETS,
  HEARD_FROM,
  CONTACT_PREFERENCES,
  CONTACT_TOPICS,
  MEETING_MODES,
  METALS,
  OCCASIONS,
  RING_DETAIL_TOPICS,
  SETTINGS,
  WIDTHS,
  formatZloty,
  labelOf,
  type BudgetId,
  type ContactPreferenceId,
  type ContactTopicId,
  type HeardFromId,
  type MeetingModeId,
  type RingSizeKnownId,
} from './options'

export type CreatorChoices = {
  occasion: string
  when: string
  gem: GemId
  cut: CutId
  setting: SettingId
  metal: MetalId
  width: WidthId
  pave: PaveId
  engraving: string
}

/** Wiersze „karty projektu”: ta sama treść na stronie kreatora, w panelu i w powiadomieniu dla pracowni. */
export function describeCreator(c: CreatorChoices): [string, string][] {
  return [
    ['Okazja', labelOf(OCCASIONS, c.occasion)],
    ...(c.when.trim() ? ([['Na kiedy', c.when.trim()]] as [string, string][]) : []),
    ['Kamień', GEMS[c.gem].label],
    ['Szlif', CUTS[c.cut].label],
    ['Oprawa', labelOf(SETTINGS, c.setting)],
    ['Złoto', labelOf(METALS, c.metal)],
    ['Obrączka', labelOf(WIDTHS, c.width) + (c.pave === 'tak' ? ', z diamentami' : ', gładka')],
    ['Grawer', c.engraving ? `„${c.engraving}”` : 'bez graweru'],
  ]
}

export type ContactDetails = {
  topic: ContactTopicId
  meeting: MeetingModeId | ''
  contactPreference: ContactPreferenceId
  occasionText: string
  when: string
  budget: BudgetId | ''
  budgetAmount: number | null
  project: string
  weddingDate: string
  bandChoice: string
  engraving: string
  ringSizeKnown: RingSizeKnownId | ''
  ringSize: string
  /** Starsze zgłoszenia (sprzed pola „Skąd o nas wiesz?”) nie mają tych kluczy w `details`. */
  heardFrom?: HeardFromId | ''
  heardFromOther?: string
}

/** „Skąd o nas wiesz?” jednym tekstem: etykieta, a przy „Inne” także wpis klienta. */
export function heardFromText(d: Pick<ContactDetails, 'heardFrom' | 'heardFromOther'>): string {
  if (!d.heardFrom) return ''
  const label = labelOf(HEARD_FROM, d.heardFrom)
  return d.heardFrom === 'inne' && d.heardFromOther ? `${label}: ${d.heardFromOther}` : label
}

/** Budżet do podsumowania: etykieta przedziału albo kwota podana przez klienta. */
export function budgetText(d: Pick<ContactDetails, 'budget' | 'budgetAmount'>): string {
  if (!d.budget) return ''
  if (d.budget === 'kwota')
    return d.budgetAmount ? `${formatZloty(d.budgetAmount)} (kwota podana przez klienta)` : ''
  return labelOf(BUDGETS, d.budget)
}

export function describeContact(d: ContactDetails): [string, string][] {
  const rows: [string, string][] = [
    ['Temat', labelOf(CONTACT_TOPICS, d.topic)],
    ...(d.meeting ? ([['Rozmowa', labelOf(MEETING_MODES, d.meeting)]] as [string, string][]) : []),
    ['Preferowany kontakt', labelOf(CONTACT_PREFERENCES, d.contactPreference)],
  ]
  const optional: [string, string][] = [
    ['Okazja', d.occasionText],
    ['Na kiedy', d.when],
    ['Budżet', budgetText(d)],
    ['Projekt', d.project],
    ['Data ślubu', d.weddingDate],
    ['Wstępny wybór', d.bandChoice],
  ]
  const ring: [string, string][] = RING_DETAIL_TOPICS.includes(d.topic)
    ? [
        ['Grawer', d.engraving ? `„${d.engraving}”` : 'bez graweru'],
        [
          'Rozmiar',
          d.ringSizeKnown === 'known'
            ? `${d.ringSize} (polska skala)`
            : d.meeting === 'zdalnie'
              ? 'nie zna, zmierzy u jubilera w swojej okolicy'
              : 'nie zna, zmierzymy w pracowni',
        ],
      ]
    : []
  return rows.concat(
    optional.filter(([, value]) => value),
    ring,
    heardFromText(d) ? [['Skąd o nas wie', heardFromText(d)]] : [],
  )
}

export const rowsToText = (rows: [string, string][]) =>
  rows.map(([k, v]) => `${k}: ${v}`).join('\n')
