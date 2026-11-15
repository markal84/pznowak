import { MEETING_MODES, MEETING_TOPICS, type ContactTopicId, type MeetingModeId } from './options'

/**
 * Kroki „Co dalej” – wspólne dla strony kontaktu (`ContactPlan.tsx`) i potwierdzenia dla klienta (`confirmation.ts`).
 * Zwykły moduł (bez `'use client'`), żeby serwer mógł go użyć przy wysyłce maila.
 */

export const DEFAULT_MEETING: MeetingModeId = MEETING_MODES[0].id

/** Forma rozmowy, która naprawdę obowiązuje: przy tematach bez tego pytania (naprawa) zawsze pracownia. */
export const effectiveMeeting = (topic: ContactTopicId, meeting: MeetingModeId): MeetingModeId =>
  MEETING_TOPICS.includes(topic) ? meeting : DEFAULT_MEETING

/**
 * Przy rozmowie zdalnej: zdjęcia i filmy; bez wysyłki miarek i obrączek do przymiarki (ustalone 01.11),
 * gotowa biżuteria: odbiór w pracowni albo kurier (Marcin 14.11).
 */
export const NEXT_STEPS: Record<MeetingModeId, readonly string[]> = {
  pracownia: [
    'Oddzwaniamy i ustalamy termin rozmowy.',
    'W pracowni oglądasz kamienie i projekty.',
    'Wycenę dostajesz, zanim cokolwiek zamówisz.',
  ],
  zdalnie: [
    'Oddzwaniamy i ustalamy termin rozmowy.',
    'Pokazujemy kamienie i projekty na zdjęciach i filmach.',
    'Wycenę dostajesz, zanim cokolwiek zamówisz.',
    'Gotową biżuterię odbierasz w pracowni albo wysyłamy ją kurierem.',
  ],
}
