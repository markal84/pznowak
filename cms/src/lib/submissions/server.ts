import type { Payload } from 'payload'

import { attachmentStorageFromEnv } from '../attachments/config'
import { finalizeStaleUploads } from '../attachments/server'
import type { AttachmentStorage } from '../attachments/storage'
import { createSlots } from '../attachments/store'
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
  storage: AttachmentStorage | null = attachmentStorageFromEnv(),
): SubmissionDeps {
  const attachments: SubmissionDeps['attachments'] =
    settings.attachmentsEnabled && storage
      ? {
          createSlots: async (submissionId, sizes) =>
            createSlots(await getPayloadInstance(), submissionId, sizes),
          markUnavailable: async (submissionId) => {
            const payload = await getPayloadInstance()
            await payload.update({
              collection: 'submissions',
              id: submissionId,
              data: { attachmentsState: 'refused_unavailable' },
              depth: 0,
              overrideAccess: true,
            })
          },
        }
      : undefined
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
      // Klient jeszcze przesyła zdjęcia: powiadomienie wyjdzie po ostatnim pliku (albo przy sprzątaniu).
      if (submission.attachmentsState !== 'uploading') {
        const status = await notifyStudio(submission, {
          transport: payloadMailTransport(payload),
          to: settings.notifyTo,
          adminUrl: `${origin}/admin/collections/submissions/${submission.id}`,
        })
        await setNotificationStatus(payload, submission.id, status)
      }
      await cleanupExpiredCounters(payload)
      if (attachments) await finalizeStaleUploads(payload, { now: new Date(), settings, origin })
    },
    attachments,
    defer,
  }
}
