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
  CONTACT_TOPICS,
  METALS,
  OCCASIONS,
  RING_DETAIL_TOPICS,
  SETTINGS,
  WIDTHS,
  labelOf,
  type ContactTopicId,
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
  occasionText: string
  when: string
  budget: string
  project: string
  weddingDate: string
  bandChoice: string
  engraving: string
  ringSizeKnown: RingSizeKnownId | ''
  ringSize: string
}

export function describeContact(d: ContactDetails): [string, string][] {
  const rows: [string, string][] = [['Temat', labelOf(CONTACT_TOPICS, d.topic)]]
  const optional: [string, string][] = [
    ['Okazja', d.occasionText],
    ['Na kiedy', d.when],
    ['Budżet', d.budget],
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
            : 'nie zna, zmierzymy w pracowni',
        ],
      ]
    : []
  return rows.concat(
    optional.filter(([, value]) => value),
    ring,
  )
}

export const rowsToText = (rows: [string, string][]) =>
  rows.map(([k, v]) => `${k}: ${v}`).join('\n')
