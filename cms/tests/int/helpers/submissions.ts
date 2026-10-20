import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { SubmissionSettings } from '@/lib/submissions/config'
import { deriveKey, issueFormToken } from '@/lib/submissions/form-token'
import type { FormKind } from '@/lib/submissions/options'

// Oficjalne klucze testowe Cloudflare (publiczne): 1x… zawsze przechodzi, 2x… zawsze odrzuca, 3x… „token zużyty”.
export const TEST_SECRET_PASS = '1x0000000000000000000000000000000AA'
export const TEST_SECRET_FAIL = '2x0000000000000000000000000000000AA'
export const TEST_SECRET_SPENT = '3x0000000000000000000000000000000AA'
export const DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'

export const APP_SECRET = 'sekret-testowy-zgloszen'

export function testSettings(overrides: Partial<SubmissionSettings> = {}): SubmissionSettings {
  return {
    turnstileSecret: TEST_SECRET_PASS,
    allowTestingKeys: true,
    appSecret: APP_SECRET,
    limits: { perIpHour: 5, perDay: 40, visualizationsPerDay: 10 },
    visualizations: { limit: 10, mode: 'manual', namespace: '' },
    notifyTo: undefined,
    namespace: '',
    ...overrides,
  }
}

/** Token formularza wydany `ageMs` milisekund przed `now`. */
export function formTokenAged(form: FormKind, now: number, ageMs: number, secret = APP_SECRET) {
  return issueFormToken(form, deriveKey(secret, 'form-token'), now - ageMs)
}

export const validCreatorData = (overrides: Record<string, unknown> = {}) => ({
  occasion: 'rocznica',
  when: 'czerwiec 2027',
  gem: 'szmaragd',
  cut: 'serce',
  setting: 'trylogia',
  metal: 'ag',
  width: 'klasyczna',
  pave: 'tak',
  engraving: 'A & M 14.06.2027',
  name: 'Test Automatyczny',
  phone: '501 321 347',
  notes: 'Zgłoszenie z testów integracyjnych.',
  consent: true,
  ...overrides,
})

export const validContactData = (overrides: Record<string, unknown> = {}) => ({
  topic: 'naprawa',
  message: 'Zgłoszenie z testów integracyjnych.',
  name: 'Test Automatyczny',
  phone: '600 100 200',
  email: '',
  consent: true,
  ...overrides,
})

export function submissionRequest(
  body: Record<string, unknown> | string,
  {
    ip = '203.0.113.7',
    host = 'localhost:3000',
    headers = {},
  }: { ip?: string; host?: string; headers?: Record<string, string> } = {},
) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  return new Request(`http://${host}/api/zgloszenia`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      host,
      'x-real-ip': ip,
      'user-agent': 'vitest',
      ...headers,
    },
    body: raw,
  })
}

const endpointOf = (url: string) => new URL(url).hostname.split('.')[0].replace(/-pooler$/, '')

/**
 * Bezpiecznik testów bazodanowych: tylko Neon branch `staging` i nigdy host produkcji
 * (porównanie z `backend/.env.local`, jeśli plik istnieje).
 */
export function stagingDatabaseOrSkipReason(): string | null {
  const url = process.env.DATABASE_URL
  if (process.env.NEON_BRANCH !== 'staging' || !url)
    return 'brak bazy stagingowej (uruchom: npm run test:int:staging)'
  const here = path.dirname(fileURLToPath(import.meta.url))
  const productionEnv = path.resolve(here, '../../../../backend/.env.local')
  if (existsSync(productionEnv)) {
    const productionUrl = /^DATABASE_URL="?([^"\n]+)"?/m.exec(
      readFileSync(productionEnv, 'utf8'),
    )?.[1]
    if (productionUrl && endpointOf(productionUrl) === endpointOf(url)) {
      throw new Error(
        'STOP: DATABASE_URL wskazuje bazę produkcyjną. Testy bazodanowe działają tylko na stagingu.',
      )
    }
  }
  return null
}
