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
    await expect(page.getByText(/^To zdjęcie mapy\./)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Zmień ustawienia' })).toHaveCount(0)
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

// Zlecenie N: niski pasek na telefonie (viewport zmieniany w teście, więc działa w każdym projekcie).
test.describe('Pasek cookies na telefonie', () => {
  test.skip(!COOKIE_BANNER_ENABLED, 'pasek wyłączony (COOKIE_BANNER_ENABLED = false)')

  for (const [width, height] of [
    [375, 812],
    [390, 844],
    [360, 740],
  ]) {
    test(`${width}×${height}: pasek jest niski, a przycisk „Zapytaj o pierścionek” widać bez przewijania`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await visit(page)
      const box = await banner(page).boundingBox()
      expect(box!.height).toBeLessThanOrEqual(130)
      const cta = await page.getByRole('link', { name: 'Zapytaj o pierścionek' }).first().boundingBox()
      // Przycisk kończy się nad górną krawędzią paska.
      expect(cta!.y + cta!.height).toBeLessThanOrEqual(box!.y)
    })
  }

  test('krótki tekst bez wzmianki o mapie; Odrzuć i Akceptuj obok siebie, równe i min. 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await visit(page)
    await expect(banner(page).getByText('Używamy plików cookies. Opcjonalne włączamy tylko za Twoją zgodą.')).toBeVisible()
    await expect(banner(page).getByText(/mapę Google/)).toBeHidden()
    const reject = await banner(page).getByRole('button', { name: 'Odrzuć opcjonalne' }).boundingBox()
    const accept = await banner(page).getByRole('button', { name: 'Akceptuj wszystkie' }).boundingBox()
    expect(Math.abs(reject!.y - accept!.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(reject!.height - accept!.height)).toBeLessThanOrEqual(1)
    expect(Math.abs(reject!.width - accept!.width)).toBeLessThanOrEqual(2)
    expect(reject!.height).toBeGreaterThanOrEqual(44)
  })

  test('„Dostosuj” (link w zdaniu) otwiera panel z kategoriami, w tym z mapą, i przyciskiem „Zapisz wybór”', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await visit(page)
    await banner(page).getByRole('button', { name: 'Dostosuj' }).click()
    await expect(banner(page).getByRole('checkbox', { name: /Mapy/ })).toBeVisible()
    await expect(banner(page).getByRole('button', { name: 'Zapisz wybór' })).toBeVisible()
    await expect(banner(page).getByRole('button', { name: 'Dostosuj' })).toHaveCount(0)
    const box = await banner(page).boundingBox()
    expect(box!.height).toBeLessThanOrEqual(812)
  })
})

// Ten sam ContactMap stoi na „Kontakt” i na „Pracownia”.
for (const path of ['/kontakt', '/pracownia']) {
  test.describe(`Mapa na stronie ${path}`, () => {
    test.skip(!COOKIE_BANNER_ENABLED, 'mapa z zapisem zgody wymaga paska (zob. test przy wyłączonym pasku)')

    test('bez zgody: statyczna mapa z podpisem i ani jednego zapytania do Google', async ({ page }) => {
      const googleRequests: string[] = []
      page.on('request', (request) => {
        if (/(^|\.)(google|googleapis|gstatic)\.com$/.test(new URL(request.url()).hostname)) googleRequests.push(request.url())
      })
      await visit(page, path)
      await expect(staticMap(page)).toBeVisible()
      await expect(mapFrame(page)).toHaveCount(0)
      await expect(showMap(page)).toBeVisible()
      // Podpis widoczny także przed pierwszym wyborem w pasku.
      await expect(banner(page)).toBeVisible()
      await expect(page.getByText(/To zdjęcie mapy – interaktywna mapa Google pojawi się po akceptacji plików cookies/)).toBeVisible()
      await page.waitForLoadState('networkidle')
      expect(googleRequests).toEqual([])
    })

    test('obrazek mapy jest linkiem do nawigacji', async ({ page }) => {
      await visit(page, path)
      const link = page.getByRole('link', { name: 'Otwórz nawigację do pracowni' })
      await expect(link).toHaveCount(1)
      await expect(link.locator('img[src*="mapa-pracowni"]')).toBeVisible()
      await expect(link).toHaveAttribute('href', /(google\.com\/maps\/dir|maps\.apple\.com).*Kili%C5%84skiego/)
      await expect(link).toHaveAttribute('target', '_blank')
    })

    test('„Zmień ustawienia” pod mapą otwiera ustawienia cookies', async ({ page }) => {
      await visit(page, path)
      await banner(page).getByRole('button', { name: 'Odrzuć opcjonalne' }).click()
      await expect(banner(page)).toBeHidden()
      await page.getByRole('button', { name: 'Zmień ustawienia' }).click()
      await expect(banner(page)).toBeVisible()
      await expect(banner(page).getByRole('checkbox', { name: /Mapy/ })).not.toBeChecked()
    })

    test('odrzucenie opcjonalnych zostawia statyczną mapę z podpisem', async ({ page }) => {
      await visit(page, path)
      await banner(page).getByRole('button', { name: 'Odrzuć opcjonalne' }).click()
      await expect(staticMap(page)).toBeVisible()
      await expect(mapFrame(page)).toHaveCount(0)
      await expect(page.getByText(/To zdjęcie mapy/)).toBeVisible()
    })

    test('„Akceptuj wszystkie” obejmuje mapy: mapa interaktywna od razu, także po odświeżeniu', async ({ page }) => {
      await visit(page, path)
      await banner(page).getByRole('button', { name: 'Akceptuj wszystkie' }).click()
      await expect(mapFrame(page)).toHaveCount(1)
      await expect(staticMap(page)).toHaveCount(0)
      expect(await consentCookie(page)).toMatchObject({ maps: true })
      await visit(page, path)
      await expect(mapFrame(page)).toHaveCount(1)
      await expect(showMap(page)).toHaveCount(0)
    })

    test('kliknięcie „Pokaż interaktywną mapę” ładuje mapę Google i zapisuje zgodę tylko na mapy', async ({ page }) => {
      await visit(page, path)
      await expect(mapFrame(page)).toHaveCount(0)
      await showMap(page).click()
      await expect(mapFrame(page)).toHaveCount(1)
      await expect(staticMap(page)).toHaveCount(0)
      expect(await consentCookie(page)).toMatchObject({ maps: true, analytics: false, marketing: false })
      await visit(page, path)
      await expect(mapFrame(page)).toHaveCount(1)
    })

    test('wycofanie zgody na mapy w stopce wraca do statycznej mapy', async ({ page, context, baseURL }) => {
      await presetConsent(context, baseURL, { maps: true })
      await visit(page, path)
      await expect(mapFrame(page)).toHaveCount(1)
      await footerButton(page).click()
      await banner(page).getByRole('checkbox', { name: /Mapy/ }).uncheck()
      await banner(page).getByRole('button', { name: 'Zapisz wybór' }).click()
      await visit(page, path)
      await expect(mapFrame(page)).toHaveCount(0)
      await expect(staticMap(page)).toBeVisible()
    })

    test('zapisana zgoda na mapy: mapa interaktywna od razu po wejściu', async ({ page, context, baseURL }) => {
      await presetConsent(context, baseURL, { maps: true })
      await visit(page, path)
      await expect(mapFrame(page)).toHaveCount(1)
      await expect(showMap(page)).toHaveCount(0)
    })
  })
}

test.describe('Strona „Kontakt”: przycisk nawigacji', () => {
  test('„Prowadź do pracowni” prowadzi do nawigacji (Mapy Google lub Apple)', async ({ page, context, baseURL }) => {
    await presetConsent(context, baseURL)
    await visit(page, '/kontakt')
    const navigate = page.getByRole('link', { name: 'Prowadź do pracowni' })
    await expect(navigate).toBeVisible()
    await expect(navigate).toHaveAttribute('href', /(google\.com\/maps\/dir|maps\.apple\.com).*Kili%C5%84skiego/)
  })
})
