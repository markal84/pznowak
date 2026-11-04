import payloadConfig from '@payload-config'
import { getPayload } from 'payload'

import { attachmentStorageFromEnv } from '@/lib/attachments/config'
import { handleCleanup } from '@/lib/attachments/handler'
import { runAttachmentMaintenance } from '@/lib/attachments/server'
import { submissionSettingsFromEnv } from '@/lib/submissions/config'
import { linkOrigin } from '@/lib/submissions/request'

export const maxDuration = 60

/**
 * Zadanie cykliczne Vercela (`vercel.json` → `crons`); Vercel dołącza `Authorization: Bearer <CRON_SECRET>`.
 * Poza Vercelem (MyDevil): zadanie cron w panelu hostingu, raz na dobę, np.
 * `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://pznowak.pl/api/zgloszenia/zalaczniki/sprzatanie`.
 */
export function GET(request: Request) {
  const settings = submissionSettingsFromEnv()
  return handleCleanup(request, {
    cronSecret: process.env.CRON_SECRET?.trim() || undefined,
    run: async () =>
      runAttachmentMaintenance(await getPayload({ config: payloadConfig }), {
        storage: attachmentStorageFromEnv(),
        settings,
        origin: linkOrigin(request, settings.publicOrigin),
      }),
  })
}
