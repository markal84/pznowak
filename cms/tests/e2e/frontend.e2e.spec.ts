import { expect, test, type Page } from '@playwright/test'

const NOTICE = /Wersja podglądowa: wysyłka jest jeszcze wyłączona/

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
  test('przechodzi wszystkie sześć kroków, podgląd zmienia się na żywo, wysyłka jest zablokowana', async ({ page }) => {
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

    // wysyłka na preview jest wyłączona: komunikat i zero żądań zapisujących dane
    const writes: string[] = []
    page.on('request', (r) => {
      if (r.method() !== 'GET' && r.method() !== 'HEAD') writes.push(`${r.method()} ${r.url()}`)
    })
    await page.getByLabel('Imię').fill('Anna')
    await page.getByLabel('Telefon').fill('501 321 347')
    await page.getByRole('button', { name: 'Wyślij projekt do pracowni' }).click()
    await expect(page.getByRole('status').filter({ hasText: NOTICE })).toBeVisible()
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

  test('formularz zmienia pola zależnie od tematu i nie wysyła danych na preview', async ({ page }) => {
    await visit(page, '/kontakt')
    await expect(page.getByLabel('Okazja')).toBeVisible()
    await page.locator('label.topic', { hasText: 'Naprawa lub przeróbka' }).click()
    await expect(page.getByText(/Z naprawą możesz przyjść w godzinach otwarcia/)).toBeVisible()
    await expect(page.getByLabel('Co trzeba zrobić?')).toBeVisible()

    const writes: string[] = []
    page.on('request', (r) => {
      if (r.method() !== 'GET' && r.method() !== 'HEAD') writes.push(`${r.method()} ${r.url()}`)
    })
    await page.getByLabel('Imię').fill('Marek')
    await page.getByLabel('Telefon').fill('600 100 200')
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
    await expect(page.getByRole('status').filter({ hasText: NOTICE })).toBeVisible()
    expect(writes).toEqual([])
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
})
