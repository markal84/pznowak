import type { PayloadRequest } from 'payload'
import { createElement, Fragment, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}))
vi.mock('@payload-config', () => ({ default: {} }))

import { GuideRichText } from '../../src/components/site/GuideRichText'
import GuideContent, { stonePattern } from '../../src/components/site/GuideContent'
import { inline, doc, p } from '../../src/content/lexical-build'
import { GUIDE_SEED } from '../../src/content/guides-seed'
import { PAGE_TEXT_DEFAULTS } from '../../src/content/page-texts'
import { Guides } from '../../src/collections/Guides'
import { SiteContent } from '../../src/globals/SiteContent'
import {
  apiKeyDraftOnlyGlobalBeforeChange,
  apiKeyDraftOnlyGlobalBeforeOperation,
  apiKeyDraftOnlyBeforeOperation,
} from '../../src/lib/api-key-draft-only'
import { guideSections, guideUsesBlock, serializeGuide } from '../../src/lib/guides'
import type { GuideStoneBlock } from '../../src/lib/guide-types'
import { announcementVisible, resolvePageTexts } from '../../src/lib/page-texts'
import { keepShortWords, starredHeading } from '../../src/lib/typography'

const seed = (slug: string) => GUIDE_SEED.find((g) => g.slug === slug)!
const html = (node: ReactNode) => renderToStaticMarkup(createElement(Fragment, null, node))
const rich = (props: Parameters<typeof GuideRichText>[0]) => createElement(GuideRichText, props)
const content = (props: Parameters<typeof GuideContent>[0]) => createElement(GuideContent, props)

describe('poradniki z panelu: spis treści jak przed przeniesieniem', () => {
  it('rozmiar', () => {
    expect(guideSections(seed('jak-sprawdzic-rozmiar-pierscionka'), { hasPriceExamples: false })).toEqual([
      { id: 'krotko', label: 'Krótka odpowiedź' },
      { id: 'z-pierscionka', label: 'Z pierścionka, który już nosi' },
      { id: 'z-palca', label: 'Z obwodu palca' },
      { id: 'kalkulator', label: 'Kalkulator rozmiaru' },
      { id: 'tabela', label: 'Tabela rozmiarów' },
      { id: 'bledy', label: 'Co zmienia wynik' },
      { id: 'niespodzianka', label: 'Gdy to niespodzianka' },
      { id: 'pytania', label: 'Częste pytania' },
    ])
  })

  it('kamienie: kamienie po porównaniu, kotwice zgodne z linkami z kart (guide-links.ts)', () => {
    expect(guideSections(seed('kamienie-do-pierscionka-zareczynowego'), { hasPriceExamples: false }).map((s) => s.id)).toEqual([
      'krotko',
      'twardosc',
      'porownanie',
      'diament',
      'szafir',
      'rubin',
      'szmaragd',
      'tanzanit',
      'topaz',
      'oliwin',
      'ametyst-cytryn',
      'turmalin-morganit',
      'jak-wybrac',
      'pielegnacja',
      'pytania',
    ])
  })

  it('cena: przykłady z kolekcji tylko wtedy, gdy są ceny', () => {
    const guide = seed('ile-kosztuje-pierscionek-na-zamowienie')
    const ids = (has: boolean) => guideSections(guide, { hasPriceExamples: has }).map((s) => s.id)
    expect(ids(true)).toEqual(['krotko', 'skladniki', 'wyzej-nizej', 'budzet', 'przyklady', 'wycena', 'pytania'])
    expect(ids(false)).not.toContain('przyklady')
  })

  it('lista pierścionków potrzebna tylko poradnikom z przykładami albo cenami', () => {
    const types = ['stone', 'priceExamples', 'ifPrices'] as const
    expect(guideUsesBlock(seed('jak-sprawdzic-rozmiar-pierscionka'), [...types])).toBe(false)
    expect(guideUsesBlock(seed('kamienie-do-pierscionka-zareczynowego'), [...types])).toBe(true)
    expect(guideUsesBlock(seed('ile-kosztuje-pierscionek-na-zamowienie'), [...types])).toBe(true)
  })
})

describe('tekst poradnika (Lexical) jako HTML', () => {
  const context = { lowestPrice: 'od 1 900 zł', stones: [] }

  it('krótki zapis: pogrubienie, kursywa i linki', () => {
    expect(inline('a **b** *c* [d](/e) f').map((n) => n.type)).toEqual(['text', 'text', 'text', 'text', 'text', 'link', 'text'])
    expect(html(rich({ context, value: doc(p('Zobacz [tabelę](#tabela) i **to**.')) }))).toBe(
      '<p>Zobacz <a href="#tabela">tabelę</a> i <strong>to</strong>.</p>',
    )
    expect(html(rich({ context, value: doc(p('Strona [na zamówienie](/na-zamowienie).')) }))).toBe(
      '<p>Strona <a href="/na-zamowienie">na zamówienie</a>.</p>',
    )
  })

  it('{cena} i tekst zależny od cen w kolekcji', () => {
    const guide = seed('ile-kosztuje-pierscionek-na-zamowienie')
    const render = (lowestPrice: string | null) =>
      html(content({ context: { lowestPrice, stones: [] }, guide, priceExamples: [], products: [] }))
    expect(render('od 1 900 zł')).toContain('Pierścionki z naszej kolekcji kosztują <strong>od 1 900 zł</strong>.')
    expect(render(null)).toContain('Aktualne ceny gotowych projektów znajdziesz w <a href="/pierscionki">kolekcji pierścionków</a>.')
    expect(render(null)).not.toContain('id="przyklady"')
  })

  it('poradnik o rozmiarze: rysunek, kalkulator, tabela, uwaga i pytania na końcu', () => {
    const out = html(content({ context, guide: seed('jak-sprawdzic-rozmiar-pierscionka'), priceExamples: [], products: [] }))
    expect(out).toContain('<figcaption class="fig-cap">Liczy się wnętrze pierścionka, bez grubości metalu.</figcaption>')
    expect(out).toContain('<caption class="sr-only">Rozmiary pierścionków: polski, obwód, średnica, amerykański</caption>')
    expect(out).toContain(
      '<p class="guide-note">Nie musisz trafić co do milimetra. <strong>Rozmiar można poprawić po zaręczynach</strong>, więc przy niespodziance wystarczy rozmiar przybliżony.</p>',
    )
    expect(out.indexOf('<h2 id="pytania">Częste pytania</h2>')).toBeGreaterThan(out.indexOf('id="niespodzianka"'))
  })

  it('tabela kamieni od najtwardszego, z linkami do sekcji', () => {
    const guide = seed('kamienie-do-pierscionka-zareczynowego')
    const stones = guide.layout.filter((b): b is GuideStoneBlock => b.blockType === 'stone')
    const out = html(content({ context: { lowestPrice: null, stones }, guide, priceExamples: [], products: [] }))
    const order = [...out.matchAll(/<th scope="row"><a href="#([a-z-]+)">/g)].map((m) => m[1])
    expect(order.slice(0, 3)).toEqual(['diament', 'szafir', 'rubin'])
    expect(order.at(-1)).toBe('tanzanit')
    expect(out).toContain('<p class="guide-stone-facts">Twardość 7,5–8 · Zielony</p>')
  })

  it('kamień główny z karty po początku nazwy', () => {
    expect(stonePattern('ametyst, cytryn')?.test('cytryn')).toBe(true)
    expect(stonePattern('diament')?.test('diamenty')).toBe(true)
    expect(stonePattern('szafir')?.test('topaz')).toBe(false)
    expect(stonePattern(' ')).toBeNull()
  })

  it('dokument z Payload: brakujące pola nie psują strony', () => {
    const guide = serializeGuide({ slug: 'x', title: 'X', faq: [{ question: 'Q?', answer: '' }] })
    expect(guide).toMatchObject({ slug: 'x', layout: [], faq: [], minutes: 1, order: 10, metaTitle: null })
  })
})

describe('teksty stron z panelu', () => {
  it('puste pola i brak bazy dają dotychczasowe teksty', () => {
    const empty = resolvePageTexts(null)
    expect(empty.order.title).toBe('Pierścionek na zamówienie')
    expect(empty.bands.faq).toHaveLength(4)
    expect(empty.announcement).toBeNull()
    expect(resolvePageTexts({ catalog: { title: '  ', intro: null }, order: { faq: [] } }).catalog).toEqual(PAGE_TEXT_DEFAULTS.catalog)
  })

  it('pole z panelu wygrywa z tekstem domyślnym', () => {
    const texts = resolvePageTexts({
      catalog: { title: 'Pierścionki zaręczynowe z pracowni' },
      bands: { faq: [{ question: 'Nowe?', answer: 'Tak.', previewOnly: false }] },
    })
    expect(texts.catalog.title).toBe('Pierścionki zaręczynowe z pracowni')
    expect(texts.catalog.intro).toBe(PAGE_TEXT_DEFAULTS.catalog.intro)
    expect(texts.bands.faq).toEqual([{ question: 'Nowe?', answer: 'Tak.' }])
  })

  it('pasek z komunikatem do dnia włącznie (czas polski)', () => {
    const bar = resolvePageTexts({ announcement: { text: 'Zamówienia na święta do 10 grudnia', until: '2026-12-10' } }).announcement
    expect(bar).toMatchObject({ linkLabel: 'Szczegóły', linkUrl: null })
    expect(announcementVisible(bar, new Date('2026-12-10T22:30:00Z'))).toBe(true)
    expect(announcementVisible(bar, new Date('2026-12-10T23:30:00Z'))).toBe(false)
    expect(announcementVisible(null)).toBe(false)
  })

  it('nagłówek strony głównej i twarde spacje jak wcześniej w kodzie', () => {
    expect(html(starredHeading(PAGE_TEXT_DEFAULTS.home.title, { plain: 'hl', emphasis: 'hl' }))).toBe(
      '<span class="hl">Rzemiosło, które docenisz.</span> <em class="hl">Biżuteria, którą pokochasz.</em>',
    )
    expect(keepShortWords(PAGE_TEXT_DEFAULTS.home.intro)).toBe(
      'Projektujemy i wykonujemy biżuterię na zamówienie w rodzinnej pracowni w Busku-Zdroju.',
    )
  })
})

describe('szkice: klucz API nie publikuje poradników ani tekstów stron', () => {
  const apiKeyReq = { user: { id: 1, roles: ['editor'], _strategy: 'api-key' } } as unknown as PayloadRequest
  const panelReq = { user: { id: 2, roles: ['editor'], _strategy: 'local-jwt' } } as unknown as PayloadRequest

  it('kolekcja i global mają zaporę', () => {
    expect(Guides.hooks?.beforeOperation).toContain(apiKeyDraftOnlyBeforeOperation)
    expect(Guides.versions).toMatchObject({ drafts: true })
    expect(SiteContent.hooks?.beforeOperation).toContain(apiKeyDraftOnlyGlobalBeforeOperation)
    expect(SiteContent.hooks?.beforeChange).toContain(apiKeyDraftOnlyGlobalBeforeChange)
    expect(SiteContent.versions).toMatchObject({ drafts: true })
  })

  it('global: zapis kluczem API to szkic, przywracanie wersji zablokowane, panel bez zmian', () => {
    const run = (operation: string, req: PayloadRequest, args: Record<string, unknown>) =>
      apiKeyDraftOnlyGlobalBeforeOperation({ args, context: {}, global: {} as never, operation, req } as never)
    expect(run('update', apiKeyReq, { data: { _status: 'published' }, draft: false })).toMatchObject({
      data: { _status: 'draft' },
      draft: true,
    })
    expect(() => run('restoreVersion', apiKeyReq, {})).toThrow(/przywracać/)
    const args = { data: { _status: 'published' }, draft: false }
    expect(run('update', panelReq, args)).toBe(args)
    expect(
      apiKeyDraftOnlyGlobalBeforeChange({ data: { _status: 'published' }, req: apiKeyReq } as never),
    ).toEqual({ _status: 'draft' })
  })
})
