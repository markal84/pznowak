import type { BrowserContext } from '@playwright/test'

/** Ustawia zapisany wybór cookies (odrzucone opcjonalne), żeby pasek zgody nie zasłaniał stron w testach innych funkcji. */
export async function presetConsent(context: BrowserContext, baseURL: string | undefined, analytics = false) {
  const value = encodeURIComponent(JSON.stringify({ v: 1, at: Date.now(), analytics }))
  await context.addCookies([{ name: 'pn_consent', value, url: baseURL ?? 'http://localhost:3000' }])
}
