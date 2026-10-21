import { expect, test, type Page } from '@playwright/test'
import { presetConsent } from '../helpers/consent'

const NOTICE = /Wersja podglądowa: wysyłka jest jeszcze wyłączona/
// Środowisko bez kluczy Turnstile (wysyłka wyłączona): E2E_SUBMISSIONS=off.
const SUBMISSIONS_OFF = process.env.E2E_SUBMISSIONS === 'off'

/** Żądania zapisujące wysłane do naszego serwera (Turnstile rozmawia z Cloudflare w swoim iframie, to się nie liczy). */
function captureWrites(page: Page) {
  const writes: string[] = []
  page.on('request', (r) => {
    // OPTIONS wysyła m.in. pasek narzędzi Vercela na wdrożeniach preview; nie zapisuje danych.
    if (['GET', 'HEAD', 'OPTIONS'].includes(r.method())) return
    if (new URL(r.url()).origin === new URL(page.url()).origin) writes.push(`${r.method()} ${r.url()}`)
  })
  return writes
}

/** Czeka na hydrację Reacta (znacznik z HydrationFlag), żeby klik nie trafił w stronę sprzed hydracji. */
async function visit(page: Page, path: string) {
  const response = await page.goto(path)
  await page.waitForSelector('html[data-hydrated="true"]')
  return response
}

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
}

test.beforeEach(async ({ context, baseURL }) => {
  await presetConsent(context, baseURL)
})

test.describe('Nowy design: strony i nawigacja', () => {
  test('strona główna pokazuje hero, liczbę pierścionków i przywieszkę', async ({ page }) => {
    await visit(page, '/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pierścionek zrobiony dla jednej osoby.')
    await expect(page.getByRole('link', { name: /Zobacz \d+ pierścion/ })).toBeVisible()
    await expect(page.locator('.hero-tag .nm')).not.toBeEmpty()
    await noHorizontalScroll(page)
  })

  for (const [path, heading] of [
    ['/pierscionki', 'Pierścionki z pracowni'],
    ['/obraczki', 'Obrączki ślubne'],
    ['/na-zamowienie', 'Pierścionek na zamówienie'],
    ['/naprawy', 'Naprawy i przeróbki'],
    ['/pracownia', 'Od kuźni w Szańcu do stołu złotniczego w Busku'],
    ['/realizacje', 'Realizacje'],
    ['/kontakt', 'Umów wizytę'],
    ['/kreator', 'Zaprojektuj pierścionek'],
  ] as const) {
    test(`${path} ładuje się i mieści w szerokości ekranu`, async ({ page }) => {
      const response = await visit(page, path)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading)
      await noHorizontalScroll(page)
    })
  }

  test('stare adresy przekierowują na nowe', async ({ page }) => {
    await visit(page, '/katalog')
    await expect(page).toHaveURL(/\/pierscionki$/)
    await visit(page, '/o-nas')
    await expect(page).toHaveURL(/\/pracownia$/)
    await visit(page, '/galeria')
    await expect(page).toHaveURL(/\/realizacje$/)
  })

  test('nieistniejąca strona pokazuje 404 z nawigacją', async ({ page }) => {
    const response = await visit(page, '/tej-strony-nie-ma')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tej strony nie znaleźliśmy')
  })

  test('wersja podglądowa nie jest indeksowana', async ({ page, request }) => {
    const response = await request.get('/')
    expect(response.headers()['x-robots-tag']).toContain('noindex')
    await visit(page, '/')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    const robots = await request.get('/robots.txt')
    expect(await robots.text()).toContain('Disallow: /')
  })
})

test.describe('Katalog i karta pierścionka', () => {
  test('filtry zawężają listę i można je wyczyścić', async ({ page }) => {
    await visit(page, '/pierscionki')
    const count = page.getByText(/w kolekcji$/)
    await expect(count).toBeVisible()
    const total = (await count.textContent())!.match(/^\d+/)![0]

    await page.getByRole('button', { name: 'Niebieskie' }).click()
    await expect(page.getByText(/^Pasujące do filtrów: \d+/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Niebieskie' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Białe', exact: true }).click()
    await page.getByRole('button', { name: 'Wyczyść filtry' }).click()
    await expect(page.getByText(new RegExp(`^${total} .* w kolekcji$`))).toBeVisible()
  })

  test('połączenie bez wyników pokazuje pusty stan', async ({ page }) => {
    await visit(page, '/pierscionki')
    await page.getByRole('button', { name: 'Bezbarwne' }).click()
    await page.getByRole('button', { name: 'Białe', exact: true }).click()
    // w katalogu nie ma bezbarwnych kamieni w samym białym złocie albo są: oba stany muszą być spójne
    const empty = page.getByRole('heading', { name: 'Nie mamy jeszcze takiego połączenia w kolekcji' })
    const cards = page.locator('.ring-grid-lg > li:not(.cta-card)')
    if ((await cards.count()) === 0) await expect(empty).toBeVisible()
    else await expect(empty).toHaveCount(0)
  })

  test('z katalogu przez kartę do formularza z nazwą projektu', async ({ page }) => {
    await visit(page, '/pierscionki')
    const first = page.locator('.ring-grid-lg > li:not(.cta-card) a').first()
    const name = (await first.locator('.nm').textContent())!.trim()
    await first.click()
    await expect(page).toHaveURL(/\/pierscionki\/[^/]+$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)

    await page.getByRole('link', { name: 'Zapytaj o ten pierścionek' }).click()
    await expect(page).toHaveURL(/\/kontakt\?temat=kolekcja&projekt=/)
    await expect(page.getByLabel('Który projekt Cię interesuje?')).toHaveValue(name)
  })

  test('galeria na karcie przełącza zdjęcia', async ({ page }) => {
    await visit(page, '/pierscionki')
    await page.locator('.ring-grid-lg > li:not(.cta-card) a').first().click()
    await expect(page.locator('.product-media')).toBeVisible()
    const thumbs = page.locator('.thumbs .thumb')
    if ((await thumbs.count()) < 2) test.skip(true, 'Ten projekt ma jedno zdjęcie')
    await thumbs.nth(1).click()
    await expect(thumbs.nth(1)).toHaveAttribute('aria-pressed', 'true')
    await expect(thumbs.nth(0)).toHaveAttribute('aria-pressed', 'false')
  })

  test('nieistniejący projekt daje 404', async ({ page }) => {
    const response = await visit(page, '/pierscionki/nie-ma-takiego')
    expect(response?.status()).toBe(404)
  })
})

test.describe('Kreator pierścionka', () => {
  test('przechodzi wszystkie sześć kroków, podgląd zmienia się na żywo, bez zgody nic nie wysyła', async ({ page }) => {
    await visit(page, '/kreator')
    const preview = page.locator('.preview svg')
    await expect(page.getByText('Krok 1 z 6')).toBeVisible()
    await expect(preview).toHaveAttribute('aria-label', /szafir, szlif owal, oprawa halo, żółte złoto/)

    await page.getByRole('button', { name: /Rocznica/ }).click()
    await page.getByLabel(/Na kiedy/).fill('czerwiec 2027')
    await page.getByRole('button', { name: 'Dalej: kamień' }).click()

    await expect(page.getByRole('heading', { name: 'Wybierz kamień' })).toBeVisible()
    await page.getByRole('button', { name: /^Szmaragd/ }).click()
    await expect(preview).toHaveAttribute('aria-label', /szmaragd/)
    await page.getByRole('button', { name: 'Dalej: szlif' }).click()

    await expect(page.getByRole('heading', { name: 'Kształt kamienia' })).toBeVisible()
    await page.getByRole('button', { name: 'Serce' }).click()
    await expect(preview).toHaveAttribute('aria-label', /szlif serce/)
    await page.getByRole('button', { name: 'Dalej: oprawa' }).click()

    await expect(page.getByRole('heading', { name: 'Jak osadzić kamień?' })).toBeVisible()
    await page.getByRole('button', { name: /^Trylogia/ }).click()
    await expect(preview).toHaveAttribute('aria-label', /oprawa trylogia/)
    await expect(page.locator('.preview svg g[display="inline"]').first()).toBeAttached()
    await page.getByRole('button', { name: 'Dalej: złoto' }).click()

    await expect(page.getByRole('heading', { name: 'Złoto i obrączka' })).toBeVisible()
    await page.getByRole('button', { name: /^Białe/ }).click()
    await expect(preview).toHaveAttribute('aria-label', /białe złoto/)
    await page.getByRole('button', { name: 'Z drobnymi diamentami' }).click()
    await page.getByLabel(/Grawer w środku/).fill('A & M 14.06.2027 to jest za dlugi napis')
    await expect(page.getByLabel(/Grawer w środku/)).toHaveValue('A & M 14.06.2027 to jest')
    await page.getByRole('button', { name: 'Przejdź do podsumowania' }).click()

    await expect(page.getByRole('heading', { name: 'Twój szkic jest gotowy' })).toBeVisible()
    await expect(page.getByText('Krok 6 z 6')).toBeVisible()
    const card = page.locator('.card-summary')
    await expect(card).toContainText('Rocznica')
    await expect(card).toContainText('czerwiec 2027')
    await expect(card).toContainText('Szmaragd')
    await expect(card).toContainText('Serce')
    await expect(card).toContainText('Trylogia')
    await expect(card).toContainText('Białe')
    await expect(card).toContainText('Klasyczna, z diamentami')
    await expect(card).toContainText('„A & M 14.06.2027 to jest”')

    // Bez zgody i z błędnym telefonem: komunikaty przy polach i zero żądań zapisujących dane.
    // Przy wyłączonej wysyłce (E2E_SUBMISSIONS=off): komunikat wersji podglądowej i też zero żądań.
    const writes = captureWrites(page)
    await page.getByLabel('Imię').fill('Anna')
    await page.getByLabel('Telefon').fill(SUBMISSIONS_OFF ? '501 321 347' : '12 34')
    await page.getByRole('button', { name: 'Wyślij projekt do pracowni' }).click()
    if (SUBMISSIONS_OFF) {
      await expect(page.getByRole('status').filter({ hasText: NOTICE })).toBeVisible()
    } else {
      await expect(page.getByText('Podaj polski numer telefonu, np. 501 321 347.')).toBeVisible()
      await expect(page.getByText('Zaznacz zgodę na kontakt, żebyśmy mogli oddzwonić.')).toBeVisible()
      await expect(page.getByLabel('Telefon')).toHaveAttribute('aria-invalid', 'true')
      await expect(page.getByRole('alert').filter({ hasText: 'Sprawdź zaznaczone pola.' })).toBeVisible()
    }
    expect(writes).toEqual([])

    // krok wstecz i skok przez wskaźnik kroków
    await page.getByRole('button', { name: 'Wstecz' }).click()
    await expect(page.getByText('Krok 5 z 6')).toBeVisible()
    await page.getByRole('navigation', { name: 'Kroki kreatora' }).getByRole('button', { name: /Okazja/ }).click()
    await expect(page.getByText('Krok 1 z 6')).toBeVisible()
  })
})

test.describe('Obrączki i formularz kontaktowy', () => {
  test('konfigurator obrączek zmienia opis i przekazuje wybór do formularza', async ({ page }) => {
    await visit(page, '/obraczki')
    await page.getByRole('button', { name: 'Płaska' }).click()
    await page.getByRole('button', { name: '7 mm' }).click()
    await page.getByRole('button', { name: 'Matowe' }).click()
    await page.getByRole('button', { name: 'Białe' }).click()
    await expect(page.locator('.bands-view .sum')).toHaveText('Profil płaska, 7 mm, matowe, białe złoto')
    await page.getByRole('link', { name: 'Umów przymiarkę obrączek' }).click()
    await expect(page).toHaveURL(/\/kontakt\?temat=obraczki&wybor=/)
    await expect(page.getByLabel(/Wstępny wybór/)).toHaveValue('płaska, 7 mm, matowe, białe złoto')
  })

  test('formularz zmienia pola zależnie od tematu i bez zgody nic nie wysyła', async ({ page }) => {
    await visit(page, '/kontakt')
    await expect(page.getByLabel('Okazja')).toBeVisible()
    await page.locator('label.topic', { hasText: 'Naprawa lub przeróbka' }).click()
    await expect(page.getByText(/Z naprawą możesz przyjść w godzinach otwarcia/)).toBeVisible()
    await expect(page.getByLabel('Co trzeba zrobić?')).toBeVisible()
    // wybrany temat jest wyróżniony także bez obsługi :has() (klasa is-checked)
    await expect(page.locator('label.topic', { hasText: 'Naprawa lub przeróbka' })).toHaveClass(/is-checked/)

    const writes = captureWrites(page)
    await page.getByLabel('Imię').fill('Marek')
    await page.getByLabel('Telefon').fill('600 100 200')
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
    if (SUBMISSIONS_OFF) {
      await expect(page.getByRole('status').filter({ hasText: NOTICE })).toBeVisible()
    } else {
      await expect(page.getByText('Napisz, w czym możemy pomóc.')).toBeVisible()
      await expect(page.getByText('Zaznacz zgodę na kontakt, żebyśmy mogli oddzwonić.')).toBeVisible()
      await expect(page.getByLabel('Co trzeba zrobić?')).toHaveAttribute('aria-invalid', 'true')
    }
    expect(writes).toEqual([])
  })
})

test.describe('Nagłówek: kreator pierścionka', () => {
  // Układ nagłówka zależy od szerokości okna, więc testy ustawiają własne; na emulacji telefonu pomijamy.
  test.skip(({ isMobile }) => isMobile, 'szerokości desktopowe sprawdza projekt desktopowy')

  test('z nagłówka na komputerze da się wejść do kreatora, „Umów wizytę” zostaje głównym przyciskiem', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await visit(page, '/')
    const actions = page.locator('.header-actions')
    const creator = actions.getByRole('link', { name: 'Zaprojektuj pierścionek' })
    const bookCta = actions.getByRole('link', { name: 'Umów wizytę' })
    await expect(creator).toBeVisible()
    await expect(bookCta).toBeVisible()
    // Kolejność: kreator (drugorzędny, z obrysem) przed „Umów wizytę” (wypełniony).
    const [a, b] = [await creator.boundingBox(), await bookCta.boundingBox()]
    expect(a!.x).toBeLessThan(b!.x)
    expect(await creator.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
    expect(await bookCta.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)')
    await expect(creator).not.toHaveAttribute('aria-current', 'page')

    await creator.click()
    await expect(page).toHaveURL(/\/kreator$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zaprojektuj pierścionek')
    await expect(creator).toHaveAttribute('aria-current', 'page')
    await expect(bookCta).not.toHaveAttribute('aria-current', 'page')
  })

  test('nagłówek nie łamie się w szerokościach 960–1440 px', async ({ page }) => {
    await visit(page, '/kontakt')
    for (const width of [960, 1024, 1139, 1140, 1200, 1280, 1319, 1320, 1440]) {
      await page.setViewportSize({ width, height: 800 })
      const header = await page.locator('.site-header').boundingBox()
      // Jeden rząd: poniżej 1140 px menu rozwijane, od 1140 px pełna nawigacja z dwoma przyciskami.
      expect(header!.height, `wysokość nagłówka przy ${width} px`).toBeLessThan(120)
      await noHorizontalScroll(page)
      const desktop = width >= 1140
      await expect(page.locator('.main-nav'), `menu poziome przy ${width} px`).toBeVisible({ visible: desktop })
      await expect(page.locator('.menu-btn'), `przycisk menu przy ${width} px`).toBeVisible({ visible: !desktop })
      if (desktop) {
        const right = (await page.locator('.header-actions').boundingBox())!
        expect(right.x + right.width).toBeLessThanOrEqual(width)
      }
    }
  })
})

test.describe('Nawigacja na telefonie', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('menu otwiera się, prowadzi do strony i zamyka', async ({ page }) => {
    await visit(page, '/')
    const toggle = page.getByRole('button', { name: 'Otwórz menu' })
    await toggle.click()
    await expect(page.locator('#mobile-menu')).toBeVisible()
    await page.locator('#mobile-menu').getByRole('link', { name: 'Obrączki' }).click()
    await expect(page).toHaveURL(/\/obraczki$/)
    await expect(page.locator('#mobile-menu')).toBeHidden()
  })

  test('w menu jest osobna pozycja kreatora, prowadzi do /kreator i jest oznaczona jako bieżąca', async ({ page }) => {
    await visit(page, '/')
    await page.getByRole('button', { name: 'Otwórz menu' }).click()
    const menu = page.locator('#mobile-menu')
    const creator = menu.getByRole('link', { name: 'Zaprojektuj pierścionek' })
    await expect(creator).toBeVisible()
    await expect(creator).not.toHaveAttribute('aria-current', 'page')
    await creator.click()
    await expect(page).toHaveURL(/\/kreator$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zaprojektuj pierścionek')
    await expect(menu).toBeHidden()
    await page.getByRole('button', { name: 'Otwórz menu' }).click()
    await expect(menu.getByRole('link', { name: 'Zaprojektuj pierścionek' })).toHaveAttribute('aria-current', 'page')
  })
})
