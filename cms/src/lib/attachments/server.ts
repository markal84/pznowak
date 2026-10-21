import type { Payload } from 'payload'

import type { SubmissionSettings } from '../submissions/config'
import { notifyStudio, payloadMailTransport, type NotifiedSubmission } from '../submissions/notify'
import { setNotificationStatus } from '../submissions/store'
import { attachmentsPrefix, attachmentStorageFromEnv } from './config'
import type { UploadDeps, ViewDeps } from './handler'
import { processImage } from './image'
import { ATTACHMENT_RULES, ATTACHMENTS_RETENTION_MONTHS } from './rules'
import type { AttachmentStorage } from './storage'
import {
  claimCompletion,
  findAttachment,
  findSlot,
  markExpired,
  markMissing,
  markRejected,
  markSkipped,
  markStored,
  referencedPaths,
  staleUploads,
  storedPaths,
  submissionsPastRetention,
} from './store'

/** Przesyłanie uznajemy za porzucone 5 minut po wygaśnięciu biletów. */
export const STALE_UPLOAD_MS = ATTACHMENT_RULES.uploadTokenTtlMs + 5 * 60 * 1000
/** Plik w magazynie bez wiersza w bazie (np. przerwany zapis) jest usuwany dopiero po godzinie. */
export const ORPHAN_GRACE_MS = 60 * 60 * 1000

/** Mail do pracowni, gdy klient skończył przesyłać zdjęcia (albo przesyłanie zostało porzucone). */
export async function notifyAfterUploads(
  payload: Payload,
  submissionId: number,
  settings: Pick<SubmissionSettings, 'notifyTo'>,
  origin: string,
): Promise<void> {
  const doc = await payload.findByID({
    collection: 'submissions',
    id: submissionId,
    depth: 0,
    overrideAccess: true,
  })
  const status = await notifyStudio(doc as NotifiedSubmission, {
    transport: payloadMailTransport(payload),
    to: settings.notifyTo,
    adminUrl: `${origin}/admin/collections/submissions/${submissionId}`,
  })
  await setNotificationStatus(payload, submissionId, status)
}

export function uploadDeps(
  getPayloadInstance: () => Promise<Payload>,
  settings: SubmissionSettings,
  defer: UploadDeps['defer'],
  storage: AttachmentStorage | null = attachmentStorageFromEnv(),
): UploadDeps {
  const db = async () => getPayloadInstance()
  return {
    appSecret: settings.appSecret,
    storage,
    enabled: settings.attachmentsEnabled,
    prefix: attachmentsPrefix(),
    now: Date.now,
    findSlot: async (id) => findSlot(await db(), id),
    processImage,
    markStored: async (id, data) => markStored(await db(), id, data),
    markRejected: async (id, data) => markRejected(await db(), id, data),
    markSkipped: async (id) => markSkipped(await db(), id),
    claimCompletion: async (submissionId) => claimCompletion(await db(), submissionId),
    afterCompletion: async (submissionId, { origin }) =>
      notifyAfterUploads(await db(), submissionId, settings, origin),
    defer,
  }
}

const hasStaffRole = (user: unknown) => {
  const roles = (user as { roles?: string[] | null } | null)?.roles ?? []
  return roles.includes('admin') || roles.includes('editor')
}

export function viewDeps(
  getPayloadInstance: () => Promise<Payload>,
  storage: AttachmentStorage | null = attachmentStorageFromEnv(),
): ViewDeps {
  return {
    storage,
    authorize: async (request) => {
      const payload = await getPayloadInstance()
      const { user } = await payload.auth({ headers: request.headers })
      return user?.collection === 'users' && hasStaffRole(user)
    },
    findAttachment: async (id) => findAttachment(await getPayloadInstance(), id),
  }
}

/** Domyka przesyłania porzucone przez klienta: brakujące pliki = „nie dotarł”, pracownia dostaje powiadomienie. */
export async function finalizeStaleUploads(
  payload: Payload,
  options: { now: Date; settings: Pick<SubmissionSettings, 'notifyTo'>; origin: string },
): Promise<number> {
  const stale = await staleUploads(payload, new Date(options.now.getTime() - STALE_UPLOAD_MS))
  let finalized = 0
  for (const submissionId of stale) {
    await markMissing(payload, submissionId)
    if (await claimCompletion(payload, submissionId)) {
      finalized++
      await notifyAfterUploads(payload, submissionId, options.settings, options.origin)
    }
  }
  return finalized
}

/** Odejmuje miesiące kalendarzowe (6 miesięcy przed 31 sierpnia to 28/29 lutego, nie 3 marca). */
export function monthsBefore(date: Date, months: number): Date {
  const result = new Date(date)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() - months)
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}

/** Retencja: zdjęcia zgłoszeń starszych niż N miesięcy (bez „Zachowaj zdjęcia”) znikają z magazynu. */
export async function expireOldAttachments(
  payload: Payload,
  storage: AttachmentStorage,
  now: Date,
): Promise<number> {
  const due = await submissionsPastRetention(payload, monthsBefore(now, ATTACHMENTS_RETENTION_MONTHS))
  for (const submissionId of due) {
    // Najpierw magazyn: gdy zawiedzie, wiersze zostają i następne sprzątanie spróbuje ponownie.
    await storage.del(await storedPaths(payload, submissionId))
    await markExpired(payload, submissionId)
  }
  return due.length
}

/**
 * Pliki w magazynie, do których nie prowadzi żaden wiersz (przerwany zapis, usunięte zgłoszenie, którego plików
 * nie udało się skasować). Tylko w przedrostku tego środowiska i starsze niż godzina (trwające zapisy).
 */
export async function removeOrphanFiles(
  payload: Payload,
  storage: AttachmentStorage,
  options: { now: Date; prefix: string },
): Promise<number> {
  const referenced = await referencedPaths(payload)
  const cutoff = options.now.getTime() - ORPHAN_GRACE_MS
  const orphans: string[] = []
  for await (const object of storage.list(options.prefix)) {
    if (!referenced.has(object.pathname) && object.uploadedAt.getTime() < cutoff)
      orphans.push(object.pathname)
  }
  for (let i = 0; i < orphans.length; i += 100) await storage.del(orphans.slice(i, i + 100))
  return orphans.length
}

/** Zadanie cykliczne (raz na dobę na produkcji; na preview można je wywołać ręcznie z `CRON_SECRET`). */
export async function runAttachmentMaintenance(
  payload: Payload,
  options: {
    storage: AttachmentStorage | null
    settings: Pick<SubmissionSettings, 'notifyTo'>
    origin: string
    now?: Date
    prefix?: string
  },
): Promise<Record<string, number>> {
  const now = options.now ?? new Date()
  const finalized = await finalizeStaleUploads(payload, {
    now,
    settings: options.settings,
    origin: options.origin,
  })
  if (!options.storage) return { finalized, expired: 0, orphans: 0 }
  const expired = await expireOldAttachments(payload, options.storage, now)
  const orphans = await removeOrphanFiles(payload, options.storage, {
    now,
    prefix: options.prefix ?? attachmentsPrefix(),
  })
  return { finalized, expired, orphans }
}
