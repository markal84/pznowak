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
    await page.getByRole('textbox', { name: 'Telefon' }).fill('501 321 347')
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
    await page.getByRole('textbox', { name: 'Telefon' }).fill('600 100 200')
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
      .getByLabel('Opisz, czego szukasz')
      .fill('Zgłoszenie testowe Playwright, proszę zignorować. Jak na https://pinterest.com/pin/1')
    await page.getByLabel(/Grawer/).fill('Na zawsze ♥')
    await page.getByRole('radio', { name: 'Znam rozmiar' }).check()
    await page.getByLabel('Rozmiar w polskiej skali').selectOption('14')
    await page.getByLabel('Imię').fill(E2E_NAME)
    await page.getByRole('textbox', { name: 'Telefon' }).fill('600 100 200')
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
        meeting: 'pracownia',
        contactPreference: 'telefon',
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

  test('kontakt na telefonie: po wysłaniu karta „Wiadomość wysłana” jest w widoku, a „Napisz kolejną” wraca na początek formularza', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await visit(page, '/kontakt')
    await expectTurnstileFrame(page)
    await page.locator('label.topic', { hasText: 'Naprawa lub przeróbka' }).click()
    await page
      .getByLabel('Co trzeba zrobić?')
      .fill('Zgłoszenie testowe Playwright, proszę zignorować.')
    await page.getByLabel('Imię').fill(E2E_NAME)
    await page.getByRole('textbox', { name: 'Telefon' }).fill('600 100 200')
    await page.getByLabel(/Zgadzam się na kontakt w sprawie mojej wiadomości/).check()

    const response = submissionResponse(page)
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
    expect((await response).status()).toBe(201)

    const card = page.locator('.sent-card')
    await expect(card.getByRole('heading', { name: 'Wiadomość wysłana' })).toBeVisible()
    await expect(card).toBeInViewport()
    await expect(card).toBeFocused()

    await page.getByRole('button', { name: 'Napisz kolejną wiadomość' }).click()
    await expect(page.getByRole('form', { name: 'Formularz kontaktowy' })).toBeInViewport()
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
    await page.getByRole('textbox', { name: 'Telefon' }).fill('600 100 200')
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
    await page.getByRole('textbox', { name: 'Telefon' }).fill('600 100 200')
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

/**
 * Zlecenie X: nowe pola formularza kontaktowego. Odpowiedź serwera jest atrapą (201), żeby testy nie zapisywały
 * zgłoszeń w bazie stagingowej i nie zużywały limitu 5 zgłoszeń na godzinę z jednego IP (testy idą na kilku
 * przeglądarkach z jednego runnera). Prawdziwą wysyłkę sprawdzają testy wyżej, a walidację serwera testy
 * integracyjne (`tests/int/submissions-form-x.int.spec.ts`).
 */
test.describe('Formularz kontaktowy: rozmowa, kontakt i budżet (zlecenie X)', () => {
  test.describe.configure({ timeout: 90_000 })

  /** Atrapa POST /api/zgloszenia; zwraca treść żądań, które wysłał formularz. */
  async function fakeAccept(page: Page) {
    const bodies: Array<Record<string, unknown>> = []
    await page.route('**/api/zgloszenia', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      bodies.push(route.request().postDataJSON())
      await route.fulfill({
        status: 201,
        json: { ok: true, code: 'accepted', message: 'Dziękujemy. Zgłoszenie trafiło do pracowni.' },
      })
    })
    return bodies
  }

  async function fillPerson(page: Page) {
    await page.getByLabel('Imię').fill(E2E_NAME)
    await page.getByRole('textbox', { name: 'Telefon' }).fill('600 100 200')
    await page.getByLabel(/Zgadzam się na kontakt w sprawie mojej wiadomości/).check()
  }

  const TOPICS = [
    { id: 'nowy', label: 'Pierścionek lub obrączki na zamówienie', message: 'Opisz, czego szukasz', meeting: true },
    { id: 'kolekcja', label: 'Projekt z kolekcji', message: 'Co chcesz zmienić w projekcie?', meeting: true },
    { id: 'obraczki', label: 'Obrączki ślubne', message: 'Coś jeszcze o obrączkach?', meeting: true },
    { id: 'naprawa', label: 'Naprawa lub przeróbka', message: 'Co trzeba zrobić?', meeting: false },
    { id: 'inne', label: 'Inne pytanie', message: 'Twoja wiadomość', meeting: true },
  ] as const

  for (const topic of TOPICS) {
    test(`${topic.label}: formularz wysyła temat, formę rozmowy i preferowany kontakt`, async ({ page }) => {
      const bodies = await fakeAccept(page)
      await visit(page, `/kontakt?temat=${topic.id}`)
      await expect(page.locator('label.topic', { hasText: topic.label })).toHaveClass(/is-checked/)
      const meeting = page.getByRole('group', { name: 'Jak wolisz porozmawiać?' })
      if (topic.meeting) {
        await expect(meeting.getByRole('radio', { name: 'W pracowni w Busku-Zdroju' })).toBeChecked()
      } else {
        // naprawa jest usługą na miejscu: bez pytania o rozmowę zdalną
        await expect(meeting).toHaveCount(0)
      }
      await expect(page.getByRole('radio', { name: 'Telefon', exact: true })).toBeChecked()
      await page.getByLabel(topic.message).fill('Zgłoszenie testowe Playwright, proszę zignorować.')
      await fillPerson(page)
      await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
      await expect(page.getByRole('heading', { name: 'Wiadomość wysłana' })).toBeVisible({ timeout: 30_000 })
      expect(bodies).toHaveLength(1)
      const data = bodies[0].data as Record<string, unknown>
      expect(data).toMatchObject({ topic: topic.id, contactPreference: 'telefon', name: E2E_NAME })
      if (topic.meeting) expect(data.meeting).toBe('pracownia')
      else expect(data).not.toHaveProperty('meeting')
      await expect(page.getByText(/Odezwiemy się telefonicznie/)).toBeVisible()
    })
  }

  test('„mieszkam dalej”: inne „Co dalej”, podpowiedź o jubilerze w okolicy, bez obietnic wysyłki i miarek', async ({
    page,
  }) => {
    const bodies = await fakeAccept(page)
    await visit(page, '/kontakt?temat=nowy')
    const steps = page.locator('ol[data-meeting]')
    await expect(steps).toContainText('W pracowni oglądasz kamienie i projekty.')
    await expect(page.getByText(/Zmierzymy palec w pracowni/)).toBeVisible()

    await page.getByRole('radio', { name: 'Telefonicznie albo przez wideo – mieszkam dalej' }).check()
    await expect(steps).toHaveAttribute('data-meeting', 'zdalnie')
    await expect(steps).toContainText('Pokazujemy kamienie i projekty na zdjęciach i filmach.')
    await expect(steps).not.toContainText('W pracowni oglądasz')
    await expect(page.getByText('Rozmiar zmierzy bez problemu każdy jubiler w Twojej okolicy', { exact: false })).toBeVisible()
    await expect(page.getByText(/Zmierzymy palec w pracowni/)).toHaveCount(0)
    await expect(page.locator('main')).not.toContainText(/wysyłamy (gotow|pierście)|\bmiark|do przymiarki/i)

    // naprawa: pytania o rozmowę nie ma, „Co dalej” wraca do pracowni
    await page.locator('label.topic', { hasText: 'Naprawa lub przeróbka' }).click()
    await expect(steps).toHaveAttribute('data-meeting', 'pracownia')
    await page.locator('label.topic', { hasText: 'Pierścionek lub obrączki na zamówienie' }).click()
    await expect(steps).toHaveAttribute('data-meeting', 'zdalnie')

    await page.getByLabel('Opisz, czego szukasz').fill('Zgłoszenie testowe Playwright, proszę zignorować.')
    await page.getByRole('radio', { name: 'SMS' }).check()
    await fillPerson(page)
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
    await expect(page.getByRole('heading', { name: 'Wiadomość wysłana' })).toBeVisible({ timeout: 30_000 })
    expect(bodies[0].data).toMatchObject({ topic: 'nowy', meeting: 'zdalnie', contactPreference: 'sms' })
    await expect(page.getByText(/Odezwiemy się SMS-em/)).toBeVisible()
    await expect(page.getByText('Odpowiadamy zwykle tego samego dnia roboczego.')).toBeVisible()
  })

  test('budżet: przedziały, „Podam kwotę” z polem na cyfry; błędna kwota i brak e-maila przy „E-mail” zatrzymują wysyłkę', async ({
    page,
  }) => {
    const bodies = await fakeAccept(page)
    await visit(page, '/kontakt?temat=nowy')
    await expect(page.getByText('Odpowiadamy zwykle tego samego dnia roboczego.')).toBeVisible()
    const budget = page.getByLabel(/Budżet/)
    await expect(budget.locator('option')).toHaveText([
      'Jeszcze nie wiem',
      'do 4 000 zł',
      '4 000–10 000 zł',
      'powyżej 10 000 zł',
      'Podam kwotę',
    ])
    await expect(page.getByLabel('Kwota w złotych')).toHaveCount(0)
    await budget.selectOption('kwota')
    await page.getByLabel('Kwota w złotych').fill('6000 zł')
    await page.getByRole('radio', { name: 'E-mail' }).check()
    // przy „E-mail” znika dopisek „(opcjonalnie)”
    await expect(page.locator('label[for="k-mail"]')).toHaveText('E-mail')
    await page.getByLabel('Opisz, czego szukasz').fill('Zgłoszenie testowe Playwright, proszę zignorować.')
    await fillPerson(page)
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()

    await expect(page.getByText('Wpisz kwotę samymi cyframi, np. 6000 (najwyżej 7 cyfr).')).toBeVisible()
    await expect(page.getByText('Podaj adres e-mail albo wybierz kontakt przez telefon lub SMS.')).toBeVisible()
    await expect(page.getByLabel('Kwota w złotych')).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByRole('textbox', { name: 'E-mail' })).toHaveAttribute('aria-invalid', 'true')
    expect(bodies).toHaveLength(0)

    await page.getByLabel('Kwota w złotych').fill('6 000')
    await page.getByRole('textbox', { name: 'E-mail' }).fill('test-playwright@example.com')
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
    await expect(page.getByRole('heading', { name: 'Wiadomość wysłana' })).toBeVisible({ timeout: 30_000 })
    expect(bodies[0].data).toMatchObject({
      budget: 'kwota',
      budgetAmount: '6 000',
      contactPreference: 'email',
      email: 'test-playwright@example.com',
    })
    await expect(page.getByText(/Odezwiemy się e-mailem/)).toBeVisible()
  })
})
