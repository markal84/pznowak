import { expect, test, type APIRequestContext } from '@playwright/test'

import {
  LEGACY_REDIRECTS,
  LEGACY_UNCHANGED_PAGES,
  LEGACY_WITHOUT_COUNTERPART,
} from '../../src/lib/legacy-redirects'

// Testy sprawdzają serwer przez HTTP (bez przeglądarki). Zakładają środowisko inne niż produkcja: podglądy mają noindex.
const PRODUCTION = ['SITE_ENV', 'VERCEL_ENV'].some((name) => process.env[name] === 'production')

const PAGES = [
  '/',
  '/pierscionki',
  '/obraczki',
  '/na-zamowienie',
  '/naprawy',
  '/realizacje',
  '/pracownia',
  '/kontakt',
]

/** Jedno żądanie bez podążania za przekierowaniem. */
const hop = (request: APIRequestContext, path: string) => request.get(path, { maxRedirects: 0 })

const pathOf = (location: string | undefined) => {
  expect(location, 'brak nagłówka Location').toBeTruthy()
  const url = new URL(location as string, 'http://x.test')
  return `${url.pathname}${url.search}`
}

test.describe('Przekierowania ze starej strony', () => {
  // Każdy wiersz tabeli docs/seo/przekierowania.md: jeden trwały skok na właściwy adres, także z ukośnikiem na końcu.
  for (const { from, to } of LEGACY_REDIRECTS) {
    test(`${from} i ${from}/ → ${to} jednym skokiem, a cel zwraca 200`, async ({ request }) => {
      for (const source of [from, `${from}/`]) {
        const response = await hop(request, source)
        expect(response.status(), source).toBe(308)
        expect(pathOf(response.headers()['location']), source).toBe(to)
      }
      const target = await hop(request, to)
      expect(target.status(), `cel ${to}`).toBe(200)
    })
  }

  for (const page of LEGACY_UNCHANGED_PAGES.filter((p) => p !== '/')) {
    test(`${page}/ → ${page} (jeden skok), a ${page} zwraca 200`, async ({ request }) => {
      const response = await hop(request, `${page}/`)
      expect(response.status()).toBe(308)
      expect(pathOf(response.headers()['location'])).toBe(page)
      expect((await hop(request, page)).status()).toBe(200)
    })
  }

  test('parametry zapytania przechodzą przez przekierowanie', async ({ request }) => {
    const response = await hop(request, '/katalog/aria/?utm_source=facebook')
    expect(response.status()).toBe(308)
    expect(pathOf(response.headers()['location'])).toBe('/pierscionki/aria?utm_source=facebook')
  })

  test('adresy bez odpowiednika zwracają 404, nie przekierowanie', async ({ request }) => {
    for (const { path } of LEGACY_WITHOUT_COUNTERPART) {
      for (const source of [path, `${path}/`]) {
        const response = await request.get(source, { maxRedirects: 5 })
        expect(response.status(), source).toBe(404)
      }
    }
  })

  test('zwykłe adresy ze skośnikiem na końcu idą jednym skokiem na adres bez skośnika', async ({ request }) => {
    for (const page of ['/pierscionki', '/realizacje']) {
      const response = await hop(request, `${page}/`)
      expect(response.status()).toBe(308)
      expect(pathOf(response.headers()['location'])).toBe(page)
    }
  })
})

test.describe('Metadane podstron', () => {
  const seen = { titles: new Set<string>(), descriptions: new Set<string>() }

  for (const path of PAGES) {
    test(`${path}: własny tytuł i opis, adres kanoniczny, Open Graph`, async ({ request }) => {
      const response = await request.get(path)
      expect(response.status()).toBe(200)
      const html = await response.text()
      const title = /<title>([^<]*)<\/title>/.exec(html)?.[1]
      const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1]
      const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1]

      expect(title, 'tytuł').toBeTruthy()
      expect(description, 'opis').toBeTruthy()
      // Dla strony głównej Next zapisuje sam adres bazowy (bez końcowego „/”; to ten sam adres).
      expect(canonical, 'adres kanoniczny').toBe(`https://pznowak.pl${path === '/' ? '' : path}`)
      expect(html).toContain('property="og:title"')
      expect(html).toContain('property="og:description"')
      expect(html).toContain('property="og:image" content="https://pznowak.pl/')
      expect(html).toContain('name="twitter:card" content="summary_large_image"')
      // Opis nie może być wspólnym opisem z layoutu ani zawierać nieuzupełnionych cen.
      expect(description).not.toMatch(/Rodzinna pracownia złotnicza w Busku-Zdroju\. Pierścionki zaręczynowe/)
      expect(`${title} ${description}`).not.toMatch(/\[X\]|\[czas\]|\[cena\]/)

      expect(seen.titles.has(title as string), `powtórzony tytuł: ${title}`).toBe(false)
      expect(seen.descriptions.has(description as string), `powtórzony opis: ${description}`).toBe(false)
      seen.titles.add(title as string)
      seen.descriptions.add(description as string)
    })
  }

  test('strona główna ma w tytule nazwę miasta', async ({ request }) => {
    const html = await (await request.get('/')).text()
    expect(/<title>([^<]*)<\/title>/.exec(html)?.[1]).toContain('Busku-Zdroju')
  })

  test('strona pierścionka: tytuł, opis, kanoniczny adres i zdjęcie pierścionka w Open Graph', async ({ request }) => {
    const response = await request.get('/pierscionki/pierscionek-10')
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(/<title>([^<]+)<\/title>/.exec(html)?.[1]).toMatch(/^Phoebe/)
    expect(/<meta name="description" content="([^"]+)"/.exec(html)?.[1]).toBeTruthy()
    expect(html).toContain('<link rel="canonical" href="https://pznowak.pl/pierscionki/pierscionek-10"')
    expect(html).toMatch(/property="og:image" content="https:\/\/[^"]*blob\.vercel-storage\.com\//)
  })

  test('JSON-LD JewelryStore na stronie głównej i na /kontakt, bez ocen', async ({ request }) => {
    for (const path of ['/', '/kontakt']) {
      const html = await (await request.get(path)).text()
      const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      expect(scripts, path).toHaveLength(1)
      const data = JSON.parse(scripts[0][1])
      expect(data['@type']).toBe('JewelryStore')
      expect(data.address.streetAddress).toBe('Kilińskiego 12')
      expect(JSON.stringify(data)).not.toMatch(/aggregateRating|\[[^\]"]*\]/)
    }
  })

  test('/kreator jest schowany: 404 i noindex', async ({ request }) => {
    const response = await request.get('/kreator')
    expect(response.status()).toBe(404)
    expect(await response.text()).toMatch(/<meta name="robots" content="noindex/)
  })
})

test.describe('Mapa strony i robots.txt', () => {
  test('sitemap.xml: podstrony i opublikowane pierścionki, bez /kreator, /admin i /api', async ({ request }) => {
    const response = await request.get('/sitemap.xml')
    expect(response.status()).toBe(200)
    const xml = await response.text()
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
    for (const path of PAGES) expect(urls, path).toContain(path)
    expect(urls.filter((u) => u.startsWith('/pierscionki/')).length).toBeGreaterThanOrEqual(34)
    expect(urls).toContain('/pierscionki/pierscionek-10')
    expect(urls.filter((u) => /^\/(kreator|admin|api)/.test(u))).toEqual([])
    expect(new Set(urls).size).toBe(urls.length)
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T/)
  })

  test('szkic pierścionka nie trafia do mapy strony', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text()
    expect(xml).not.toContain('staging-catalog-product')
  })

  test.describe('podgląd (nie produkcja)', () => {
    test.skip(PRODUCTION, 'Test dotyczy środowiska innego niż produkcja.')

    test('robots.txt blokuje wszystko, nagłówek i meta mają noindex', async ({ request }) => {
      const robots = await (await request.get('/robots.txt')).text()
      expect(robots).toMatch(/User-Agent: \*\s+Disallow: \/\s*$/)
      expect(robots).not.toMatch(/Sitemap:/i)

      for (const path of ['/', '/pierscionki', '/pierscionki/pierscionek-10', '/kontakt']) {
        const response = await request.get(path)
        expect(response.headers()['x-robots-tag'], path).toMatch(/noindex/)
        expect(await response.text(), path).toMatch(/<meta name="robots" content="noindex, nofollow"/)
      }
    })
  })
})
