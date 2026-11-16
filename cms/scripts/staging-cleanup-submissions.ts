/**
 * Sprząta zgłoszenia testowe na bazie stagingowej: wiersze z testów automatycznych (imię „Test Playwright” z e2e,
 * „Test Automatyczny” z testów integracyjnych) i liczniki z przedrostkiem „test-”. Bez `--apply` tylko liczy.
 * Liczniki preview (bez przedrostka) są usuwane tylko z `--reset-preview-limits`.
 */
import { sql } from '@payloadcms/db-postgres'
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { drizzleOf } from '../src/lib/submissions/store'
import { refuseLiveDatabase } from './db-guard'

const apply = process.argv.includes('--apply')
const resetPreviewLimits = process.argv.includes('--reset-preview-limits')

refuseLiveDatabase('staging-cleanup-submissions')

const TEST_NAMES = ['Test Playwright', 'Test Automatyczny']
const payload = await getPayload({ config: await config })

try {
  const where = { name: { in: TEST_NAMES } }
  const submissions = await payload.count({
    collection: 'submissions',
    where,
    overrideAccess: true,
  })
  const total = await payload.count({ collection: 'submissions', overrideAccess: true })
  const counters = await drizzleOf(payload).execute(
    sql`SELECT count(*)::int AS "n" FROM "cms_limit_counters" WHERE "bucket" LIKE 'test-%'`,
  )
  const previewCounters = await drizzleOf(payload).execute(
    sql`SELECT count(*)::int AS "n" FROM "cms_limit_counters" WHERE "bucket" NOT LIKE 'test-%'`,
  )
  console.log(
    `Zgłoszenia testowe: ${submissions.totalDocs} z ${total.totalDocs}. Liczniki testowe: ${counters.rows[0].n}. Liczniki preview: ${previewCounters.rows[0].n}.`,
  )

  if (apply) {
    await payload.delete({ collection: 'submissions', where, overrideAccess: true })
    await drizzleOf(payload).execute(
      sql`DELETE FROM "cms_limit_counters" WHERE "bucket" LIKE 'test-%'`,
    )
    if (resetPreviewLimits)
      await drizzleOf(payload).execute(
        sql`DELETE FROM "cms_limit_counters" WHERE "bucket" NOT LIKE 'test-%'`,
      )
    console.log(
      `Usunięto zgłoszenia testowe i liczniki testowe${resetPreviewLimits ? ' oraz liczniki preview' : ''}.`,
    )
  }
} finally {
  await payload.destroy()
  // Payload zostawia otwarte uchwyty (pula połączeń, telemetria), więc proces kończymy jawnie.
  process.exit(process.exitCode ?? 0)
}
