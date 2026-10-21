import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Bilet na przesłanie jednego pliku. Wydaje go wyłącznie endpoint zgłoszeń, po honeypocie, czasie wypełnienia,
 * walidacji, Cloudflare Turnstile i limitach. Bilet wskazuje jedno miejsce na plik (wiersz
 * `cms_submission_attachments`) i ma krótki termin ważności; jednorazowość pilnuje stan wiersza w bazie
 * (miejsce przyjmuje plik tylko raz).
 */

const VERSION = 'u1'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function sign(body: string, key: Buffer): string {
  return createHmac('sha256', key).update(body).digest('base64url')
}

export function issueUploadToken(attachmentId: string, expiresAt: number, key: Buffer): string {
  const body = `${VERSION}.${attachmentId}.${expiresAt}`
  return `${body}.${sign(body, key)}`
}

export type UploadTokenCheck =
  { ok: true; attachmentId: string } | { ok: false; reason: 'invalid' | 'expired' }

export function checkUploadToken(token: unknown, key: Buffer, now: number): UploadTokenCheck {
  if (typeof token !== 'string' || token.length > 200) return { ok: false, reason: 'invalid' }
  const parts = token.split('.')
  if (parts.length !== 4) return { ok: false, reason: 'invalid' }
  const [version, attachmentId, expiresAt, signature] = parts
  if (version !== VERSION || !UUID.test(attachmentId) || !/^\d{13}$/.test(expiresAt))
    return { ok: false, reason: 'invalid' }
  const expected = Buffer.from(sign(parts.slice(0, 3).join('.'), key))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given))
    return { ok: false, reason: 'invalid' }
  if (now > Number(expiresAt)) return { ok: false, reason: 'expired' }
  return { ok: true, attachmentId }
}
