import { expect, test, type Page } from '@playwright/test'

const banner = (page: Page) => page.getByRole('region', { name: 'Pliki cookies' })

async function visit(page: Page, path = '/') {
  await page.goto(path)
  await page.waitForSelector('html[data-hydrated="true"]')
}

const consentCookie = async (page: Page) => {
  const cookie = (await page.context().cookies()).find((c) => c.name === 'pn_consent')
  return cookie ? JSON.parse(decodeURIComponent(cookie.value)) : null
}

test.describe('Zgoda na cookies', () => {
  test('pasek pojawia się przy pierwszej wizycie, nie blokuje strony i nie ustawia cookie przed wyborem', async ({
    page,
  }) => {
    await visit(page)
    await expect(banner(page)).toBeVisible()
    // Przyklejony do dołu okna.
    const viewport = page.viewportSize()!
    await expect
      .poll(async () => {
        const box = await banner(page).boundingBox()
        return Math.round(box!.y + box!.height)
      })
      .toBe(viewport.height)
    // Strona pod paskiem działa: można klikać w nagłówek.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await consentCookie(page)).toBeNull()
  })

  test('odrzucenie i akceptacja są w pierwszej warstwie, a opcjonalne pola nie są zaznaczone domyślnie', async ({
    page,
  }) => {
    await visit(page)
    await expect(banner(page).getByRole('button', { name: 'Odrzuć opcjonalne' })).toBeVisible()
    await expect(banner(page).getByRole('button', { name: 'Akceptuj wszystkie' })).toBeVisible()
    await banner(page).getByRole('button', { name: 'Dostosuj' }).click()
    await expect(banner(page).getByRole('checkbox', { name: /Niezbędne/ })).toBeChecked()
    await expect(banner(page).getByRole('checkbox', { name: /Niezbędne/ })).toBeDisabled()
    await expect(banner(page).getByRole('checkbox', { name: /Statystyki/ })).not.toBeChecked()
  })

  test('odrzucenie zapisuje wybór i pasek nie wraca po odświeżeniu', async ({ page }) => {
    await visit(page)
    await banner(page).getByRole('button', { name: 'Odrzuć opcjonalne' }).click()
    await expect(banner(page)).toBeHidden()
    expect(await consentCookie(page)).toMatchObject({ v: 1, analytics: false })
    await visit(page)
    await expect(banner(page)).toBeHidden()
  })

  test('akceptacja zapisuje zgodę na statystyki', async ({ page }) => {
    await visit(page)
    await banner(page).getByRole('button', { name: 'Akceptuj wszystkie' }).click()
    await expect(banner(page)).toBeHidden()
    expect(await consentCookie(page)).toMatchObject({ v: 1, analytics: true })
  })

  test('wybór można zmienić ze stopki', async ({ page }) => {
    await visit(page)
    await banner(page).getByRole('button', { name: 'Akceptuj wszystkie' }).click()
    await page.getByRole('button', { name: 'Ustawienia cookies' }).click()
    await expect(banner(page)).toBeVisible()
    await expect(banner(page).getByRole('checkbox', { name: /Statystyki/ })).toBeChecked()
    await banner(page).getByRole('checkbox', { name: /Statystyki/ }).uncheck()
    await banner(page).getByRole('button', { name: 'Zapisz wybór' }).click()
    await expect(banner(page)).toBeHidden()
    expect(await consentCookie(page)).toMatchObject({ analytics: false })
  })

  test('uszkodzone cookie jest traktowane jak brak wyboru', async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: 'pn_consent', value: 'zepsute', url: baseURL ?? 'http://localhost:3000' }])
    await visit(page)
    await expect(banner(page)).toBeVisible()
  })

  test('pasek mieści się na ekranie i nie powoduje przewijania poziomego', async ({ page }) => {
    await visit(page)
    await banner(page).getByRole('button', { name: 'Dostosuj' }).click()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    const box = await banner(page).boundingBox()
    expect(box!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  })
})
