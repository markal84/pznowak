import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

import type { FormKind } from './options'

/**
 * Token „otwarcia formularza”: serwer podpisuje chwilę wydania (HMAC), a przy wysyłce sprawdza, ile minęło.
 * Bot, który wysyła od razu albo podrabia znacznik czasu, zostaje odrzucony. Token nie jest jednorazowy;
 * powtórne użycie blokuje jednorazowy token Turnstile.
 */

export const FORM_TIMING: Record<FormKind, { minMs: number }> & { maxAgeMs: number } = {
  // Sześć kroków kreatora w mniej niż 5 s to nie jest człowiek.
  kreator: { minMs: 5_000 },
  kontakt: { minMs: 3_000 },
  // Formularz otwarty dłużej niż 12 godzin trzeba odświeżyć (klient pobiera wtedy nowy token sam).
  maxAgeMs: 12 * 60 * 60 * 1000,
}

const VERSION = 'v1'
const CLOCK_SKEW_MS = 5_000

/** Klucz pochodny od sekretu aplikacji, osobny dla każdego zastosowania. */
export function deriveKey(
  secret: string,
  purpose: 'form-token' | 'ip-hash' | 'upload-token',
): Buffer {
  return createHmac('sha256', secret).update(`pznowak:zgloszenia:${purpose}`).digest()
}

function sign(body: string, key: Buffer): string {
  return createHmac('sha256', key).update(body).digest('base64url')
}

export function issueFormToken(form: FormKind, key: Buffer, now: number): string {
  const body = `${VERSION}.${form}.${now}.${randomBytes(9).toString('base64url')}`
  return `${body}.${sign(body, key)}`
}

export type FormTokenCheck =
  { ok: true; ageMs: number } | { ok: false; reason: 'invalid' | 'too_fast' | 'expired' }

export function checkFormToken(
  token: unknown,
  form: FormKind,
  key: Buffer,
  now: number,
): FormTokenCheck {
  if (typeof token !== 'string' || token.length > 200) return { ok: false, reason: 'invalid' }
  const parts = token.split('.')
  if (parts.length !== 5) return { ok: false, reason: 'invalid' }
  const [version, tokenForm, issued, , signature] = parts
  if (version !== VERSION || tokenForm !== form || !/^\d{13}$/.test(issued))
    return { ok: false, reason: 'invalid' }

  const expected = Buffer.from(sign(parts.slice(0, 4).join('.'), key))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given))
    return { ok: false, reason: 'invalid' }

  const ageMs = now - Number(issued)
  if (ageMs < -CLOCK_SKEW_MS) return { ok: false, reason: 'invalid' }
  if (ageMs < FORM_TIMING[form].minMs) return { ok: false, reason: 'too_fast' }
  if (ageMs > FORM_TIMING.maxAgeMs) return { ok: false, reason: 'expired' }
  return { ok: true, ageMs }
}

/** Skrót adresu IP do liczników i rekordu zgłoszenia; sam adres nie jest zapisywany. */
export function hashIp(ip: string, key: Buffer): string {
  return createHmac('sha256', key).update(ip).digest('hex').slice(0, 32)
}
