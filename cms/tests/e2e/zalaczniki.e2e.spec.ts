import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'

/**
 * Zdjęcia w formularzu kontaktowym (Zlecenie B), ścieżka człowieka z prawdziwą wysyłką: zgłoszenie z zapowiedzią
 * plików, potem każdy plik osobno z biletem. Wymaga kluczy testowych Turnstile i przełącznika `ATTACHMENTS_ENABLED`
 * w środowisku (`E2E_ATTACHMENTS=on`); bez niego sprawdzamy tylko, że formularz wygląda jak przed zmianą.
 * Zgłoszenia zapisują się na stagingu z imieniem „Test Playwright”.
 */

test.skip(process.env.E2E_SUBMISSIONS === 'off', 'wysyłka wyłączona w tym środowisku')

const ATTACHMENTS = process.env.E2E_ATTACHMENTS === 'on'
const E2E_NAME = 'Test Playwright'
const MAX_UPLOAD = 4 * 1024 * 1024
const here = path.dirname(fileURLToPath(import.meta.url))

async function visit(page: Page, url: string) {
  const response = await page.goto(url)
  await page.waitForSelector('html[data-hydrated="true"]')
  return response
}

function captureWrites(page: Page) {
  const writes: string[] = []
  page.on('request', (r) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(r.method())) return
    if (new URL(r.url()).origin === new URL(page.url()).origin)
      writes.push(`${r.method()} ${new URL(r.url()).pathname}`)
  })
  return writes
}

/** Zdjęcie z telefonu: 3000×2000 z szumem, ok. 6–8 MB, więc przeglądarka musi je zmniejszyć przed wysyłką. */
async function bigPhoto() {
  const width = 3000
  const height = 2000
  const noise = Buffer.alloc(width * height * 3)
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24
  return sharp(noise, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer()
}

const sketch = () =>
  sharp({
    create: {
      width: 600,
      height: 400,
      channels: 4,
      background: { r: 30, g: 60, b: 90, alpha: 0.6 },
    },
  })
    .png()
    .toBuffer()

const file = (name: string, mimeType: string, buffer: Buffer) => ({ name, mimeType, buffer })

async function fillContact(page: Page) {
  await page.locator('label.topic', { hasText: 'Inne pytanie' }).click()
  await page
    .getByLabel('Twoja wiadomość')
    .fill('Zgłoszenie testowe Playwright ze zdjęciami, proszę zignorować.')
  await page.getByLabel('Imię').fill(E2E_NAME)
  await page.getByLabel('Telefon').fill('600 100 200')
  await page.getByLabel(/Zgadzam się na kontakt/).check()
}

const submissionResponse = (page: Page) =>
  page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/api/zgloszenia' && r.request().method() === 'POST',
    { timeout: 45_000 },
  )

const uploadResponses = (page: Page, count: number) => {
  const responses: Array<{ status: number; body: unknown }> = []
  const done = new Promise<typeof responses>((resolve) => {
    page.on('response', async (r) => {
      if (new URL(r.url()).pathname !== '/api/zgloszenia/zalaczniki') return
      if (r.request().method() !== 'POST') return
      responses.push({ status: r.status(), body: await r.json().catch(() => null) })
      if (responses.length === count) resolve(responses)
    })
  })
  return done
}

test.describe('Zdjęcia w formularzu kontaktowym', () => {
  test('przełącznik wyłączony: formularz bez pola na zdjęcia, jak przed zmianą', async ({
    page,
  }) => {
    test.skip(ATTACHMENTS, 'w tym środowisku zdjęcia są włączone')
    await visit(page, '/kontakt')
    await expect(page.getByRole('button', { name: 'Wyślij wiadomość' })).toBeVisible()
    await expect(page.locator('input[type="file"]')).toHaveCount(0)
    await expect(page.getByText('Zdjęcia lub szkic')).toHaveCount(0)
  })

  test.describe('włączone', () => {
    test.skip(
      !ATTACHMENTS,
      'zdjęcia wyłączone w tym środowisku (E2E_ATTACHMENTS=on, by je sprawdzić)',
    )

    test('człowiek dodaje 2 zdjęcia (duże z telefonu i szkic) i wysyła formularz', async ({
      page,
    }) => {
      await visit(page, '/kontakt')
      const writes = captureWrites(page)
      await fillContact(page)
      const big = await bigPhoto()
      expect(big.length).toBeGreaterThan(MAX_UPLOAD)
      await page
        .getByLabel('Dodaj zdjęcia')
        .setInputFiles([
          file('IMG_2041.jpg', 'image/jpeg', big),
          file('szkic.png', 'image/png', await sketch()),
        ])

      const list = page.getByRole('list', { name: 'Dodane zdjęcia' })
      await expect(list.getByRole('listitem')).toHaveCount(2)
      // Miniatury z lokalnych plików i rozmiar po przygotowaniu (duże zdjęcie zmniejszone poniżej 4 MB).
      await expect(list.locator('img.att-thumb')).toHaveCount(2, { timeout: 20_000 })
      await expect(list.getByText(/^\d+(,\d)? (KB|MB)$/)).toHaveCount(2)

      const response = submissionResponse(page)
      const uploads = uploadResponses(page, 2)
      await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
      const sent = await response
      expect(sent.status()).toBe(201)
      const body = sent.request().postDataJSON()
      expect(body.attachments).toHaveLength(2)
      for (const item of body.attachments) expect(item.size).toBeLessThanOrEqual(MAX_UPLOAD)
      const reply = await sent.json()
      expect(reply.attachments.status).toBe('upload')
      expect(reply.attachments.uploads).toHaveLength(2)

      const results = await uploads
      expect(results.map((r) => r.status)).toEqual([201, 201])
      // Odpowiedzi nie zdradzają, gdzie leży plik.
      for (const r of results)
        expect(Object.keys(r.body as object).sort()).toEqual(['code', 'message', 'ok'])

      await expect(page.getByRole('heading', { name: 'Wiadomość wysłana' })).toBeVisible()
      await expect(page.getByText('Dołączone: 2 zdjęcia.')).toBeVisible()
      expect(writes).toEqual([
        'POST /api/zgloszenia',
        'POST /api/zgloszenia/zalaczniki',
        'POST /api/zgloszenia/zalaczniki',
      ])
    })

    test('usunięcie pliku przed wysłaniem: idą tylko pozostałe, fokus zostaje w formularzu', async ({
      page,
    }) => {
      await visit(page, '/kontakt')
      await fillContact(page)
      const small = await sharp({
        create: { width: 300, height: 200, channels: 3, background: '#a85' },
      })
        .jpeg()
        .toBuffer()
      await page
        .getByLabel('Dodaj zdjęcia')
        .setInputFiles([
          file('a.jpg', 'image/jpeg', small),
          file('b.jpg', 'image/jpeg', small),
          file('c.jpg', 'image/jpeg', small),
        ])
      const list = page.getByRole('list', { name: 'Dodane zdjęcia' })
      await expect(list.locator('img.att-thumb')).toHaveCount(3)
      await page.getByRole('button', { name: 'Usuń zdjęcie „b.jpg”' }).click()
      await expect(list.getByRole('listitem')).toHaveCount(2)
      await expect(list.getByText('b.jpg')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Usuń zdjęcie „c.jpg”' })).toBeFocused()

      const response = submissionResponse(page)
      const uploads = uploadResponses(page, 2)
      await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
      expect((await response).request().postDataJSON().attachments).toHaveLength(2)
      expect((await uploads).map((r) => r.status)).toEqual([201, 201])
      await expect(page.getByText('Dołączone: 2 zdjęcia.')).toBeVisible()
    })

    test('plik, który nie jest zdjęciem (HTML przemianowany na .jpg), nie trafia na listę', async ({
      page,
    }) => {
      await visit(page, '/kontakt')
      const writes = captureWrites(page)
      await fillContact(page)
      await page
        .getByLabel('Dodaj zdjęcia')
        .setInputFiles([
          file('zdjecie.jpg', 'image/jpeg', Buffer.from('<html><script>alert(1)</script></html>')),
        ])
      await expect(
        page.getByRole('alert').filter({ hasText: '„zdjecie.jpg”: to nie jest zdjęcie' }),
      ).toBeVisible()
      await expect(page.getByRole('list', { name: 'Dodane zdjęcia' })).toHaveCount(0)

      const response = submissionResponse(page)
      await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
      const sent = await response
      expect(sent.status()).toBe(201)
      expect(sent.request().postDataJSON().attachments).toBeUndefined()
      await expect(page.getByRole('heading', { name: 'Wiadomość wysłana' })).toBeVisible()
      expect(writes).toEqual(['POST /api/zgloszenia'])
    })

    test('najwyżej 5 zdjęć: szóste pominięte z komunikatem, przycisk dodawania znika', async ({
      page,
    }) => {
      await visit(page, '/kontakt')
      const small = await sharp({
        create: { width: 120, height: 90, channels: 3, background: '#357' },
      })
        .jpeg()
        .toBuffer()
      await page
        .getByLabel('Dodaj zdjęcia')
        .setInputFiles(
          Array.from({ length: 6 }, (_, i) => file(`z${i + 1}.jpg`, 'image/jpeg', small)),
        )
      await expect(
        page.getByRole('list', { name: 'Dodane zdjęcia' }).getByRole('listitem'),
      ).toHaveCount(5)
      await expect(page.getByRole('alert').filter({ hasText: 'pominięto 1' })).toBeVisible()
      await expect(page.getByText('Dodano 5 zdjęć, więcej się nie zmieści.')).toBeVisible()
      await expect(page.locator('input[type="file"]')).toHaveCount(0)
    })

    test('HEIC z iPhone’a: wysłany i przyjęty (konwersja w Safari albo na serwerze)', async ({
      page,
    }) => {
      await visit(page, '/kontakt')
      await fillContact(page)
      const heic = readFileSync(path.resolve(here, '../fixtures/zalaczniki/iphone.heic'))
      await page
        .getByLabel('Dodaj zdjęcia')
        .setInputFiles([file('IMG_0007.HEIC', 'image/heic', heic)])
      await expect(
        page.getByRole('list', { name: 'Dodane zdjęcia' }).getByRole('listitem'),
      ).toHaveCount(1)
      const uploads = uploadResponses(page, 1)
      await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
      expect((await uploads).map((r) => r.status)).toEqual([201])
      await expect(page.getByText('Dołączone: 1 zdjęcie.')).toBeVisible()
    })

    test('brak publicznego dostępu: podgląd bez sesji panelu i bez biletu kończy się 404/403', async ({
      request,
    }) => {
      const view = await request.get(
        '/api/zgloszenia/zalaczniki/3f1c2a4e-9b7d-4c1e-8f2a-6d5e4c3b2a10',
      )
      expect(view.status()).toBe(404)
      const thumb = await request.get(
        '/api/zgloszenia/zalaczniki/3f1c2a4e-9b7d-4c1e-8f2a-6d5e4c3b2a10?rozmiar=miniatura',
      )
      expect(thumb.status()).toBe(404)
      const upload = await request.post('/api/zgloszenia/zalaczniki', {
        headers: { 'content-type': 'application/octet-stream' },
        data: Buffer.from([0xff, 0xd8, 0xff]),
      })
      expect(upload.status()).toBe(403)
      const cleanup = await request.get('/api/zgloszenia/zalaczniki/sprzatanie')
      expect([401, 503]).toContain(cleanup.status())
    })
  })
})
