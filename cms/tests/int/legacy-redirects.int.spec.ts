import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  GSC_INDEXED_PATHS,
  LEGACY_GALLERY_SLUGS,
  LEGACY_REDIRECTS,
  LEGACY_RING_SLUGS,
  LEGACY_UNCHANGED_PAGES,
  LEGACY_WITHOUT_COUNTERPART,
  MERGED_RING_VARIANTS,
  REMOVED_RING_REPLACEMENTS,
  RENAMED_RING_SLUGS,
  currentRingSlug,
  legacyRedirectRules,
  ringPath,
} from '../../src/lib/legacy-redirects'

const here = path.dirname(fileURLToPath(import.meta.url))
const read = (relative: string) => readFileSync(path.resolve(here, relative), 'utf8')

/** Mapa witryny obecnej strony (https://pznowak.pl/sitemap.xml, stan z 22.10.2026): 39 adresów. */
const OLD_SITEMAP = [
  '/',
  '/katalog/',
  '/kontakt/',
  '/o-nas/',
  '/galeria/',
  ...LEGACY_RING_SLUGS.map((slug) => `/katalog/${slug}/`),
]

/** Strony nowego serwisu, na które mogą wskazywać przekierowania (poza /pierscionki/<slug>). */
const NEW_PAGES = ['/', '/pierscionki', '/realizacje', '/pracownia', '/kontakt']

const catalog = JSON.parse(read('../../../data/legacy/collection.json')) as { products: { slug: string }[] }

describe('przekierowania ze starej strony', () => {
  it('obejmują wszystkie 39 adresów starej mapy witryny', () => {
    expect(OLD_SITEMAP).toHaveLength(39)
    const covered = new Set<string>([
      ...LEGACY_UNCHANGED_PAGES,
      ...LEGACY_REDIRECTS.map(({ from }) => from),
    ])
    for (const url of OLD_SITEMAP) {
      const bare = url === '/' ? '/' : url.replace(/\/$/, '')
      expect(covered.has(bare), `brak ${url}`).toBe(true)
    }
  })

  it('slugi pierścionków zgadzają się z katalogiem zaimportowanym do Payload', () => {
    expect([...LEGACY_RING_SLUGS].sort()).toEqual(catalog.products.map((p) => p.slug).sort())
  })

  it('adresy zindeksowane w Google (GSC) są pokryte', () => {
    const covered = new Set<string>([...LEGACY_UNCHANGED_PAGES, ...LEGACY_REDIRECTS.map(({ from }) => from)])
    for (const indexed of GSC_INDEXED_PATHS) expect(covered.has(indexed), indexed).toBe(true)
  })

  it('każdy cel to istniejąca strona nowego serwisu', () => {
    // Aion powstał po imporcie katalogu (karta nr 46), ale jest fasonem, na który prowadzi Thalassa.
    const slugs = new Set<string>([...catalog.products.map((p) => currentRingSlug(p.slug)), 'aion'])
    for (const { from, to } of LEGACY_REDIRECTS) {
      const product = /^\/pierscionki\/([^?]+)(?:\?kamien=(.+))?$/.exec(to)
      const valid = product ? slugs.has(product[1]) : NEW_PAGES.includes(to)
      expect(valid, `${from} → ${to}`).toBe(true)
      // Cel to zawsze fason (nie zarchiwizowana karta), a `?kamien=` występuje tylko przy połączonych kartach.
      if (product) expect(product[1] in MERGED_RING_VARIANTS, `${from} → ${to} wskazuje zarchiwizowaną kartę`).toBe(false)
      if (product) expect(product[1] in REMOVED_RING_REPLACEMENTS, `${from} → ${to} wskazuje usuniętą kartę`).toBe(false)
      if (product?.[2]) expect(Object.values(MERGED_RING_VARIANTS).some((m) => m.kamien === product[2]), to).toBe(true)
    }
  })

  it('nie ma łańcuchów, pętli ani duplikatów', () => {
    const sources = LEGACY_REDIRECTS.map(({ from }) => from)
    expect(new Set(sources).size).toBe(sources.length)
    for (const { from, to } of LEGACY_REDIRECTS) {
      expect(to, `${from} wskazuje na samego siebie`).not.toBe(from)
      expect(sources.includes(to), `${from} → ${to} jest kolejnym przekierowaniem`).toBe(false)
      expect(to.endsWith('/') && to !== '/', `${to} kończy się skośnikiem`).toBe(false)
    }
  })

  it('zmiana adresów kart: 22 nowe, unikalne, bez kolizji z istniejącymi i bez łańcuchów', () => {
    const entries = Object.entries(RENAMED_RING_SLUGS)
    expect(entries).toHaveLength(22)
    const olds = new Set(catalog.products.map((p) => p.slug))
    const targets = entries.map(([, to]) => to)
    expect(new Set(targets).size).toBe(targets.length)
    for (const [from, to] of entries) {
      expect(olds.has(from), `${from} nie jest slugiem ze starego katalogu`).toBe(true)
      expect(olds.has(to), `${to} koliduje z istniejącym adresem`).toBe(false)
      expect(to).toMatch(/^[a-z]+$/)
    }
  })

  it('stare adresy kart (katalog, ring, nowy serwis) idą jednym skokiem na czysty adres', () => {
    const to = (from: string) => LEGACY_REDIRECTS.find((r) => r.from === from)?.to
    expect(to('/katalog/merope-2')).toBe('/pierscionki/merope')
    expect(to('/ring/pierscionek-8')).toBe('/pierscionki/pelagia')
    expect(to('/pierscionki/pierscionek-12')).toBe('/pierscionki/athena')
    expect(to('/katalog/aria')).toBe('/pierscionki/aria')
    expect(to('/pierscionki/aria')).toBeUndefined()
  })

  it('Thalassa → Aion: wszystkie jej adresy idą jednym skokiem na fason Aion z zielonym wariantem', () => {
    const green = '/pierscionki/aion?kamien=zielone-i-biale-diamenty'
    const to = (from: string) => LEGACY_REDIRECTS.find((r) => r.from === from)?.to
    for (const from of ['/pierscionki/thalassa', '/pierscionki/pierscionek-20', '/katalog/pierscionek-20', '/ring/pierscionek-20']) {
      expect(to(from), from).toBe(green)
    }
    expect(ringPath('thalassa')).toBe(green)
    expect(to('/pierscionki/aion')).toBeUndefined()
    expect(legacyRedirectRules()).toContainEqual({ source: '/pierscionki/thalassa/', destination: green, permanent: true })
  })

  it('Pyrrha i Nyx (zlecenie AB): wszystkie ich adresy idą jednym skokiem na fason Urania z wybranym kamieniem', () => {
    const rubin = '/pierscionki/urania?kamien=rubin-i-diamenty'
    const london = '/pierscionki/urania?kamien=topaz-london-blue-i-diamenty'
    const to = (from: string) => LEGACY_REDIRECTS.find((r) => r.from === from)?.to
    for (const from of ['/pierscionki/pyrrha', '/pierscionki/pierscionek-21', '/katalog/pierscionek-21', '/ring/pierscionek-21']) {
      expect(to(from), from).toBe(rubin)
    }
    for (const from of ['/pierscionki/nyx', '/pierscionki/pierscionek-18', '/katalog/pierscionek-18', '/ring/pierscionek-18']) {
      expect(to(from), from).toBe(london)
    }
    // Urania sama zostaje bez zmian: jej adres z numeru idzie na zwykły adres karty.
    expect(to('/katalog/pierscionek-19')).toBe('/pierscionki/urania')
    expect(to('/pierscionki/urania')).toBeUndefined()
    expect(ringPath('pyrrha')).toBe(rubin)
    expect(ringPath('aria')).toBe('/pierscionki/aria')
    // Wersje ze skośnikiem na końcu (stare adresy WordPressa) też jednym skokiem.
    const rules = legacyRedirectRules()
    expect(rules).toContainEqual({ source: '/pierscionki/nyx/', destination: london, permanent: true })
    expect(rules).toContainEqual({ source: '/katalog/pierscionek-21/', destination: rubin, permanent: true })
  })

  it('Eirene i Leto (lista PZ Nowak): wszystkie ich adresy idą jednym skokiem na fason Harmonia', () => {
    const turmalin = '/pierscionki/harmonia?kamien=turmalin-malinowy-i-diamenty'
    const to = (from: string) => LEGACY_REDIRECTS.find((r) => r.from === from)?.to
    for (const from of ['/pierscionki/eirene', '/pierscionki/pierscionek-17', '/katalog/pierscionek-17', '/ring/pierscionek-17']) {
      expect(to(from), from).toBe(turmalin)
    }
    for (const from of ['/pierscionki/leto', '/pierscionki/leto-2', '/katalog/leto-2', '/ring/leto-2']) {
      expect(to(from), from).toBe('/pierscionki/harmonia')
    }
    // Harmonia sama zostaje: jej adres z numeru idzie na zwykły adres karty.
    expect(to('/katalog/pierscionek-16')).toBe('/pierscionki/harmonia')
    expect(to('/pierscionki/harmonia')).toBeUndefined()
    expect(ringPath('leto')).toBe('/pierscionki/harmonia')
    expect(ringPath('eirene')).toBe(turmalin)
    const rules = legacyRedirectRules()
    expect(rules).toContainEqual({ source: '/pierscionki/leto/', destination: '/pierscionki/harmonia', permanent: true })
  })

  it('usunięte karty (13.11): Cassiopeia → Delos, Egea → Adamas, wszystkie adresy jednym skokiem', () => {
    const to = (from: string) => LEGACY_REDIRECTS.find((r) => r.from === from)?.to
    for (const from of ['/katalog/cassiopeia', '/ring/cassiopeia', '/pierscionki/cassiopeia']) {
      expect(to(from), from).toBe('/pierscionki/delos')
    }
    for (const from of ['/katalog/pierscionek-1', '/ring/pierscionek-1', '/pierscionki/pierscionek-1', '/pierscionki/egea']) {
      expect(to(from), from).toBe('/pierscionki/adamas')
    }
    expect(ringPath('egea')).toBe('/pierscionki/adamas')
    expect(to('/pierscionki/delos')).toBeUndefined()
    expect(to('/pierscionki/adamas')).toBeUndefined()
    expect(legacyRedirectRules()).toContainEqual({ source: '/katalog/cassiopeia/', destination: '/pierscionki/delos', permanent: true })
  })

  it('nie ma masowych przekierowań na stronę główną', () => {
    const toHome = LEGACY_REDIRECTS.filter(({ to }) => to === '/')
    expect(toHome.map(({ from }) => from)).toEqual(['/index.html'])
  })

  it('reguły Next: każdy stary adres ma wersję ze skośnikiem i bez, a ogólna reguła skośnika jest na końcu', () => {
    const rules = legacyRedirectRules()
    expect(rules).toHaveLength(LEGACY_REDIRECTS.length * 2)
    for (const { from, to } of LEGACY_REDIRECTS) {
      expect(rules).toContainEqual({ source: from, destination: to, permanent: true })
      expect(rules).toContainEqual({ source: `${from}/`, destination: to, permanent: true })
    }
    expect(rules.every((rule) => rule.permanent)).toBe(true)
  })

  it('next.config.ts wyłącza wbudowany skośnik i dopisuje ogólną regułę na końcu', () => {
    const config = read('../../next.config.ts')
    expect(config).toMatch(/skipTrailingSlashRedirect:\s*true/)
    expect(config).toMatch(/\.\.\.legacyRedirectRules\(\),\s*\{ source: '\/:path\+\/', destination: '\/:path\+', permanent: true \}/)
  })

  it('wpisy galerii WordPress mają unikalne slugi', () => {
    expect(new Set(LEGACY_GALLERY_SLUGS).size).toBe(LEGACY_GALLERY_SLUGS.length)
  })

  it('adresy bez odpowiednika nie są jednocześnie przekierowywane', () => {
    const sources = new Set(LEGACY_REDIRECTS.map(({ from }) => from))
    for (const { path: p } of LEGACY_WITHOUT_COUNTERPART) expect(sources.has(p), p).toBe(false)
  })
})

describe('docs/seo/przekierowania.md', () => {
  const doc = read('../../../docs/seo/przekierowania.md')
  const table = doc.slice(doc.indexOf('<!-- tabela:start -->'), doc.indexOf('<!-- tabela:end -->'))
  const rows = [...table.matchAll(/^\| `([^`]+)` \| `([^`]+)` \|/gm)].map(([, from, to]) => ({ from, to }))

  it('tabela zawiera dokładnie te przekierowania, które są w kodzie (npm run seo:redirects-doc)', () => {
    const expected = [
      ...LEGACY_UNCHANGED_PAGES.map((p) => ({ from: p, to: p })),
      ...LEGACY_REDIRECTS.map(({ from, to }) => ({ from, to })),
    ]
    expect(rows).toEqual(expected)
  })

  it('wymienia adresy bez odpowiednika', () => {
    for (const { path: p } of LEGACY_WITHOUT_COUNTERPART) expect(doc).toContain(`\`${p}\``)
  })
})
