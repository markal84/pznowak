import { expect, test, type Page } from '@playwright/test'
import { COOKIE_BANNER_ENABLED } from '../../src/lib/site'
import { presetConsent } from '../helpers/consent'

const banner = (page: Page) => page.getByRole('region', { name: 'Pliki cookies' })
const footerButton = (page: Page) => page.getByRole('button', { name: 'Ustawienia cookies' })
const mapFrame = (page: Page) => page.locator('iframe[src*="google.com/maps"]')
const staticMap = (page: Page) => page.locator('img[src*="mapa-pracowni"]')
const showMap = (page: Page) => page.getByRole('button', { name: 'Pokaż interaktywną mapę' })

async function visit(page: Page, path = '/') {
  await page.goto(path)
  await page.waitForSelector('html[data-hydrated="true"]')
}

const consentCookie = async (page: Page) => {
  const cookie = (await page.context().cookies()).find((c) => c.name === 'pn_consent')
  return cookie ? JSON.parse(decodeURIComponent(cookie.value)) : null
}

test.describe('Przełącznik paska cookies (COOKIE_BANNER_ENABLED)', () => {
  test('wyłączony pasek: brak paska i przycisku w stopce, a mapa Google nadal czeka na kliknięcie', async ({ page }) => {
    test.skip(COOKIE_BANNER_ENABLED, 'pasek włączony (COOKIE_BANNER_ENABLED = true)')
    await visit(page, '/kontakt')
    await expect(banner(page)).toHaveCount(0)
    await expect(footerButton(page)).toHaveCount(0)
    await expect(mapFrame(page)).toHaveCount(0)
    await showMap(page).click()
    await expect(mapFrame(page)).toHaveCount(1)
    // Bez paska nic nie zapisujemy w przeglądarce.
    expect(await consentCookie(page)).toBeNull()
  })

  test('włączony pasek: pasek i przycisk w stopce są na stronie', async ({ page }) => {
    test.skip(!COOKIE_BANNER_ENABLED, 'pasek wyłączony (COOKIE_BANNER_ENABLED = false)')
    await visit(page)
    await expect(banner(page)).toBeVisible()
    await expect(footerButton(page)).toBeVisible()
  })
})

test.describe('Zgoda na cookies', () => {
  test.skip(!COOKIE_BANNER_ENABLED, 'pasek wyłączony (COOKIE_BANNER_ENABLED = false)')

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
    for (const name of [/Mapy/, /Statystyki/, /Marketing/]) {
      await expect(banner(page).getByRole('checkbox', { name })).not.toBeChecked()
    }
  })

  test('odrzucenie zapisuje wybór i pasek nie wraca po odświeżeniu', async ({ page }) => {
    await visit(page)
    await banner(page).getByRole('button', { name: 'Odrzuć opcjonalne' }).click()
    await expect(banner(page)).toBeHidden()
    expect(await consentCookie(page)).toMatchObject({ v: 2, maps: false, analytics: false, marketing: false })
    await visit(page)
    await expect(banner(page)).toBeHidden()
  })

  test('akceptacja zapisuje zgodę na wszystkie kategorie', async ({ page }) => {
    await visit(page)
    await banner(page).getByRole('button', { name: 'Akceptuj wszystkie' }).click()
    await expect(banner(page)).toBeHidden()
    expect(await consentCookie(page)).toMatchObject({ v: 2, maps: true, analytics: true, marketing: true })
  })

  test('wybór pojedynczych kategorii zapisuje się osobno', async ({ page }) => {
    await visit(page)
    await banner(page).getByRole('button', { name: 'Dostosuj' }).click()
    await banner(page).getByRole('checkbox', { name: /Statystyki/ }).check()
    await banner(page).getByRole('button', { name: 'Zapisz wybór' }).click()
    expect(await consentCookie(page)).toMatchObject({ maps: false, analytics: true, marketing: false })
  })

  test('wybór można zmienić ze stopki', async ({ page }) => {
    await visit(page)
    await banner(page).getByRole('button', { name: 'Akceptuj wszystkie' }).click()
    await footerButton(page).click()
    await expect(banner(page)).toBeVisible()
    await expect(banner(page).getByRole('checkbox', { name: /Statystyki/ })).toBeChecked()
    await banner(page).getByRole('checkbox', { name: /Statystyki/ }).uncheck()
    await banner(page).getByRole('button', { name: 'Zapisz wybór' }).click()
    await expect(banner(page)).toBeHidden()
    expect(await consentCookie(page)).toMatchObject({ analytics: false, maps: true })
  })

  test('uszkodzone cookie jest traktowane jak brak wyboru', async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: 'pn_consent', value: 'zepsute', url: baseURL ?? 'http://localhost:3000' }])
    await visit(page)
    await expect(banner(page)).toBeVisible()
  })

  test('wybór ze starej wersji (bez nowych kategorii) wymusza ponowne pytanie', async ({ page, baseURL }) => {
    const old = encodeURIComponent(JSON.stringify({ v: 1, at: Date.now(), analytics: false }))
    await page.context().addCookies([{ name: 'pn_consent', value: old, url: baseURL ?? 'http://localhost:3000' }])
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

test.describe('Mapa na stronie „Kontakt”', () => {
  test.skip(!COOKIE_BANNER_ENABLED, 'mapa z zapisem zgody wymaga paska (zob. test przy wyłączonym pasku)')

  test('bez zgody: statyczna mapa, przycisk nawigacji i ani jednego zapytania do Google', async ({ page }) => {
    const googleRequests: string[] = []
    page.on('request', (request) => {
      if (/(^|\.)(google|googleapis|gstatic)\.com$/.test(new URL(request.url()).hostname)) googleRequests.push(request.url())
    })
    await visit(page, '/kontakt')
    await expect(staticMap(page)).toBeVisible()
    await expect(mapFrame(page)).toHaveCount(0)
    await expect(showMap(page)).toBeVisible()
    const navigate = page.getByRole('link', { name: 'Prowadź do pracowni' })
    await expect(navigate).toBeVisible()
    await expect(navigate).toHaveAttribute('href', /(google\.com\/maps\/dir|maps\.apple\.com).*Kili%C5%84skiego/)
    await page.waitForLoadState('networkidle')
    expect(googleRequests).toEqual([])
  })

  test('kliknięcie „Pokaż interaktywną mapę” ładuje mapę Google i zapisuje zgodę tylko na mapy', async ({ page }) => {
    await visit(page, '/kontakt')
    await expect(mapFrame(page)).toHaveCount(0)
    await showMap(page).click()
    await expect(mapFrame(page)).toHaveCount(1)
    await expect(staticMap(page)).toHaveCount(0)
    expect(await consentCookie(page)).toMatchObject({ maps: true, analytics: false, marketing: false })
    // Zgoda jest zapamiętana: po odświeżeniu mapa jest od razu interaktywna.
    await visit(page, '/kontakt')
    await expect(mapFrame(page)).toHaveCount(1)
  })

  test('zgoda na mapy z paska włącza mapę interaktywną, a jej wycofanie wraca do statycznej', async ({ page }) => {
    await visit(page, '/kontakt')
    await banner(page).getByRole('button', { name: 'Akceptuj wszystkie' }).click()
    await expect(mapFrame(page)).toHaveCount(1)
    await footerButton(page).click()
    await banner(page).getByRole('checkbox', { name: /Mapy/ }).uncheck()
    await banner(page).getByRole('button', { name: 'Zapisz wybór' }).click()
    await visit(page, '/kontakt')
    await expect(mapFrame(page)).toHaveCount(0)
    await expect(staticMap(page)).toBeVisible()
  })

  test('odrzucenie opcjonalnych zostawia statyczną mapę', async ({ page }) => {
    await visit(page, '/kontakt')
    await banner(page).getByRole('button', { name: 'Odrzuć opcjonalne' }).click()
    await expect(staticMap(page)).toBeVisible()
    await expect(mapFrame(page)).toHaveCount(0)
  })

  test('zapisana zgoda na mapy: mapa interaktywna od razu po wejściu', async ({ page, context, baseURL }) => {
    await presetConsent(context, baseURL, { maps: true })
    await visit(page, '/kontakt')
    await expect(mapFrame(page)).toHaveCount(1)
    await expect(showMap(page)).toHaveCount(0)
  })
})
