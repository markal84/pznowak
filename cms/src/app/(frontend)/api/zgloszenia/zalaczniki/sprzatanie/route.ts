import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import { attachmentStorageFromEnv } from '@/lib/attachments/config'
import { handleCleanup } from '@/lib/attachments/handler'
import { runAttachmentMaintenance } from '@/lib/attachments/server'
import { requestOrigin } from '@/lib/submissions/handler'
import { submissionSettingsFromEnv } from '@/lib/submissions/config'

export const maxDuration = 60

/** Zadanie cykliczne Vercela (`vercel.json` → `crons`); Vercel dołącza `Authorization: Bearer <CRON_SECRET>`. */
export function GET(request: Request) {
  return handleCleanup(request, {
    cronSecret: process.env.CRON_SECRET?.trim() || undefined,
    run: async () =>
      runAttachmentMaintenance(await getPayload({ config: payloadConfig }), {
        storage: attachmentStorageFromEnv(),
        settings: submissionSettingsFromEnv(),
        origin: requestOrigin(request),
      }),
  })
}
