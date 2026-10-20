import type { Payload } from 'payload'

import type { SubmissionSettings } from './config'
import type { SubmissionDeps } from './handler'
import { notifyStudio, payloadMailTransport } from './notify'
import { cleanupExpiredCounters, consumeLimits, insertDraft, setNotificationStatus } from './store'
import { siteverifyReachable, verifyTurnstile } from './turnstile'

/** Zależności endpointu na prawdziwej bazie i prawdziwym siteverify; testy podmieniają wybrane pola. */
export function submissionDeps(
  getPayloadInstance: () => Promise<Payload>,
  settings: SubmissionSettings,
  defer: SubmissionDeps['defer'],
): SubmissionDeps {
  return {
    settings,
    now: Date.now,
    verifyTurnstile: (args) =>
      verifyTurnstile({
        ...args,
        secret: settings.turnstileSecret,
        allowTestingKeys: settings.allowTestingKeys,
      }),
    siteverifyReachable: () => siteverifyReachable({ secret: settings.turnstileSecret }),
    consumeLimits: async (buckets) => consumeLimits(await getPayloadInstance(), buckets),
    insertDraft: async (draft) => insertDraft(await getPayloadInstance(), draft),
    afterAccepted: async (submission, { origin }) => {
      const payload = await getPayloadInstance()
      const status = await notifyStudio(submission, {
        transport: payloadMailTransport(payload),
        to: settings.notifyTo,
        adminUrl: `${origin}/admin/collections/submissions/${submission.id}`,
      })
      await setNotificationStatus(payload, submission.id, status)
      await cleanupExpiredCounters(payload)
    },
    defer,
  }
}
