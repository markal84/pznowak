import { readFileSync } from 'node:fs'

import { expect, test, type Page } from '@playwright/test'
import { originalFilmCaption, STONE_VARIANTS_NOTE } from '../../src/lib/stone-variants'
import { presetConsent } from '../helpers/consent'

/**
 * Zlecenie V: „Zamów z innym kamieniem” na karcie pierścionka. Dane: Aion z wizualizacjami z `seed/warianty/warianty.json`
 * (V + W) i Leto bez wariantów (`npm run staging:warianty -- --apply`). Na bazie bez tych danych test się pomija.
 */

const seed = JSON.parse(readFileSync(new URL('../../seed/warianty/warianty.json', import.meta.url), 'utf8')) as {
  slug: string
  variants: unknown[]
}[]
const aionVariants = seed.find((entry) => entry.slug === 'aion')!.variants.length

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
  test('Aion: kółka (oryginał + warianty z seeda), klik podmienia zdjęcie, pokazuje „Wizualizacja” i zmienia adres', async ({ page }) => {
    await openAion(page)
    const section = page.getByRole('region', { name: 'Zamów z innym kamieniem' })
    const options = section.getByRole('group', { name: 'Kamień' }).getByRole('button')
    await expect(options).toHaveCount(1 + aionVariants)
    await expect(options.first()).toHaveAttribute('aria-pressed', 'true')
    await expect(options.first()).toHaveAccessibleName(/^Oryginał/)
    // Dopisek pod kółkami (Y.2): jeden tekst ze stałej, na każdej karcie z wariantami.
    await expect(section.locator('.stone-variants-note')).toHaveText(STONE_VARIANTS_NOTE)
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

test.describe('Kamień zmienia całą galerię (zlecenie Y)', () => {
  const cyane = seed.find((entry) => entry.slug === 'cyane') as { variants: { stone: string; files: string[] }[] } | undefined
  const gallery = cyane?.variants.find((v) => v.stone === 'Szafir granatowy i diamenty')

  test('Cyane: szafir granatowy podmienia wszystkie zdjęcia i miniatury, film zostaje, oryginał wraca', async ({ page }) => {
    test.skip(!gallery, 'Brak wariantu w warianty.json')
    const response = await visit(page, '/pierscionki/cyane')
    const ready = response?.ok() && (await page.getByRole('button', { name: /^Szafir granatowy i diamenty/ }).count()) > 0
    test.skip(!ready, 'Na tej bazie Cyane nie ma wariantów Y (najpierw npm run staging:warianty -- --apply)')

    const thumbs = page.getByRole('group', { name: 'Zdjęcia pierścionka' }).getByRole('button')
    const originalCount = await thumbs.count()
    const thumbSrcs = () => thumbs.locator('img').evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src') ?? ''))
    const originalSrcs = await thumbSrcs()

    await page.getByRole('button', { name: /^Szafir granatowy i diamenty/ }).click()
    await expect(page).toHaveURL(/kamien=szafir-granatowy-i-diamenty/)
    // Tyle samo pozycji co oryginał (zdjęcia + film), każde zdjęcie z wariantu.
    await expect(thumbs).toHaveCount(originalCount)
    await expect(thumbs.filter({ hasText: 'Film' })).toHaveCount(1)
    const variantSrcs = await thumbSrcs()
    for (const src of variantSrcs.slice(0, gallery!.files.length)) expect(src).toMatch(/szafir-granatowy/)

    // Każde kolejne zdjęcie też jest wizualizacją z etykietą.
    for (let i = 1; i < gallery!.files.length; i += 1) {
      await page.getByRole('button', { name: 'Następne zdjęcie' }).click()
      await expect(page.locator('.product-main .variant-tag')).toContainText('Wizualizacja')
      await expect(mainImage(page)).toHaveAttribute('alt', /\(wizualizacja\)$/)
    }

    await page.getByRole('button', { name: /^Oryginał/ }).click()
    await expect(page.locator('.product-main .variant-tag')).toHaveCount(0)
    expect(await thumbSrcs()).toEqual(originalSrcs)
  })
})

test.describe('Film przy wybranym kamieniu (zlecenie Y.2)', () => {
  test('Cyane: przy innym kamieniu film ma podpis „Film: oryginał (…)” na miniaturze i w odtwarzaczu, przy oryginale bez', async ({ page }) => {
    const response = await visit(page, '/pierscionki/cyane')
    const ready =
      response?.ok() &&
      (await page.locator('.stone-variants').count()) > 0 &&
      (await page.getByRole('group', { name: 'Zdjęcia pierścionka' }).getByRole('button', { name: /^Film/ }).count()) > 0
    test.skip(!ready, 'Na tej bazie Cyane nie ma wariantów albo filmu')

    const originalStone = ((await stoneFact(page).textContent()) ?? '').trim()
    const caption = originalFilmCaption(originalStone)
    expect(caption).toMatch(/^Film: oryginał \(.+\)$/)
    const thumbs = page.getByRole('group', { name: 'Zdjęcia pierścionka' }).getByRole('button')

    // Oryginał: zwykły film, bez podpisu.
    await expect(thumbs.filter({ hasText: 'Film' })).toHaveAccessibleName('Film o pierścionku')
    await thumbs.filter({ hasText: 'Film' }).click()
    await expect(page.locator('.product-main video')).toHaveCount(1)
    await expect(page.locator('.film-original')).toHaveCount(0)

    // Inny kamień: miniatura i odtwarzacz mówią, że film pokazuje oryginał.
    await page.locator('.stone-option').nth(1).click()
    const film = thumbs.filter({ hasText: 'Film' })
    await expect(film).toHaveAccessibleName(caption)
    await expect(film).toContainText('oryginał')
    await film.click()
    await expect(page.locator('.product-main .film-original')).toHaveText(caption)
    await expect(page.locator('.product-main .film-original')).toBeVisible()
    await page.getByRole('button', { name: 'Odtwórz film' }).click()
    await expect(page.locator('.product-main .film-original')).toBeVisible()

    // Powrót do oryginału: podpis znika.
    await page.getByRole('button', { name: /^Oryginał/ }).click()
    await expect(page.locator('.film-original')).toHaveCount(0)
    await expect(thumbs.filter({ hasText: 'Film' })).toHaveAccessibleName('Film o pierścionku')
  })
})
