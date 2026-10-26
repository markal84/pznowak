import type { BrowserContext } from '@playwright/test'
import { CONSENT_COOKIE, CONSENT_VERSION, NO_OPTIONAL, type ConsentChoice } from '../../src/lib/cookie-consent'

/** Ustawia zapisany wybór cookies (domyślnie odrzucone opcjonalne), żeby pasek zgody nie zasłaniał stron w testach innych funkcji. */
export async function presetConsent(
  context: BrowserContext,
  baseURL: string | undefined,
  choice: Partial<ConsentChoice> = {},
) {
  const value = encodeURIComponent(JSON.stringify({ v: CONSENT_VERSION, at: Date.now(), ...NO_OPTIONAL, ...choice }))
  await context.addCookies([{ name: CONSENT_COOKIE, value, url: baseURL ?? 'http://localhost:3000' }])
}
