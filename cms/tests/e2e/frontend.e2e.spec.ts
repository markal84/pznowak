import { expect, test, type Page } from '@playwright/test'
import { BAND_CONFIGURATOR_ENABLED, RING_CREATOR_ENABLED } from '../../src/lib/site'
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

  test('całe zdjęcie w hero prowadzi do karty pierścionka (też dotykiem)', async ({ page }) => {
    await visit(page, '/')
    const link = page.locator('a.hero-link')
    await expect(link).toHaveAttribute('aria-label', /^Pierścionek .+ – zobacz szczegóły$/)
    expect(await link.locator('a').count()).toBe(0)
    await link.scrollIntoViewIfNeeded()
    const box = (await link.boundingBox())!
    await page.mouse.click(box.x + box.width / 2, box.y + 40)
    await expect(page).toHaveURL(/\/pierscionki\/[^/]+$/)
  })

  test('hero: główny przycisk to „Zapytaj o pierścionek”, a wybrane pierścionki to cztery karty bez powtórki z hero', async ({ page }) => {
    await visit(page, '/')
    await expect(page.getByRole('link', { name: 'Zapytaj o pierścionek' }).first()).toHaveAttribute('href', '/kontakt')
    const heroHref = await page.locator('a.hero-link').getAttribute('href')
    const cards = page.locator('ul.ring-grid-4 a')
    await expect(cards).toHaveCount(4)
    const hrefs = await cards.evaluateAll((els) => els.map((e) => e.getAttribute('href')))
    expect(hrefs).not.toContain(heroHref)
  })

  test('kafelki: w spoczynku bez złotej linii, pod wskaźnikiem linia rośnie', async ({ page, isMobile }) => {
    await visit(page, '/')
    const tile = page.locator('.tile').first()
    await tile.scrollIntoViewIfNeeded()
    const scale = () => tile.evaluate((el) => new DOMMatrix(getComputedStyle(el, '::before').transform).a)
    expect(await scale()).toBe(0)
    if (isMobile) return
    await tile.hover()
    await expect.poll(scale).toBeGreaterThan(0.99)
  })

  for (const [path, heading] of [
    ['/pierscionki', 'Pierścionki z pracowni'],
    ['/obraczki', 'Obrączki ślubne'],
    ['/na-zamowienie', 'Pierścionek na zamówienie'],
    ['/naprawy', 'Naprawy i przeróbki'],
    ['/pracownia', 'Od kuźni w Szańcu do stołu złotniczego w Busku'],
    ['/realizacje', 'Realizacje'],
    ['/kontakt', 'Umów wizytę'],
    ...(RING_CREATOR_ENABLED ? ([['/kreator', 'Zaprojektuj pierścionek']] as const) : []),
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
  test.skip(!RING_CREATOR_ENABLED, 'kreator ukryty (RING_CREATOR_ENABLED = false)')

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
      await expect(page.getByText(/^Sprawdź numer telefonu, np\. 501 321 347\. Zagraniczny/)).toBeVisible()
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
    test.skip(!BAND_CONFIGURATOR_ENABLED, 'konfigurator ukryty (BAND_CONFIGURATOR_ENABLED = false)')
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

test.describe('Nagłówek na komputerze', () => {
  // Układ nagłówka zależy od szerokości okna, więc testy ustawiają własne; na emulacji telefonu pomijamy.
  test.skip(({ isMobile }) => isMobile, 'szerokości desktopowe sprawdza projekt desktopowy')

  test('z nagłówka na komputerze da się wejść do kreatora, „Umów wizytę” zostaje głównym przyciskiem', async ({ page }) => {
    test.skip(!RING_CREATOR_ENABLED, 'kreator ukryty (RING_CREATOR_ENABLED = false)')
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

  test('bez kreatora „Umów wizytę” jest jedynym przyciskiem, a podpis przy logo zostaje', async ({ page }) => {
    test.skip(RING_CREATOR_ENABLED, 'kreator włączony')
    await page.setViewportSize({ width: 1200, height: 800 })
    await visit(page, '/')
    const header = page.locator('.site-header')
    await expect(header).not.toHaveClass(/has-creator/)
    await expect(page.locator('.header-actions').getByRole('link')).toHaveText(['Umów wizytę'])
    await expect(header.locator('a[href^="/kreator"]')).toHaveCount(0)
    await expect(header.getByText('Zaprojektuj pierścionek')).toHaveCount(0)
    // Z jednym przyciskiem podpis „Pracownia złotnicza / Busko-Zdrój” mieści się także w 1140–1319 px.
    await expect(page.locator('.brand-text')).toBeVisible()
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
    test.skip(!RING_CREATOR_ENABLED, 'kreator ukryty (RING_CREATOR_ENABLED = false)')
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

test.describe('Ukryty kreator i konfigurator (zlecenie A)', () => {
  test.skip(RING_CREATOR_ENABLED, 'kreator włączony (RING_CREATOR_ENABLED = true)')

  test('menu na telefonie nie ma pozycji kreatora', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await visit(page, '/')
    await page.getByRole('button', { name: 'Otwórz menu' }).click()
    const menu = page.locator('#mobile-menu')
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('link')).toHaveText([
      'Pierścionki',
      'Obrączki',
      'Na zamówienie',
      'Naprawy',
      'Realizacje',
      'Pracownia',
      'Umów wizytę',
    ])
  })

  for (const path of ['/', '/na-zamowienie']) {
    test(`${path}: zamiast „Zaprojektuj wstępnie online” jest „Wyślij zdjęcie lub opis” do formularza`, async ({ page }) => {
      await visit(page, path)
      await expect(page.getByText(/Zaprojektuj (pierścionek|wstępnie)/)).toHaveCount(0)
      const link = page.locator('main').getByRole('link', { name: 'Wyślij zdjęcie lub opis' })
      await expect(link).toHaveAttribute('href', '/kontakt?temat=nowy')
      await link.click()
      await expect(page).toHaveURL(/\/kontakt\?temat=nowy$/)
      await page.waitForSelector('html[data-hydrated="true"]')
      await expect(page.getByRole('radio', { name: /Pierścionek lub obrączki na zamówienie/ })).toBeChecked()
      await expect(page.getByLabel('Co Ci się podoba?')).toBeVisible()
    })
  }

  test('/kreator odpowiada 404 ze stroną „Tej strony nie znaleźliśmy”', async ({ page }) => {
    const response = await visit(page, '/kreator')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tej strony nie znaleźliśmy')
    await expect(page.getByText('Krok 1 z 6')).toHaveCount(0)
  })

  test('mapa linków: żadna strona nie prowadzi do kreatora ani konfiguratora', async ({ request }) => {
    // Przechodzi po wszystkich wewnętrznych linkach od strony głównej (karty pierścionków: dwie pierwsze).
    const queue = ['/']
    const seen = new Set(queue)
    const visited: string[] = []
    let rings = 0
    while (queue.length) {
      const path = queue.shift()!
      const response = await request.get(path)
      expect(response.status(), path).toBeLessThan(400)
      const html = await response.text()
      visited.push(path)
      expect(html, path).not.toMatch(/Zaprojektuj (pierścionek|wstępnie)|Dobierzcie wstępnie|konfigurator/i)
      for (const [, href] of html.matchAll(/<a[^>]+href="([^"#]*)/g)) {
        const url = new URL(href.replaceAll('&amp;', '&'), 'http://strona.test')
        if (url.host !== 'strona.test') continue
        expect(url.pathname, `link na ${path}`).not.toMatch(/^\/kreator/)
        if (/^\/(api|admin|_next)\b/.test(url.pathname) || seen.has(url.pathname)) continue
        if (url.pathname.startsWith('/pierscionki/') && ++rings > 2) continue
        seen.add(url.pathname)
        queue.push(url.pathname)
      }
    }
    // strony z menu i stopki muszą być w mapie
    for (const page of ['/pierscionki', '/obraczki', '/na-zamowienie', '/naprawy', '/realizacje', '/pracownia', '/kontakt']) {
      expect(visited).toContain(page)
    }
  })
})

test.describe('Obrączki bez konfiguratora (zlecenie A)', () => {
  test.skip(BAND_CONFIGURATOR_ENABLED, 'konfigurator włączony (BAND_CONFIGURATOR_ENABLED = true)')

  test('rodzaje obrączek na zdjęciach, a wybór trafia do formularza', async ({ page }) => {
    await visit(page, '/obraczki')
    await expect(page.getByText('Dobierzcie wstępnie parę')).toHaveCount(0)
    await expect(page.locator('.bands')).toHaveCount(0)
    const section = page.getByRole('region', { name: 'Rodzaje obrączek' })
    await expect(section.getByRole('heading', { level: 3 })).toHaveText(['Płaskie', 'Półokrągłe', 'Klasyczne'])
    await expect(section).toContainText('od podstaw ręcznie, w każdej szerokości')
    // Każda karta ma zdjęcie z galerii CMS albo widoczny placeholder.
    for (const card of await section.locator('.band-type').all()) {
      const photos = await card.locator('img:not([src*="obraczki.svg"])').count()
      if (photos === 0) await expect(card.getByText('[zdjęcie do uzupełnienia]')).toBeVisible()
    }
    await noHorizontalScroll(page)

    await section.getByRole('link', { name: 'Zapytaj o obrączki półokrągłe' }).click()
    await expect(page).toHaveURL(/\/kontakt\?temat=obraczki&wybor=/)
    await expect(page.getByLabel(/Wstępny wybór/)).toHaveValue('półokrągłe')
  })
})

test.describe('Formularz: zamówienie z grawerem i rozmiarem', () => {
  test('grawer i rozmiar są przy zamówieniu i projekcie z kolekcji, przy naprawie ich nie ma', async ({ page }) => {
    await visit(page, '/kontakt?temat=nowy')
    await expect(page.getByLabel(/Grawer/)).toBeVisible()
    await expect(page.getByRole('radio', { name: 'Nie znam' })).toBeChecked()
    await expect(page.getByText(/Zmierzymy palec w pracowni/)).toBeVisible()
    await page.getByRole('radio', { name: 'Znam rozmiar' }).check()
    await expect(page.getByLabel('Rozmiar w polskiej skali')).toBeVisible()
    await expect(page.getByText(/Zmierzymy palec w pracowni/)).toHaveCount(0)

    await page.locator('label.topic', { hasText: 'Projekt z kolekcji' }).click()
    await expect(page.getByLabel(/Grawer/)).toBeVisible()
    await page.locator('label.topic', { hasText: 'Naprawa lub przeróbka' }).click()
    await expect(page.getByLabel(/Grawer/)).toHaveCount(0)
    await expect(page.getByRole('radio', { name: 'Znam rozmiar' })).toHaveCount(0)
  })

  test('link w grawerze i brak rozmiaru: komunikaty przy polach, nic nie wychodzi', async ({ page }) => {
    await visit(page, '/kontakt?temat=nowy')
    const writes = captureWrites(page)
    await page.getByLabel(/Grawer/).fill('www.sklep.pl')
    await expect(page.getByLabel(/Grawer/)).toHaveValue('www.sklep.pl')
    await page.getByRole('radio', { name: 'Znam rozmiar' }).check()
    await page.getByLabel('Imię').fill('Marek')
    await page.getByLabel('Telefon').fill('600 100 200')
    await page.getByLabel(/Zgadzam się na kontakt/).check()
    await page.getByRole('button', { name: 'Wyślij wiadomość' }).click()
    if (SUBMISSIONS_OFF) {
      await expect(page.getByRole('status').filter({ hasText: NOTICE })).toBeVisible()
    } else {
      await expect(page.getByText('W tym polu nie może być linków ani adresów e-mail.')).toBeVisible()
      await expect(page.getByText('Wybierz rozmiar albo zaznacz „Nie znam”.')).toBeVisible()
      await expect(page.getByLabel(/Grawer/)).toHaveAttribute('aria-invalid', 'true')
      await expect(page.getByLabel('Rozmiar w polskiej skali')).toHaveAttribute('aria-invalid', 'true')
    }
    expect(writes).toEqual([])
  })
})
