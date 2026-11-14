'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  MEETING_MODES,
  MEETING_TOPICS,
  type ContactTopicId,
  type MeetingModeId,
} from '@/lib/submissions/options'

/**
 * Wspólny stan strony kontaktu: temat i forma rozmowy z formularza zmieniają kroki „Co dalej” w kolumnie obok.
 * Formularz działa też bez dostawcy (własny stan), np. w testach.
 */

type ContactPlan = {
  topic: ContactTopicId
  setTopic: (topic: ContactTopicId) => void
  meeting: MeetingModeId
  setMeeting: (meeting: MeetingModeId) => void
}

const PlanContext = createContext<ContactPlan | null>(null)

const DEFAULT_MEETING: MeetingModeId = MEETING_MODES[0].id

function usePlanState(initialTopic: ContactTopicId): ContactPlan {
  const [topic, setTopic] = useState(initialTopic)
  const [meeting, setMeeting] = useState<MeetingModeId>(DEFAULT_MEETING)
  return { topic, setTopic, meeting, setMeeting }
}

export function ContactPlanProvider({
  initialTopic,
  children,
}: {
  initialTopic: ContactTopicId
  children: ReactNode
}) {
  return <PlanContext.Provider value={usePlanState(initialTopic)}>{children}</PlanContext.Provider>
}

/** Stan z dostawcy strony albo własny, gdy formularz jest użyty samodzielnie. */
export function useContactPlan(initialTopic: ContactTopicId): ContactPlan {
  const shared = useContext(PlanContext)
  const own = usePlanState(initialTopic)
  return shared ?? own
}

/** Forma rozmowy, która naprawdę obowiązuje: przy tematach bez tego pytania (naprawa) zawsze pracownia. */
export const effectiveMeeting = (topic: ContactTopicId, meeting: MeetingModeId): MeetingModeId =>
  MEETING_TOPICS.includes(topic) ? meeting : DEFAULT_MEETING

/**
 * Kroki „Co dalej”. Przy rozmowie zdalnej: zdjęcia i filmy; bez wysyłki miarek i obrączek do przymiarki (ustalone 01.11),
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

export function NextSteps() {
  const plan = useContext(PlanContext)
  const mode = plan ? effectiveMeeting(plan.topic, plan.meeting) : DEFAULT_MEETING
  return (
    <ol
      aria-live="polite"
      data-meeting={mode}
      style={{
        paddingLeft: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontSize: 15.5,
        lineHeight: 1.55,
        color: 'var(--graphite-2)',
      }}
    >
      {NEXT_STEPS[mode].map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  )
}
