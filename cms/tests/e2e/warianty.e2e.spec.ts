import { expect, test, type Page } from '@playwright/test'
import { presetConsent } from '../helpers/consent'

/**
 * Zlecenie V: „Zamów z innym kamieniem” na karcie pierścionka. Dane: Aion z trzema wizualizacjami od Kamili i Leto
 * bez wariantów (`npm run staging:warianty -- --apply`). Na bazie bez tych danych test się pomija, zamiast padać.
 */

async function visit(page: Page, path: string) {
  const response = await page.goto(path)
  await page.waitForSelector('html[data-hydrated="true"]')
  return response
}

const mainImage = (page: Page) => page.locator('.product-main .product-zoom img').last()
const stoneFact = (page: Page) => page.locator('.facts dt', { hasText: 'Kamień główny' }).locator('xpath=following-sibling::dd[1]')

async function openAion(page: Page) {
  const response = await visit(page, '/pierscionki/aion')
  const hasVariants = response?.ok() && (await page.locator('.stone-variants').count()) > 0
  test.skip(!hasVariants, 'Na tej bazie Aion nie ma wariantów (najpierw npm run staging:warianty -- --apply)')
}

test.beforeEach(async ({ context, baseURL }) => {
  await presetConsent(context, baseURL)
})

test.describe('Zamów z innym kamieniem (zlecenie V)', () => {
  test('Aion: 4 kółka, klik podmienia zdjęcie, pokazuje „Wizualizacja” i zmienia adres', async ({ page }) => {
    await openAion(page)
    const section = page.getByRole('region', { name: 'Zamów z innym kamieniem' })
    const options = section.getByRole('group', { name: 'Kamień' }).getByRole('button')
    await expect(options).toHaveCount(4)
    await expect(options.first()).toHaveAttribute('aria-pressed', 'true')
    await expect(options.first()).toHaveAccessibleName(/^Oryginał/)
    await expect(section).toContainText('Dostępność kamienia potwierdza pracownia.')
    await expect(page.locator('.product-main .variant-tag')).toHaveCount(0)

    const originalSrc = await mainImage(page).getAttribute('src')
    const originalStone = (await stoneFact(page).textContent()) ?? ''

    const emerald = section.getByRole('button', { name: /^Szmaragd i diamenty/ })
    await emerald.click()
    await expect(emerald).toHaveAttribute('aria-pressed', 'true')
    await expect(options.first()).toHaveAttribute('aria-pressed', 'false')
    await expect(page).toHaveURL(/[?&]kamien=szmaragd-i-diamenty\b/)
    await expect(page.locator('.product-main .variant-tag')).toContainText('Wizualizacja')
    await expect(mainImage(page)).not.toHaveAttribute('src', originalSrc ?? '')
    await expect(mainImage(page)).toHaveAttribute('src', /szmaragd/)
    await expect(stoneFact(page)).toHaveText('Szmaragd i diamenty (na zamówienie)')

    // Klawiatura: powrót do oryginału.
    await options.first().focus()
    await page.keyboard.press('Enter')
    await expect(options.first()).toHaveAttribute('aria-pressed', 'true')
    await expect(page).not.toHaveURL(/kamien=/)
    await expect(page.locator('.product-main .variant-tag')).toHaveCount(0)
    await expect(stoneFact(page)).toHaveText(originalStone)

    // Bez przewijania w poziomie (telefon).
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('link z ?kamien= otwiera kartę z tym kamieniem, a „Zapytaj” przenosi go do formularza', async ({ page }) => {
    await visit(page, '/pierscionki/aion?kamien=szmaragd-i-diamenty')
    test.skip((await page.locator('.stone-variants').count()) === 0, 'Aion bez wariantów na tej bazie')
    await expect(page.getByRole('button', { name: /^Szmaragd i diamenty/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.product-main .variant-tag')).toContainText('Wizualizacja')

    const ask = page.getByRole('link', { name: 'Zapytaj o ten pierścionek' })
    const href = new URL((await ask.getAttribute('href')) ?? '', 'http://localhost')
    expect(href.pathname).toBe('/kontakt')
    expect(href.searchParams.get('projekt')).toBe('Aion')
    expect(href.searchParams.get('kamien')).toBe('Szmaragd i diamenty')

    await ask.click()
    await page.waitForURL(/\/kontakt\?/)
    await expect(page.getByLabel('Który projekt Cię interesuje?')).toHaveValue('Aion, kamień: Szmaragd i diamenty')
  })

  test('karta bez wariantów: sekcji nie ma, parametr ?kamien= nic nie zmienia', async ({ page }) => {
    const response = await visit(page, '/pierscionki/leto?kamien=szmaragd-i-diamenty')
    test.skip(!response?.ok(), 'Brak karty Leto na tej bazie')
    await expect(page.locator('.stone-variants')).toHaveCount(0)
    await expect(page.locator('.variant-tag')).toHaveCount(0)
    await expect(page.locator('.facts')).not.toContainText('(na zamówienie)')
  })
})
