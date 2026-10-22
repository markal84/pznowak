import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import type { Submission } from '../../payload-types'
import type { LimitBucket } from './limits'
import type { NotificationStatus } from './statuses'

/**
 * Zapis zgłoszeń i liczników limitów w Postgresie (ta sama baza co Payload, bez nowej usługi).
 * Licznik zużywa się atomowo: `INSERT … ON CONFLICT DO UPDATE … WHERE hits < limit`, więc równoległe
 * żądania nie przekroczą limitu nawet o jeden.
 */

type Db = PostgresAdapter['drizzle']
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

export type LimitOutcome = { ok: true } | { ok: false; bucket: LimitBucket }

export type SubmissionDraft = Omit<Submission, 'id' | 'createdAt' | 'updatedAt'>

export function drizzleOf(payload: Payload): Db {
  return (payload.db as unknown as PostgresAdapter).drizzle
}

/**
 * Zwraca stan licznika po zużyciu albo null, gdy limit nie pozwala (licznik zwiększany o `amount`, domyślnie 1;
 * przy 1 warunek `hits + 1 <= limit` to dawne `hits < limit`).
 */
export async function consumeBucket(
  executor: Db | Tx,
  bucket: LimitBucket,
): Promise<number | null> {
  const amount = bucket.amount ?? 1
  const result = await executor.execute(sql`
    INSERT INTO "cms_limit_counters" ("bucket", "hits", "expires_at")
    SELECT ${bucket.key}, ${amount}::integer, now() + make_interval(secs => ${bucket.ttlSeconds})
    WHERE ${amount}::integer <= ${bucket.limit}::integer
    ON CONFLICT ("bucket") DO UPDATE
      SET "hits" = "cms_limit_counters"."hits" + ${amount}::integer, "updated_at" = now()
      WHERE "cms_limit_counters"."hits" + ${amount}::integer <= ${bucket.limit}::integer
    RETURNING "hits"`)
  return result.rows.length ? Number(result.rows[0].hits) : null
}

class LimitReached extends Error {
  constructor(readonly bucket: LimitBucket) {
    super(`limit ${bucket.scope}`)
  }
}

/** Zużywa wszystkie liczniki albo żaden (transakcja), np. limit IP i dzienny sufit naraz. */
export async function consumeLimits(
  payload: Payload,
  buckets: LimitBucket[],
): Promise<LimitOutcome> {
  try {
    await drizzleOf(payload).transaction(async (tx) => {
      for (const bucket of buckets) {
        if ((await consumeBucket(tx, bucket)) === null) throw new LimitReached(bucket)
      }
    })
    return { ok: true }
  } catch (error) {
    if (error instanceof LimitReached) return { ok: false, bucket: error.bucket }
    throw error
  }
}

export async function cleanupExpiredCounters(payload: Payload): Promise<void> {
  await drizzleOf(payload).execute(sql`DELETE FROM "cms_limit_counters" WHERE "expires_at" < now()`)
}

export async function insertDraft(
  payload: Payload,
  draft: SubmissionDraft,
): Promise<{ id: number }> {
  const doc = await payload.create({
    collection: 'submissions',
    data: draft,
    depth: 0,
    overrideAccess: true,
  })
  return { id: doc.id }
}

export async function setNotificationStatus(
  payload: Payload,
  id: number,
  notification: NotificationStatus,
) {
  await payload.update({
    collection: 'submissions',
    id,
    data: { notification },
    depth: 0,
    overrideAccess: true,
  })
}
