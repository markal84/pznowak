'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { DEFAULT_MEETING, NEXT_STEPS, effectiveMeeting } from '@/lib/submissions/next-steps'
import type { ContactTopicId, MeetingModeId } from '@/lib/submissions/options'

export { NEXT_STEPS, effectiveMeeting }

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

/** Kroki „Co dalej” obok formularza; dane w `src/lib/submissions/next-steps.ts` (te same idą w potwierdzeniu e-mailem). */
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
