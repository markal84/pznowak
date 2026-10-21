import { randomBytes, randomUUID } from 'node:crypto'

import { expect, test } from '@playwright/test'
import type { Payload } from 'payload'
import sharp from 'sharp'

import { stagingDatabaseOrSkipReason } from '../int/helpers/submissions'

/**
 * Zdjęcia w panelu (Zlecenie B): klient wysyła formularz ze zdjęciami, a redaktor widzi je przy zgłoszeniu;
 * ten sam adres zdjęcia bez sesji panelu daje 404. Test zakłada tymczasowego redaktora z losowym hasłem w bazie
 * stagingowej i usuwa go razem ze zgłoszeniem po teście. Tylko lokalnie, z dostępem do bazy stagingowej:
 * `E2E_PANEL=staging` + zmienne bazy stagingowej w procesie testów (np. `node --env-file=../backend/.env.staging.local`).
 */

const skipReason =
  process.env.E2E_PANEL !== 'staging'
    ? 'test panelu tylko lokalnie z bazą stagingową (E2E_PANEL=staging)'
    : (process.env.E2E_ATTACHMENTS !== 'on' && 'zdjęcia wyłączone (E2E_ATTACHMENTS=on)') ||
      stagingDatabaseOrSkipReason()

test.describe('Zdjęcia od klienta w panelu', () => {
  test.skip(Boolean(skipReason), skipReason || '')

  const RUN = randomUUID().slice(0, 8)
  const editor = {
    email: `redaktor-${RUN}@example.test`,
    password: randomBytes(18).toString('base64url'),
    name: 'Redaktor testowy (Playwright)',
    roles: ['editor'] as Array<'admin' | 'editor'>,
  }
  let payload: Payload
  let submissionId: number | undefined

  test.beforeAll(async () => {
    const { getPayload } = await import('payload')
    const config = (await import('../../src/payload.config.js')).default
    payload = await getPayload({ config })
    await payload.create({ collection: 'users', data: editor, overrideAccess: true })
  })

  test.afterAll(async () => {
    if (!payload) return
    if (submissionId)
      await payload.delete({ collection: 'submissions', id: submissionId, overrideAccess: true })
    await payload.delete({
      collection: 'users',
      where: { email: { equals: editor.email } },
      overrideAccess: true,
    })
  })

  test('redaktor widzi zdjęcia przy zgłoszeniu, a bez sesji ten sam adres daje 404', async ({ page, browser }) => {
    // 1. Klient: formularz kontaktowy z dwoma zdjęciami.
    await page.goto('/kontakt')
    await page.waitForSelector('html[data-hydrated="true"]')
    await page.locator('label.topic', { hasText: 'Inne pytanie' }).click()
    await page.getByLabel('Twoja wiadomość').fill(`Test panelu ${RUN}, proszę zignorować.`)
    await page.getByLabel('Imię').fill('Test Playwright')
    await page.getByLabel('Telefon').fill('600 100 200')
    await page.getByLabel(/Zgadzam się na kontakt/).check()
    const photo = (background: string) =>
      sharp({ create: { width: 800, height: 600, channels: 3, background } }).jpeg().toBuffer()
    await page.getByLabel('Dodaj zdjęcia').setInputFiles([
      { name: 'inspiracja.jpg', mimeType: 'image/jpeg', buffer: await photo('#b8893f') },
      { name: 'obraczka-babci.jpg', mimeType: 'image/jpeg', buffer: await photo('#2c5148') },
    ])
    await expect(page.locator('img.att-thumb')).toHaveCount(2)
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
    await expect(page.getByText('Dołączone: 2 zdjęcia.')).toBeVisible({ timeout: 45_000 })

    const found = await payload.find({
      collection: 'submissions',
      where: { message: { contains: RUN } },
      depth: 0,
      overrideAccess: true,
    })
    submissionId = found.docs[0]?.id
    expect(submissionId).toBeTruthy()
    await expect
      .poll(async () => (await payload.findByID({ collection: 'submissions', id: submissionId!, overrideAccess: true })).attachmentsState)
      .toBe('complete')

    // 2. Redaktor w panelu.
    await page.goto('/admin/login')
    await page.fill('#field-email', editor.email)
    await page.fill('#field-password', editor.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/admin(?!\/login)/)
    await page.goto(`/admin/collections/submissions/${submissionId}`)
    await expect(page.getByText('Zdjęcia od klienta').first()).toBeVisible()
    const images = page.locator('img[src*="/api/zgloszenia/zalaczniki/"]')
    await expect(images).toHaveCount(2)
    for (const image of await images.all()) {
      await image.scrollIntoViewIfNeeded()
      await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0)
    }
    await expect(page.getByText(/Plik 1 · „inspiracja\.jpg” · z JPG · 800×600/)).toBeVisible()
    await expect(page.getByText('Zachowaj zdjęcia (zamówienie)')).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('panel-zdjecia.png'), fullPage: true })

    // 3. Pełny rozmiar z sesją: obraz; ten sam adres bez sesji: 404.
    const src = (await images.first().getAttribute('src'))!.replace('?rozmiar=miniatura', '')
    const withSession = await page.request.get(src)
    expect(withSession.status()).toBe(200)
    expect(withSession.headers()['content-type']).toBe('image/jpeg')
    expect(withSession.headers()['x-content-type-options']).toBe('nosniff')
    const anonymous = await browser.newContext()
    const without = await anonymous.request.get(new URL(src, page.url()).toString())
    expect(without.status()).toBe(404)
    await anonymous.close()
  })
})
