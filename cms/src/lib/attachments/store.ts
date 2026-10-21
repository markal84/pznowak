import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import type { AttachmentsState } from '../submissions/statuses'
import { drizzleOf } from '../submissions/store'

/**
 * Miejsca na pliki zgłoszenia (`cms_submission_attachments`, tabela poza schematem kolekcji, jak liczniki
 * limitów). Wiersz powstaje przy przyjęciu zgłoszenia (`pending`) i przyjmuje plik dokładnie raz: zmiana stanu
 * `pending` → `stored` / `rejected` / `skipped` to jedno `UPDATE … WHERE state = 'pending'`, więc dwa równoległe
 * żądania z tym samym biletem nie zapiszą dwóch plików. Wiersze znikają razem ze zgłoszeniem (`ON DELETE CASCADE`),
 * a pliki w magazynie usuwa hook kolekcji „Zgłoszenia”.
 */

export type AttachmentState = 'pending' | 'stored' | 'rejected' | 'skipped' | 'missing' | 'expired'

/** Stan załączników całego zgłoszenia (pole `attachmentsState` kolekcji „Zgłoszenia”). */
export type SubmissionAttachmentsState = AttachmentsState

export type CompletionState = 'complete' | 'incomplete'

export type SlotRow = {
  id: string
  submissionId: number
  slot: number
  state: AttachmentState
  declaredBytes: number
}

export type AttachmentRow = SlotRow & {
  originalName: string | null
  detectedType: string | null
  bytes: number | null
  width: number | null
  height: number | null
  path: string | null
  thumbPath: string | null
  rejectReason: string | null
  createdAt: string
}

export type StoredData = {
  path: string
  thumbPath: string
  bytes: number
  width: number
  height: number
  detectedType: string
  originalName: string | null
}

type Row = Record<string, unknown>

const toSlot = (row: Row): SlotRow => ({
  id: String(row.id),
  submissionId: Number(row.submission_id),
  slot: Number(row.slot),
  state: row.state as AttachmentState,
  declaredBytes: Number(row.declared_bytes),
})

const numberOrNull = (value: unknown) => (value === null || value === undefined ? null : Number(value))

const toAttachment = (row: Row): AttachmentRow => ({
  ...toSlot(row),
  originalName: (row.original_name as string | null) ?? null,
  detectedType: (row.detected_type as string | null) ?? null,
  bytes: numberOrNull(row.bytes),
  width: numberOrNull(row.width),
  height: numberOrNull(row.height),
  path: (row.path as string | null) ?? null,
  thumbPath: (row.thumb_path as string | null) ?? null,
  rejectReason: (row.reject_reason as string | null) ?? null,
  createdAt: new Date(row.created_at as string).toISOString(),
})

/** Miejsca na zapowiedziane pliki (kolejność jak w formularzu). */
export async function createSlots(
  payload: Payload,
  submissionId: number,
  sizes: number[],
): Promise<SlotRow[]> {
  return drizzleOf(payload).transaction(async (tx) => {
    const slots: SlotRow[] = []
    for (const [index, size] of sizes.entries()) {
      const result = await tx.execute(sql`
        INSERT INTO "cms_submission_attachments" ("submission_id", "slot", "declared_bytes")
        VALUES (${submissionId}, ${index + 1}, ${size})
        RETURNING "id", "submission_id", "slot", "state", "declared_bytes"`)
      slots.push(toSlot(result.rows[0]))
    }
    return slots
  })
}

export async function findSlot(payload: Payload, id: string): Promise<SlotRow | null> {
  const result = await drizzleOf(payload).execute(sql`
    SELECT "id", "submission_id", "slot", "state", "declared_bytes"
    FROM "cms_submission_attachments" WHERE "id" = ${id}`)
  return result.rows.length ? toSlot(result.rows[0]) : null
}

export async function findAttachment(payload: Payload, id: string): Promise<AttachmentRow | null> {
  const result = await drizzleOf(payload).execute(sql`
    SELECT * FROM "cms_submission_attachments" WHERE "id" = ${id}`)
  return result.rows.length ? toAttachment(result.rows[0]) : null
}

export async function listAttachments(
  payload: Payload,
  submissionId: number,
): Promise<AttachmentRow[]> {
  const result = await drizzleOf(payload).execute(sql`
    SELECT * FROM "cms_submission_attachments"
    WHERE "submission_id" = ${submissionId} ORDER BY "slot"`)
  return result.rows.map(toAttachment)
}

/** Zapis pliku w miejscu `pending`; `false`, gdy miejsce zajęło już inne żądanie (bilet zużyty). */
export async function markStored(payload: Payload, id: string, data: StoredData): Promise<boolean> {
  return drizzleOf(payload).transaction(async (tx) => {
    const result = await tx.execute(sql`
      UPDATE "cms_submission_attachments"
      SET "state" = 'stored', "path" = ${data.path}, "thumb_path" = ${data.thumbPath},
          "bytes" = ${data.bytes}, "width" = ${data.width}, "height" = ${data.height},
          "detected_type" = ${data.detectedType}, "original_name" = ${data.originalName},
          "updated_at" = now()
      WHERE "id" = ${id} AND "state" = 'pending'
      RETURNING "submission_id"`)
    if (!result.rows.length) return false
    await tx.execute(sql`
      UPDATE "cms_submissions" SET "attachments_count" = COALESCE("attachments_count", 0) + 1
      WHERE "id" = ${Number(result.rows[0].submission_id)}`)
    return true
  })
}

export async function markRejected(
  payload: Payload,
  id: string,
  data: { reason: string; originalName: string | null; detectedType: string | null },
): Promise<boolean> {
  const result = await drizzleOf(payload).execute(sql`
    UPDATE "cms_submission_attachments"
    SET "state" = 'rejected', "reject_reason" = ${data.reason}, "original_name" = ${data.originalName},
        "detected_type" = ${data.detectedType}, "updated_at" = now()
    WHERE "id" = ${id} AND "state" = 'pending'
    RETURNING "id"`)
  return result.rows.length > 0
}

export async function markSkipped(payload: Payload, id: string): Promise<boolean> {
  const result = await drizzleOf(payload).execute(sql`
    UPDATE "cms_submission_attachments" SET "state" = 'skipped', "updated_at" = now()
    WHERE "id" = ${id} AND "state" = 'pending'
    RETURNING "id"`)
  return result.rows.length > 0
}

/**
 * Zamyka przesyłanie, gdy żadne miejsce nie czeka na plik. Udaje się dokładnie jednemu żądaniu (warunek
 * `attachments_state = 'uploading'`), więc pracownia dostaje jedno powiadomienie. `null`: jeszcze nie koniec
 * albo zamknęło je inne żądanie.
 */
export async function claimCompletion(
  payload: Payload,
  submissionId: number,
): Promise<CompletionState | null> {
  const result = await drizzleOf(payload).execute(sql`
    UPDATE "cms_submissions" AS s
    SET "attachments_state" = (CASE
          WHEN (SELECT count(*) FROM "cms_submission_attachments" a
                WHERE a."submission_id" = s."id" AND a."state" = 'stored') >= COALESCE(s."attachments_declared", 0)
          THEN 'complete' ELSE 'incomplete' END)::"enum_cms_submissions_attachments_state",
        "updated_at" = now()
    WHERE s."id" = ${submissionId} AND s."attachments_state" = 'uploading'
      AND NOT EXISTS (SELECT 1 FROM "cms_submission_attachments" a
                      WHERE a."submission_id" = s."id" AND a."state" = 'pending')
    RETURNING s."attachments_state"`)
  return result.rows.length ? (result.rows[0].attachments_state as CompletionState) : null
}

/** Zgłoszenia, w których przesyłanie utknęło (klient zamknął stronę, sieć zawiodła). */
export async function staleUploads(payload: Payload, before: Date, limit = 20): Promise<number[]> {
  const result = await drizzleOf(payload).execute(sql`
    SELECT "id" FROM "cms_submissions"
    WHERE "attachments_state" = 'uploading' AND "created_at" < ${before.toISOString()}
    ORDER BY "created_at" LIMIT ${limit}`)
  return result.rows.map((row) => Number(row.id))
}

export async function markMissing(payload: Payload, submissionId: number): Promise<void> {
  await drizzleOf(payload).execute(sql`
    UPDATE "cms_submission_attachments" SET "state" = 'missing', "updated_at" = now()
    WHERE "submission_id" = ${submissionId} AND "state" = 'pending'`)
}

/** Pliki zgłoszenia w magazynie (zdjęcie i miniatura). */
export async function storedPaths(payload: Payload, submissionId: number): Promise<string[]> {
  const result = await drizzleOf(payload).execute(sql`
    SELECT "path", "thumb_path" FROM "cms_submission_attachments"
    WHERE "submission_id" = ${submissionId} AND ("path" IS NOT NULL OR "thumb_path" IS NOT NULL)`)
  return result.rows.flatMap((row) => [row.path, row.thumb_path]).filter(Boolean) as string[]
}

/** Wszystkie pliki, do których prowadzi jakikolwiek wiersz (do sprzątania osieroconych plików). */
export async function referencedPaths(payload: Payload): Promise<Set<string>> {
  const result = await drizzleOf(payload).execute(sql`
    SELECT "path", "thumb_path" FROM "cms_submission_attachments"
    WHERE "path" IS NOT NULL OR "thumb_path" IS NOT NULL`)
  return new Set(
    result.rows.flatMap((row) => [row.path, row.thumb_path]).filter(Boolean) as string[],
  )
}

/** Zgłoszenia starsze niż `before` ze zdjęciami do usunięcia (bez zaznaczonego „Zachowaj zdjęcia”). */
export async function submissionsPastRetention(
  payload: Payload,
  before: Date,
  limit = 50,
): Promise<number[]> {
  const result = await drizzleOf(payload).execute(sql`
    SELECT s."id" FROM "cms_submissions" s
    WHERE s."created_at" < ${before.toISOString()} AND COALESCE(s."attachments_keep", false) = false
      AND EXISTS (SELECT 1 FROM "cms_submission_attachments" a
                  WHERE a."submission_id" = s."id" AND a."path" IS NOT NULL)
    ORDER BY s."created_at" LIMIT ${limit}`)
  return result.rows.map((row) => Number(row.id))
}

/** Po usunięciu plików z magazynu: wiersze zostają jako ślad („usunięte po okresie przechowywania”). */
export async function markExpired(payload: Payload, submissionId: number): Promise<void> {
  await drizzleOf(payload).transaction(async (tx) => {
    await tx.execute(sql`
      UPDATE "cms_submission_attachments"
      SET "state" = 'expired', "path" = NULL, "thumb_path" = NULL, "updated_at" = now()
      WHERE "submission_id" = ${submissionId} AND "state" = 'stored'`)
    await tx.execute(sql`
      UPDATE "cms_submissions" SET "attachments_state" = 'expired', "attachments_count" = 0, "updated_at" = now()
      WHERE "id" = ${submissionId}`)
  })
}
