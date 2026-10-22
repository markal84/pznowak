import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Przełączniki RING_CREATOR_ENABLED i BAND_CONFIGURATOR_ENABLED (site.ts): wyłączone ukrywają kreator
 * i konfigurator wszędzie, a włączone przywracają nagłówek, linki i strony sprzed ukrycia.
 */

const flags = vi.hoisted(() => ({ creator: false, bands: false }))

vi.mock('@/lib/site', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/site')>()
  return {
    ...actual,
    get RING_CREATOR_ENABLED() {
      return flags.creator
    },
    get BAND_CONFIGURATOR_ENABLED() {
      return flags.bands
    },
  }
})

// Strony czytają katalog z Payloada; tu wystarczą puste listy (bez bazy).
vi.mock('@/lib/collection', () => ({
  getProducts: async () => [],
  getGallery: async () => [],
}))

const { default: SiteHeader } = await import('@/components/site/SiteHeader')
const { default: HomePage } = await import('@/app/(frontend)/page')
const { default: OnOrderPage } = await import('@/app/(frontend)/na-zamowienie/page')
const { default: BandsPage } = await import('@/app/(frontend)/obraczki/page')
const creatorPage = await import('@/app/(frontend)/kreator/page')

const html = (element: ReactElement) => renderToStaticMarkup(element)

const pages = async () => ({
  header: html(createElement(SiteHeader)),
  home: html(await HomePage()),
  onOrder: html(await OnOrderPage()),
  bands: html(await BandsPage()),
})

afterEach(() => {
  flags.creator = false
  flags.bands = false
})

describe('przełączniki wyłączone (stan po 21.10.2026)', () => {
  it('nigdzie nie ma linku do kreatora ani konfiguratora', async () => {
    const { header, home, onOrder, bands } = await pages()
    for (const [name, markup] of Object.entries({ header, home, onOrder, bands })) {
      expect(markup, name).not.toContain('href="/kreator"')
      expect(markup, name).not.toMatch(/Zaprojektuj (pierścionek|wstępnie)/)
      expect(markup, name).not.toContain('Dobierzcie wstępnie parę')
    }
    expect(header).not.toContain('has-creator')
  })

  it('zamiast kreatora: „Wyślij zdjęcie lub opis” do formularza, a obrączki jako rodzaje na zdjęciach', async () => {
    const { home, onOrder, bands } = await pages()
    for (const markup of [home, onOrder]) {
      expect(markup).toContain(
        '<a class="tl" href="/kontakt?temat=nowy">Wyślij zdjęcie lub opis</a>',
      )
    }
    expect(bands).toContain('Rodzaje obrączek')
    for (const type of ['Płaskie', 'Półokrągłe', 'Klasyczne'])
      expect(bands).toContain(`>${type}</h3>`)
    expect(bands).toContain('[zdjęcie do uzupełnienia]')
    expect(bands).toContain('href="/kontakt?temat=obraczki&amp;wybor=p%C5%82askie"')
    expect(bands).toContain('od podstaw ręcznie, w każdej szerokości')
  })

  it('/kreator odpowiada 404 i ma tylko noindex (Zlecenie D), bez własnego tytułu i opisu', () => {
    expect(() => creatorPage.default()).toThrowError(
      expect.objectContaining({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' }),
    )
    expect(creatorPage.generateMetadata()).toEqual({ robots: { index: false, follow: false } })
  })
})

describe('przełączniki włączone przywracają stan sprzed ukrycia', () => {
  it('kreator: przycisk w nagłówku, pozycja w menu na telefonie, linki w treściach i strona /kreator', async () => {
    flags.creator = true
    const { header, home, onOrder } = await pages()
    expect(header).toContain('class="site-header has-creator"')
    expect(header).toContain(
      '<a class="btn btn-line header-cta header-cta-creator" href="/kreator">Zaprojektuj pierścionek</a>',
    )
    expect(header).toContain('<a class="m m-creator" href="/kreator">Zaprojektuj pierścionek</a>')
    for (const markup of [home, onOrder]) {
      expect(markup).toContain('<a class="tl" href="/kreator">Zaprojektuj wstępnie online</a>')
      expect(markup).not.toContain('Wyślij zdjęcie lub opis')
    }

    expect(creatorPage.generateMetadata()).toMatchObject({ title: 'Zaprojektuj pierścionek' })
    const creator = html(creatorPage.default())
    expect(creator).toContain('<h1 class="h1"')
    expect(creator).toContain('Zaprojektuj pierścionek</h1>')
    expect(creator).toContain('Krok 1 z 6')
  })

  it('konfigurator obrączek wraca na stronę „Obrączki” zamiast rodzajów na zdjęciach', async () => {
    flags.bands = true
    const { bands } = await pages()
    expect(bands).toContain('Dobierzcie wstępnie parę')
    expect(bands).toContain('Umów przymiarkę obrączek')
    expect(bands).not.toContain('Rodzaje obrączek')
  })

  it('przełączniki są niezależne: konfigurator bez kreatora i odwrotnie', async () => {
    flags.bands = true
    let rendered = await pages()
    expect(rendered.header).not.toContain('href="/kreator"')
    expect(rendered.bands).toContain('Dobierzcie wstępnie parę')

    flags.bands = false
    flags.creator = true
    rendered = await pages()
    expect(rendered.header).toContain('href="/kreator"')
    expect(rendered.bands).toContain('Rodzaje obrączek')
  })
})
