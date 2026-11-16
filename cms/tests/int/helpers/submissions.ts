
import type { SubmissionSettings } from '@/lib/submissions/config'
import { deriveKey, issueFormToken } from '@/lib/submissions/form-token'
import { DEFAULT_LIMITS, type LimitSettings } from '@/lib/submissions/limits'
import type { FormKind } from '@/lib/submissions/options'

import { LIVE_ENDPOINT } from '../../../scripts/live-db'

// Oficjalne klucze testowe Cloudflare (publiczne): 1x… zawsze przechodzi, 2x… zawsze odrzuca, 3x… „token zużyty”.
export const TEST_SECRET_PASS = '1x0000000000000000000000000000000AA'
export const TEST_SECRET_FAIL = '2x0000000000000000000000000000000AA'
export const TEST_SECRET_SPENT = '3x0000000000000000000000000000000AA'
export const DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'

export const APP_SECRET = 'sekret-testowy-zgloszen'

/** Domyślne limity (5/h z IP, 40/dzień, kwarantanna 1/h z IP i 10/dzień) z wybranymi zmianami. */
export const testLimits = (overrides: Partial<LimitSettings> = {}): LimitSettings => ({
  ...DEFAULT_LIMITS,
  ...overrides,
})

export function testSettings(overrides: Partial<SubmissionSettings> = {}): SubmissionSettings {
  return {
    turnstileSecret: TEST_SECRET_PASS,
    allowTestingKeys: true,
    clientIpSource: { kind: 'legacy' },
    publicOrigin: null,
    appSecret: APP_SECRET,
    limits: testLimits(),
    visualizations: { limit: 10, mode: 'manual', namespace: '' },
    notifyTo: undefined,
    namespace: '',
    creatorEnabled: true,
    attachmentsEnabled: false,
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
  // Przy naprawie formularz nie pyta o formę rozmowy (pole jest pomijane); przy innych tematach jest wymagane.
  meeting: 'pracownia',
  contactPreference: 'telefon',
  message: 'Zgłoszenie z testów integracyjnych.',
  name: 'Test Automatyczny',
  phone: '600 100 200',
  email: 'klient@example.pl',
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
 * Bezpiecznik testów bazodanowych: tylko osobna gałąź Neon z NEON_BRANCH=test i nigdy żywa baza
 * (endpoint z `scripts/live-db.ts`). Dawny „staging” był żywą bazą, więc testy nie mogą już na nim działać.
 */
export function stagingDatabaseOrSkipReason(): string | null {
  const url = process.env.DATABASE_URL
  if (url && endpointOf(url).startsWith(LIVE_ENDPOINT)) {
    throw new Error('STOP: DATABASE_URL wskazuje żywą bazę pznowak.pl. Testy bazodanowe tylko na gałęzi testowej.')
  }
  if (process.env.NEON_BRANCH !== 'test' || !url)
    return 'brak gałęzi testowej Neon (NEON_BRANCH=test); żywej bazy testy nie dotykają'
  return null
}
