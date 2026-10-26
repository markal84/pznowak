import { expect, test, type Page } from '@playwright/test'
import { RING_CREATOR_ENABLED } from '../../src/lib/site'
import { presetConsent } from '../helpers/consent'

/**
 * Ścieżka człowieka przez kreator i formularz kontaktowy z prawdziwą wysyłką do /api/zgloszenia.
 * Środowisko musi mieć klucze testowe Cloudflare Turnstile (preview, lokalny serwer z bazą stagingową).
 * Zgłoszenia zapisują się na stagingu z imieniem „Test Playwright”; sprząta je `npm run staging:cleanup-tests -- --apply`.
 */

test.skip(
  process.env.E2E_SUBMISSIONS === 'off',
  'wysyłka wyłączona w tym środowisku (brak kluczy Turnstile)',
)

const E2E_NAME = 'Test Playwright'

async function visit(page: Page, path: string) {
  const response = await page.goto(path)
  await page.waitForSelector('html[data-hydrated="true"]')
  return response
}

/** Żądania zapisujące do naszego serwera (bez ruchu Turnstile do Cloudflare). */
function captureWrites(page: Page) {
  const writes: string[] = []
  page.on('request', (r) => {
    // OPTIONS wysyła m.in. pasek narzędzi Vercela na wdrożeniach preview; nie zapisuje danych.
    if (['GET', 'HEAD', 'OPTIONS'].includes(r.method())) return
    if (new URL(r.url()).origin === new URL(page.url()).origin)
      writes.push(`${r.method()} ${new URL(r.url()).pathname}`)
  })
  return writes
}

/** Widżet Turnstile renderuje iframe Cloudflare w zamkniętym shadow DOM, więc szukamy go wśród ramek strony. */
async function expectTurnstileFrame(page: Page) {
  await expect
    .poll(
      () =>
        page.frames().some((frame) => frame.url().startsWith('https://challenges.cloudflare.com/')),
      { timeout: 20_000 },
    )
    .toBe(true)
}

const submissionResponse = (page: Page) =>
  page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/zgloszenia' && r.request().method() === 'POST',
    { timeout: 45_000 },
  )

test.beforeEach(async ({ context, baseURL }) => {
  await presetConsent(context, baseURL)
})

test.describe('Wysyłka zgłoszeń z Turnstile', () => {
  test('kreator: człowiek przechodzi kroki i wysyła projekt do pracowni', async ({ page }) => {
    test.skip(!RING_CREATOR_ENABLED, 'kreator ukryty (RING_CREATOR_ENABLED = false)')
    await visit(page, '/kreator')
    const writes = captureWrites(page)

    await page.getByRole('button', { name: /Zaręczyny/ }).click()
    await page.getByRole('button', { name: 'Dalej: kamień' }).click()
    await page.getByRole('button', { name: /^Rubin/ }).click()
    await page.getByRole('button', { name: 'Dalej: szlif' }).click()
    await page.getByRole('button', { name: 'Okrągły' }).click()
    await page.getByRole('button', { name: 'Dalej: oprawa' }).click()
    await page.getByRole('button', { name: /^Kaszta/ }).click()
    await page.getByRole('button', { name: 'Dalej: złoto' }).click()
    await page.getByRole('button', { name: /^Dwukolorowe/ }).click()
    await page.getByLabel(/Grawer w środku/).fill('Na zawsze ♥')
    await page.getByRole('button', { name: 'Przejdź do podsumowania' }).click()
    await expect(page.getByRole('heading', { name: 'Twój szkic jest gotowy' })).toBeVisible()

    // Widżet Turnstile ładuje się z Cloudflare (iframe); w trybie „tylko interakcja” jest niewidoczny.
    await expectTurnstileFrame(page)

    await page.getByLabel('Imię').fill(E2E_NAME)
    await page.getByLabel('Telefon').fill('501 321 347')
    await page.getByLabel(/Coś jeszcze/).fill('Zgłoszenie testowe Playwright, proszę zignorować.')
    await page.getByLabel(/Zgadzam się na kontakt w sprawie projektu/).check()

    const response = submissionResponse(page)
    await page.getByRole('button', { name: 'Wyślij projekt do pracowni' }).click()
    const sent = await response
    expect(sent.status()).toBe(201)
    const body = sent.request().postDataJSON()
    expect(body).toMatchObject({ form: 'kreator', honeypot: '' })
    expect(body.turnstileToken).toBeTruthy()
    expect(body.formToken).toMatch(/^v1\.kreator\./)
    expect(body.data).toMatchObject({
      occasion: 'zareczyny',
      gem: 'rubin',
      cut: 'okragly',
      setting: 'kaszta',
      metal: 'dwa',
      engraving: 'Na zawsze ♥',
      name: E2E_NAME,
      consent: true,
    })
    expect(await sent.json()).toMatchObject({ ok: true, code: 'accepted' })

    await expect(page.getByRole('heading', { name: 'Projekt wysłany' })).toBeVisible()
    expect(writes).toEqual(['POST /api/zgloszenia'])
  })

  test('kontakt: wiadomość o naprawie trafia do pracowni', async ({ page }) => {
    await visit(page, '/kontakt')
    const writes = captureWrites(page)
    await page.locator('label.topic', { hasText: 'Naprawa lub przeróbka' }).click()
    await expectTurnstileFrame(page)
    await page
      .getByLabel('Co trzeba zrobić?')
      .fill('Zgłoszenie testowe Playwright, proszę zignorować.')
    await page.getByLabel('Imię').fill(E2E_NAME)
    await page.getByLabel('Telefon').fill('600 100 200')
    await page.getByLabel(/Zgadzam się na kontakt w sprawie mojej wiadomości/).check()

    const response = submissionResponse(page)
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
    const sent = await response
    expect(sent.status()).toBe(201)
    expect(sent.request().postDataJSON()).toMatchObject({
      form: 'kontakt',
      honeypot: '',
      data: { topic: 'naprawa', name: E2E_NAME },
    })
    await expect(page.getByRole('heading', { name: 'Wiadomość wysłana' })).toBeVisible()
    expect(writes).toEqual(['POST /api/zgloszenia'])
  })

  test('kontakt: zamówienie z opisem, grawerem i rozmiarem trafia do pracowni', async ({
    page,
  }) => {
    await visit(page, '/kontakt?temat=nowy')
    const writes = captureWrites(page)
    await expectTurnstileFrame(page)
    await page.getByLabel('Okazja').fill('zaręczyny')
    await page
      .getByLabel('Co Ci się podoba?')
      .fill('Zgłoszenie testowe Playwright, proszę zignorować. Jak na https://pinterest.com/pin/1')
    await page.getByLabel(/Grawer/).fill('Na zawsze ♥')
    await page.getByRole('radio', { name: 'Znam rozmiar' }).check()
    await page.getByLabel('Rozmiar w polskiej skali').selectOption('14')
    await page.getByLabel('Imię').fill(E2E_NAME)
    await page.getByLabel('Telefon').fill('600 100 200')
    await page.getByLabel(/Zgadzam się na kontakt w sprawie mojej wiadomości/).check()

    const response = submissionResponse(page)
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
    const sent = await response
    expect(sent.status()).toBe(201)
    expect(sent.request().postDataJSON()).toMatchObject({
      form: 'kontakt',
      honeypot: '',
      data: {
        topic: 'nowy',
        occasionText: 'zaręczyny',
        engraving: 'Na zawsze ♥',
        ringSizeKnown: 'known',
        ringSize: '14',
        name: E2E_NAME,
        consent: true,
      },
    })
    expect(await sent.json()).toMatchObject({ ok: true, code: 'accepted' })
    await expect(page.getByRole('heading', { name: 'Wiadomość wysłana' })).toBeVisible()
    expect(writes).toEqual(['POST /api/zgloszenia'])
  })

  test('pole-pułapka jest niewidoczne, poza tabulacją i poza drzewem dostępności', async ({
    page,
  }) => {
    await visit(page, '/kontakt')
    const trap = page.locator('input[name="pole_kontrolne"]')
    await expect(trap).toBeAttached()
    await expect(trap).not.toBeInViewport()
    await expect(trap).toHaveAttribute('tabindex', '-1')
    await expect(page.getByRole('textbox', { name: 'Zostaw to pole puste' })).toHaveCount(0)
  })

  test('Cloudflare zablokowany tylko w przeglądarce: zgłoszenie idzie z flagą, serwer widzi działający Cloudflare i odmawia bez kwarantanny', async ({
    page,
  }) => {
    // np. bloker reklam: skrypt Turnstile się nie ładuje, ale serwer dalej rozmawia z Cloudflare
    await page.route('https://challenges.cloudflare.com/**', (route) => route.abort())
    await visit(page, '/kontakt')
    const writes = captureWrites(page)
    await page.locator('label.topic', { hasText: 'Inne pytanie' }).click()
    await page
      .getByLabel('Twoja wiadomość')
      .fill('Zgłoszenie testowe Playwright, proszę zignorować.')
    await page.getByLabel('Imię').fill(E2E_NAME)
    await page.getByLabel('Telefon').fill('600 100 200')
    await page.getByLabel(/Zgadzam się na kontakt/).check()

    const response = submissionResponse(page)
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
    const sent = await response
    expect(sent.request().postDataJSON()).toMatchObject({
      form: 'kontakt',
      turnstileToken: '',
      turnstileUnavailable: true,
    })
    expect(sent.status()).toBe(403)
    expect(await sent.json()).toMatchObject({ ok: false, code: 'verification_failed' })

    const alert = page
      .getByRole('alert')
      .filter({ hasText: 'Nie udało się potwierdzić, że wysyła człowiek' })
    await expect(alert).toBeVisible()
    await expect(alert.getByRole('link', { name: '+48 501 321 347' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Wyślij wiadomość' })).toBeEnabled()
    expect(writes).toEqual(['POST /api/zgloszenia'])
  })

  test('gdy serwer nie może potwierdzić wysyłki (np. wyczerpana kwarantanna), człowiek dostaje telefon i e-mail (atrapa 503)', async ({
    page,
  }) => {
    await page.route('**/api/zgloszenia', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      await route.fulfill({
        status: 503,
        json: {
          ok: false,
          code: 'verification_unavailable',
          message: 'Nie możemy teraz potwierdzić wysyłki. Zadzwoń lub napisz:',
        },
      })
    })
    await visit(page, '/kontakt')
    await page.locator('label.topic', { hasText: 'Inne pytanie' }).click()
    await page.getByLabel('Twoja wiadomość').fill('Pytanie testowe.')
    await page.getByLabel('Imię').fill(E2E_NAME)
    await page.getByLabel('Telefon').fill('600 100 200')
    await page.getByLabel(/Zgadzam się na kontakt/).check()
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
    const alert = page
      .getByRole('alert')
      .filter({ hasText: 'Nie możemy teraz potwierdzić wysyłki' })
    await expect(alert).toBeVisible({ timeout: 30_000 })
    await expect(alert.getByRole('link', { name: '+48 501 321 347' })).toHaveAttribute(
      'href',
      'tel:+48501321347',
    )
    await expect(alert.getByRole('link', { name: 'kontakt@pznowak.pl' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Wyślij wiadomość' })).toBeEnabled()
  })
})
