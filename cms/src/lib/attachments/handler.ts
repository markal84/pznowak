import { randomUUID, timingSafeEqual } from 'node:crypto'

import { deriveKey } from '../submissions/form-token'
import { requestOrigin } from '../submissions/handler'
import type { ProcessResult, RejectReason } from './image'
import { ATTACHMENT_RULES } from './rules'
import type { AttachmentStorage } from './storage'
import type { AttachmentRow, CompletionState, SlotRow, StoredData } from './store'
import { checkUploadToken } from './token'

/**
 * Endpointy plików od klientów:
 * - `POST /api/zgloszenia/zalaczniki` – jeden plik na żądanie, z biletem z odpowiedzi na zgłoszenie
 *   (nagłówek `x-upload-token`); `x-upload-skip: 1` zwalnia miejsce, gdy klient nie zdoła wysłać pliku,
 * - `GET /api/zgloszenia/zalaczniki/[id]` – podgląd w panelu, tylko dla zalogowanych (administrator, redaktor),
 * - `GET /api/zgloszenia/zalaczniki/sprzatanie` – zadanie cykliczne Vercela (`CRON_SECRET`).
 *
 * Kolejność przy przesyłaniu: bilet (podpis, termin) → miejsce w bazie wolne → rozmiar (nagłówek, a potem
 * faktycznie odczytane bajty, najwyżej tyle, ile zapowiedziano) → przetworzenie obrazu → zapis w magazynie
 * pod losową nazwą → zajęcie miejsca w bazie (jednorazowo) → po ostatnim pliku powiadomienie pracowni.
 */

export type UploadCode =
  | 'stored'
  | 'skipped'
  | RejectReason
  | 'too_large'
  | 'invalid_token'
  | 'expired_token'
  | 'used_token'
  | 'disabled'
  | 'error'

export const UPLOAD_MESSAGES: Record<UploadCode, string> = {
  stored: 'Zdjęcie dołączone.',
  skipped: 'Zdjęcie pominięte.',
  unsupported_type:
    'Ten plik nie jest zdjęciem w obsługiwanym formacie (JPG, PNG, WebP lub HEIC z iPhone’a).',
  too_large_dimensions: 'To zdjęcie ma zbyt duże wymiary. Zmniejsz je albo zrób zrzut ekranu.',
  corrupt: 'Nie udało się odczytać tego zdjęcia. Plik może być uszkodzony.',
  too_large: 'To zdjęcie jest za duże.',
  invalid_token: 'Nie udało się dołączyć zdjęcia.',
  expired_token: 'Minął czas na dołączenie zdjęć.',
  used_token: 'To zdjęcie zostało już przesłane.',
  disabled: 'Przyjmowanie zdjęć jest chwilowo wyłączone.',
  error: 'Coś poszło nie tak po naszej stronie.',
}

export type UploadResponse = { ok: boolean; code: UploadCode; message: string }

export type UploadDeps = {
  appSecret: string
  /** Przełącznik i magazyn; bez któregokolwiek endpoint odpowiada 503. */
  storage: AttachmentStorage | null
  enabled: boolean
  /** Przedrostek ścieżek środowiska (np. `zgloszenia-staging/`). */
  prefix: string
  now: () => number
  findSlot: (id: string) => Promise<SlotRow | null>
  processImage: (bytes: Buffer) => Promise<ProcessResult>
  markStored: (id: string, data: StoredData) => Promise<boolean>
  markRejected: (
    id: string,
    data: { reason: string; originalName: string | null; detectedType: string | null },
  ) => Promise<boolean>
  markSkipped: (id: string) => Promise<boolean>
  claimCompletion: (submissionId: number) => Promise<CompletionState | null>
  /** Powiadomienie pracowni po ostatnim pliku; uruchamiane po odpowiedzi (`after`). */
  afterCompletion: (submissionId: number, context: { origin: string }) => Promise<void>
  defer: (task: () => Promise<void>) => void
  log?: (event: string, details?: Record<string, unknown>) => void
}

const STATUS: Record<UploadCode, number> = {
  stored: 201,
  skipped: 200,
  unsupported_type: 415,
  too_large_dimensions: 422,
  corrupt: 422,
  too_large: 413,
  invalid_token: 403,
  expired_token: 403,
  used_token: 409,
  disabled: 503,
  error: 500,
}

function reply(code: UploadCode) {
  const body: UploadResponse = { ok: code === 'stored' || code === 'skipped', code, message: UPLOAD_MESSAGES[code] }
  return Response.json(body, { status: STATUS[code], headers: { 'Cache-Control': 'no-store' } })
}

/**
 * Oryginalna nazwa pliku wyłącznie jako tekst do panelu: bez ścieżki, znaków sterujących i kierunkowych,
 * najwyżej 120 znaków. Plik w magazynie ma zawsze losową nazwę.
 */
export function cleanFileName(raw: string | null): string | null {
  if (!raw) return null
  let name = raw
  try {
    name = decodeURIComponent(raw)
  } catch {
    // nagłówek bez kodowania procentowego: zostaje jak jest
  }
  name = name
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/g, '')
    .split(/[\\/]/)
    .pop()!
    .trim()
  return name ? Array.from(name).slice(0, 120).join('') : null
}

/** Treść żądania, najwyżej `limit` bajtów; `null`, gdy klient przysłał więcej. */
export async function readLimited(request: Request, limit: number): Promise<Buffer | null> {
  if (!request.body) return Buffer.alloc(0)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel().catch(() => undefined)
      return null
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks, total)
}

/** POST /api/zgloszenia/zalaczniki */
export async function handleUpload(request: Request, deps: UploadDeps): Promise<Response> {
  const log =
    deps.log ??
    ((event: string, details?: Record<string, unknown>) =>
      console.warn(`[zalaczniki] ${event}`, details ?? ''))
  try {
    const { storage } = deps
    if (!deps.enabled || !storage) return reply('disabled')

    const token = checkUploadToken(
      request.headers.get('x-upload-token'),
      deriveKey(deps.appSecret, 'upload-token'),
      deps.now(),
    )
    if (!token.ok) {
      log(`odrzucone: bilet (${token.reason})`)
      return reply(token.reason === 'expired' ? 'expired_token' : 'invalid_token')
    }
    const slot = await deps.findSlot(token.attachmentId)
    if (!slot) return reply('invalid_token')
    if (slot.state !== 'pending') return reply('used_token')

    const finish = async (code: UploadCode) => {
      const state = await deps.claimCompletion(slot.submissionId)
      if (state) {
        const origin = requestOrigin(request)
        deps.defer(async () => {
          try {
            await deps.afterCompletion(slot.submissionId, { origin })
          } catch (error) {
            log('błąd po zakończeniu przesyłania', {
              id: slot.submissionId,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        })
      }
      return reply(code)
    }

    if (request.headers.get('x-upload-skip') === '1') {
      if (!(await deps.markSkipped(slot.id))) return reply('used_token')
      return finish('skipped')
    }

    const originalName = cleanFileName(request.headers.get('x-file-name'))
    const reject = async (reason: RejectReason | 'too_large', detectedType: string | null = null) => {
      log(`odrzucony plik (${reason})`, { id: slot.submissionId, slot: slot.slot })
      if (!(await deps.markRejected(slot.id, { reason, originalName, detectedType })))
        return reply('used_token')
      return finish(reason)
    }

    // Bilet przyjmuje najwyżej zapowiedziany rozmiar (limity dzienne liczą zapowiedzi).
    const limit = Math.min(slot.declaredBytes, ATTACHMENT_RULES.maxUploadBytes)
    const declaredLength = Number(request.headers.get('content-length') ?? 0)
    if (declaredLength > limit) return reject('too_large')
    let bytes: Buffer | null
    try {
      bytes = await readLimited(request, limit)
    } catch {
      // Zerwane połączenie: miejsce zostaje wolne, klient może spróbować ponownie z tym samym biletem.
      return reply('error')
    }
    if (!bytes) return reject('too_large')
    if (!bytes.length) return reject('unsupported_type')

    const result = await deps.processImage(bytes)
    if (!result.ok) return reject(result.reason)

    const base = `${deps.prefix}${slot.submissionId}/${randomUUID()}`
    const data: StoredData = {
      path: `${base}.jpg`,
      thumbPath: `${base}-min.jpg`,
      bytes: result.full.length,
      width: result.width,
      height: result.height,
      detectedType: result.detectedType,
      originalName,
    }
    await storage.put(data.path, result.full, 'image/jpeg')
    await storage.put(data.thumbPath, result.thumb, 'image/jpeg')
    if (!(await deps.markStored(slot.id, data))) {
      // Równoległe żądanie z tym samym biletem było pierwsze: ten zapis znika.
      await storage.del([data.path, data.thumbPath]).catch(() => undefined)
      return reply('used_token')
    }
    return finish('stored')
  } catch (error) {
    log('błąd obsługi pliku', { error: error instanceof Error ? error.message : String(error) })
    return reply('error')
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export type ViewDeps = {
  storage: AttachmentStorage | null
  /** Czy żądanie pochodzi od zalogowanego administratora lub redaktora (sesja panelu). */
  authorize: (request: Request) => Promise<boolean>
  findAttachment: (id: string) => Promise<AttachmentRow | null>
}

const notFound = () =>
  new Response('Nie znaleziono.', {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
  })

/**
 * GET /api/zgloszenia/zalaczniki/[id]?rozmiar=miniatura – zdjęcie przez serwer, nigdy adres magazynu.
 * Bez sesji panelu, z cudzym identyfikatorem albo po usunięciu: 404 (bez zdradzania, czy plik istnieje).
 */
export async function handleView(request: Request, id: string, deps: ViewDeps): Promise<Response> {
  if (!UUID.test(id) || !deps.storage) return notFound()
  if (!(await deps.authorize(request))) return notFound()
  const attachment = await deps.findAttachment(id)
  const thumb = new URL(request.url).searchParams.get('rozmiar') === 'miniatura'
  const pathname = thumb ? attachment?.thumbPath : attachment?.path
  if (!attachment || attachment.state !== 'stored' || !pathname) return notFound()
  const object = await deps.storage.get(pathname)
  if (!object) return notFound()
  return new Response(object.body, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(object.size),
      'Content-Disposition': `inline; filename="zgloszenie-${attachment.submissionId}-${attachment.slot}.jpg"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Referrer-Policy': 'no-referrer',
    },
  })
}

/** GET /api/zgloszenia/zalaczniki/sprzatanie – tylko z nagłówkiem `Authorization: Bearer <CRON_SECRET>`. */
export async function handleCleanup(
  request: Request,
  deps: { cronSecret: string | undefined; run: () => Promise<Record<string, number>> },
): Promise<Response> {
  if (!deps.cronSecret) return Response.json({ ok: false, code: 'disabled' }, { status: 503 })
  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${deps.cronSecret}`)
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return Response.json({ ok: false, code: 'unauthorized' }, { status: 401 })
  const summary = await deps.run()
  return Response.json({ ok: true, ...summary }, { headers: { 'Cache-Control': 'no-store' } })
}
