import { sql } from '@payloadcms/db-postgres'
import { APIError, type Payload } from 'payload'

import type { VisualizationSettings } from './config'
import { visualizationBucket } from './limits'
import type { SubmissionKind, VisualizationStatus } from './statuses'
import { consumeBucket, consumeLimits, drizzleOf } from './store'

/**
 * Kolejka wizualizacji. Zgłoszenie z kreatora nigdy nie uruchamia wizualizacji samo: zapisuje się ze
 * statusem `waiting`. Pomocnik (agent w tle, jeszcze nie istnieje) bierze pracę wyłącznie przez
 * `claimVisualization`, które w jednej transakcji wybiera najstarsze kwalifikujące się zgłoszenie,
 * zużywa miejsce z twardego dziennego limitu i przestawia je na `in_progress`. Po wyczerpaniu limitu
 * zwraca `limit`, a zgłoszenia czekają do następnego dnia.
 *
 * Ten sam licznik pilnuje ręcznej zmiany statusu w panelu lub przez API (hook kolekcji), więc limitu
 * nie da się obejść inną drogą.
 */

export type ClaimResult =
  { claimed: true; id: number } | { claimed: false; reason: 'empty' | 'limit' }

class NoSlot extends Error {}

/** Statusy, z których pomocnik może wziąć zgłoszenie: ręcznie tylko zatwierdzone, w trybie auto także czekające. */
export function claimableStatuses(settings: VisualizationSettings): VisualizationStatus[] {
  return settings.mode === 'auto' ? ['approved', 'waiting'] : ['approved']
}

export async function claimVisualization(
  payload: Payload,
  settings: VisualizationSettings,
  options: { now?: Date; ids?: number[] } = {},
): Promise<ClaimResult> {
  const now = options.now ?? new Date()
  const statuses = claimableStatuses(settings)
  if (options.ids && options.ids.length === 0) return { claimed: false, reason: 'empty' }
  const onlyIds = options.ids
    ? sql`AND "id" IN (${sql.join(
        options.ids.map((id) => sql`${id}`),
        sql`, `,
      )})`
    : sql``
  try {
    return await drizzleOf(payload).transaction(async (tx): Promise<ClaimResult> => {
      const candidate = await tx.execute(sql`
        SELECT "id" FROM "cms_submissions"
        WHERE "kind" = 'creator'
          AND "status" IN ('draft', 'contacted')
          AND "visualization_status"::text IN (${sql.join(
            statuses.map((s) => sql`${s}`),
            sql`, `,
          )})
          ${onlyIds}
        ORDER BY ("visualization_status" = 'approved') DESC, "created_at" ASC, "id" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED`)
      const id = candidate.rows[0]?.id
      if (id === undefined) return { claimed: false, reason: 'empty' }

      if (
        (await consumeBucket(tx, visualizationBucket(settings.namespace, now, settings.limit))) ===
        null
      ) {
        throw new NoSlot()
      }
      await tx.execute(sql`
        UPDATE "cms_submissions"
        SET "visualization_status" = 'in_progress', "visualization_started_at" = ${now.toISOString()}, "updated_at" = now()
        WHERE "id" = ${id}`)
      return { claimed: true, id: Number(id) }
    })
  } catch (error) {
    if (error instanceof NoSlot) return { claimed: false, reason: 'limit' }
    throw error
  }
}

type Transition = {
  payload: Payload
  settings: VisualizationSettings
  kind: SubmissionKind
  previous: VisualizationStatus | null | undefined
  next: VisualizationStatus
  now: Date
}

const publicError = (message: string) => new APIError(message, 400, null, true)

/**
 * Sprawdza zmianę statusu wizualizacji wykonaną poza `claimVisualization` (panel, REST, Local API).
 * Zwraca pola do dopisania (znaczniki czasu) albo rzuca błąd widoczny w panelu.
 */
export async function guardVisualizationTransition({
  payload,
  settings,
  kind,
  previous,
  next,
  now,
}: Transition) {
  if (kind === 'contact') {
    if (next !== 'not_applicable')
      throw publicError('Zgłoszenie z formularza kontaktowego nie ma wizualizacji.')
    return {}
  }
  if (next === 'not_applicable')
    throw publicError('Zgłoszenie z kreatora musi mieć status wizualizacji.')

  if (next === 'in_progress') {
    const outcome = await consumeLimits(payload, [
      visualizationBucket(settings.namespace, now, settings.limit),
    ])
    if (!outcome.ok) {
      throw publicError(
        `Dzienny limit wizualizacji (${settings.limit}) jest wyczerpany. Zgłoszenie zostaje w kolejce do jutra.`,
      )
    }
    return { visualizationStartedAt: now.toISOString() }
  }
  if (next === 'done' || next === 'failed') {
    if (previous !== 'in_progress')
      throw publicError('Wizualizację można zakończyć dopiero, gdy jest w toku.')
    return { visualizationFinishedAt: now.toISOString() }
  }
  return {}
}
