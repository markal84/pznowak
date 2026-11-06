import { expect, test, type Page } from '@playwright/test'

import { PRICE_ON_REQUEST_SHORT } from '../../src/lib/price'
import { presetConsent } from '../helpers/consent'

/**
 * Ceny pierścionków (pole „Cena (zł)”, dane: `npm run staging:ceny -- --apply`). Na bazie bez cen test się pomija.
 * Format: „od 2949 zł” na liście i na karcie; karta bez ceny i wybrany inny kamień: „Na zapytanie”.
 */

const PRICE = /^od\u00a0(\d{1,4}|\d{2,3}(\u00a0\d{3})+)\u00a0zł$/

async function visit(page: Page, path: string) {
  const response = await page.goto(path)
  await page.waitForSelector('html[data-hydrated="true"]')
  return response
}

const priceFact = (page: Page) => page.locator('.product-price .offer-tag .nm')

test.beforeEach(async ({ context, baseURL }) => {
  await presetConsent(context, baseURL)
})

test.describe('Ceny pierścionków', () => {
  test('lista: ceny w formacie „od … zł”, bez znaczników; karta pokazuje tę samą cenę', async ({ page }) => {
    await visit(page, '/pierscionki')
    await expect(page.locator('body')).not.toContainText('od [cena] zł')
    const prices = page.locator('.tag .price')
    const count = await prices.count()
    test.skip(count === 0, 'Na tej bazie żadna karta nie ma ceny (najpierw npm run staging:ceny -- --apply)')

    for (const text of await prices.allTextContents()) expect(text).toMatch(PRICE)
    // Nagłówek katalogu: najniższa cena z kart.
    const numbers = (await prices.allTextContents()).map((t) => Number(t.replace(/\D/g, '')))
    const header = (await page.locator('.catalog-offer .nm').textContent()) ?? ''
    expect(header).toMatch(PRICE)
    expect(Number(header.replace(/\D/g, ''))).toBe(Math.min(...numbers))

    const card = page.locator('.ring-grid .card').filter({ has: page.locator('.tag .price') }).first()
    const listed = (await card.locator('.tag .price').textContent()) ?? ''
    await card.click()
    await expect(priceFact(page)).toHaveText(listed)
  })

  test('karta: cena albo „Na zapytanie”; inny kamień zmienia cenę na „Na zapytanie”', async ({ page }) => {
    await visit(page, '/pierscionki/urania')
    const fact = priceFact(page)
    await expect(fact).toHaveCount(1)
    const text = (await fact.textContent()) ?? ''
    expect(text === PRICE_ON_REQUEST_SHORT || PRICE.test(text)).toBe(true)

    const options = page.getByRole('region', { name: 'Zamów z innym kamieniem' }).getByRole('group', { name: 'Kamień' }).getByRole('button')
    test.skip((await options.count()) < 2, 'Urania nie ma wariantów na tej bazie')
    await options.nth(1).click()
    await expect(fact).toHaveText(PRICE_ON_REQUEST_SHORT)
    await options.first().click()
    await expect(fact).toHaveText(text)
  })
})
