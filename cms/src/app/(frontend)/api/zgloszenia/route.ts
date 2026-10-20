import payloadConfig from '@payload-config'
import { after } from 'next/server'
import { getPayload } from 'payload'

import { submissionSettingsFromEnv } from '@/lib/submissions/config'
import { handleFormTokenRequest, handleSubmission } from '@/lib/submissions/handler'
import { submissionDeps } from '@/lib/submissions/server'

// Siteverify z ponowną próbą trwa najwyżej ok. 5,5 s; zapas na bazę i powiadomienie po odpowiedzi.
export const maxDuration = 30

export function GET(request: Request) {
  return handleFormTokenRequest(request, { settings: submissionSettingsFromEnv(), now: Date.now })
}

export function POST(request: Request) {
  const deps = submissionDeps(
    () => getPayload({ config: payloadConfig }),
    submissionSettingsFromEnv(),
    (task) => after(task),
  )
  return handleSubmission(request, deps)
}
