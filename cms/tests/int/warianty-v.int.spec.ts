import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import type { SiteProduct } from '@/lib/public-products'
import {
  findVariant,
  inquiryHref,
  originalSwatch,
  serializeStoneVariants,
  stoneSlug,
  SWATCH_IDS,
  type StoneVariant,
} from '@/lib/stone-variants'
import { stoneGroup } from '@/lib/catalog'
import { lintSpec } from '../../scripts/opisy-u-logic'
import {
  checkImages,
  fixMediaAlts,
  IMAGES_DIR,
  loadSpecs,
  findReplaceTarget,
  keptVariants,
  parseReplaceArg,
  replacementKey,
  missingVariants,
  planCardFix,
} from '../../scripts/warianty-v-logic'

/** Zlecenie V: „Zamów z innym kamieniem” – logika wariantów, dane na staging i karta pierścionka. */

const media = (id: number, url: string) => ({ id, url, alt: '', updatedAt: '', createdAt: '' })

describe('warianty: adresy i dane strony', () => {
  it('adres ?kamien= bez polskich znaków', () => {
    expect(stoneSlug('Różowy szafir i diamenty')).toBe('rozowy-szafir-i-diamenty')
    expect(stoneSlug('Szmaragd i diamenty')).toBe('szmaragd-i-diamenty')
    expect(stoneSlug('Białe diamenty')).toBe('biale-diamenty')
    expect(stoneSlug('Topaz London blue')).toBe('topaz-london-blue')
  })

  it('serializacja: tylko kompletne warianty, unikalne adresy, brak flagi = wizualizacja', () => {
    const variants = serializeStoneVariants([
      { stone: 'Szmaragd i diamenty', swatch: 'zielony', image: media(1, '/a.webp'), alt: 'Alt', isVisualization: true },
      { stone: 'Szmaragd  i diamenty', swatch: 'zielony', image: media(2, '/b.webp'), alt: null, isVisualization: null },
      { stone: 'Rubin', swatch: 'czerwony', image: 3 },
      { stone: '  ', swatch: 'bialy', image: media(4, '/d.webp') },
      { stone: 'Diament', swatch: 'bialy', image: media(5, '/e.webp'), isVisualization: false },
    ])
    expect(variants.map((v) => [v.slug, v.image, v.isVisualization])).toEqual([
      ['szmaragd-i-diamenty', '/a.webp', true],
      ['szmaragd-i-diamenty-2', '/b.webp', true],
      ['diament', '/e.webp', false],
    ])
    expect(serializeStoneVariants(null)).toEqual([])
  })

  it('nieznany ?kamien= to oryginał', () => {
    const variants = serializeStoneVariants([{ stone: 'Szmaragd', swatch: 'zielony', image: media(1, '/a.webp') }])
    expect(findVariant(variants, 'szmaragd')?.stone).toBe('Szmaragd')
    expect(findVariant(variants, 'rubin')).toBeNull()
    expect(findVariant(variants, undefined)).toBeNull()
  })

  it('kółko oryginału z nazwy kamienia (pierwszy wymieniony)', () => {
    expect(originalSwatch('Diamenty niebieskie i białe')).toBe('niebieski')
    expect(originalSwatch('Morganit różowy i diamenty')).toBe('rozowy')
    expect(originalSwatch('Topaz London Blue, diament')).toBe('londonblue')
    expect(originalSwatch('Szmaragd i szafiry kolorowe')).toBe('zielony')
    expect(originalSwatch('Ametyst, Diament')).toBe('fioletowy')
    expect(originalSwatch('Topaz Swiss blue')).toBe('jasnoniebieski')
    expect(originalSwatch('Diament')).toBe('bialy')
  })

  it('zlecenie Z: oliwkowy i London blue nie dublują zieleni ani granatu na karcie', () => {
    expect(originalSwatch('Turmalin oliwkowy')).toBe('oliwkowy')
    expect(originalSwatch('Topaz London blue')).toBe('londonblue')
    expect(originalSwatch('Szmaragd')).toBe('zielony')
    expect(originalSwatch('Szafir granatowy')).toBe('granatowy')
    expect(originalSwatch('Szafir różowy, Diament')).toBe('rozowy')
    expect(originalSwatch('Diamenty niebieskie i białe')).toBe('niebieski')
    expect(SWATCH_IDS).toEqual(expect.arrayContaining(['oliwkowy', 'londonblue']))
  })

  it('link „Zapytaj” niesie projekt i kamień', () => {
    expect(inquiryHref('Aion')).toBe('/kontakt?temat=kolekcja&projekt=Aion')
    const href = new URL(inquiryHref('Aion', 'Szmaragd i diamenty'), 'https://pznowak.pl')
    expect(href.searchParams.get('projekt')).toBe('Aion')
    expect(href.searchParams.get('kamien')).toBe('Szmaragd i diamenty')
  })
})

describe('warianty.json (dane na staging)', () => {
  const specs = loadSpecs()
  const aion = specs.find((s) => s.slug === 'aion')!
  const leto = specs.find((s) => s.slug === 'leto')!

  it('Aion: trzy wizualizacje od Kamili + szafir granatowy z W; różowa wersja to oryginał, więc wypada z wariantów', () => {
    expect(aion.removeStones).toEqual(['Różowy szafir i diamenty'])
    // Y: szmaragd od Kamili zastąpiony spokojniejszą zielenią (Michał 04.11: za bardzo nasycony).
    expect(aion.variants.map((v) => [v.stone, v.swatch, v.files[0], v.isVisualization])).toEqual([
      ['Szmaragd i diamenty', 'zielony', 'aion-szmaragd-stonowany.webp', true],
      ['Białe diamenty', 'bialy', 'eternity-diamenty-biale.webp', true],
      ['Diamenty niebieskie i białe', 'niebieski', 'eternity-niebieskie-diamenty.webp', true],
      ['Szafir granatowy i diamenty', 'granatowy', 'aion-szafir-granatowy.webp', true],
    ])
    for (const variant of aion.variants) expect(SWATCH_IDS).toContain(variant.swatch)
  })

  it('obrazy: są, webp, ≤ 300 KB; gotowe obrazy Kamili pionowe 4:5 bez czarnych pasów', async () => {
    expect(checkImages(specs)).toEqual([])
    // Wizualizacje z W (`<slug>-<kamien>.webp`) mają proporcje zdjęcia karty – sprawdza je test zlecenia W.
    for (const variant of aion.variants.filter((v) => v.files[0].startsWith('eternity-'))) {
      const file = path.join(IMAGES_DIR, variant.files[0])
      const { width, height, format } = await sharp(file).metadata()
      expect(format).toBe('webp')
      expect((width ?? 0) / (height ?? 1)).toBeCloseTo(4 / 5, 2)
      // Górny i dolny wiersz pikseli nie mogą być czarne (pasy ze zrzutu ekranu).
      const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
      const rowMean = (row: number) => {
        let sum = 0
        for (let x = 0; x < info.width * info.channels; x += 1) sum += data[row * info.width * info.channels + x]
        return sum / (info.width * info.channels)
      }
      expect(rowMean(0)).toBeGreaterThan(20)
      expect(rowMean(info.height - 1)).toBeGreaterThan(20)
    }
  })

  it('Leto → morganit, kolor w filtrze różowy; Aion → różowe szafiry (także po pierwszej wersji V)', () => {
    expect(leto.card?.stone).toBe('Morganit różowy i diamenty')
    expect(leto.card?.onlyIfStone).toEqual(['Kamień różowy'])
    expect(stoneGroup(leto.card!.stone)).toBe('rozowe')
    expect(aion.card?.stone).toBe('Różowy szafir i diamenty')
    expect(aion.card?.onlyIfStone).toEqual(['Szafir różowy, Diament', 'Diamenty niebieskie i białe'])
    expect(stoneGroup(aion.card!.stone)).toBe('rozowe')
  })

  it('nowe teksty kart trzymają standard opisów ze zlecenia U', () => {
    for (const [id, spec] of [[46, aion], [7, leto]] as const) {
      expect(lintSpec({ id, name: spec.name, lead: spec.card?.lead, description: spec.card?.description })).toEqual([])
    }
  })
})

describe('plan skryptu staging:warianty (idempotencja)', () => {
  const [aion] = loadSpecs()

  it('dopisuje tylko brakujące warianty; ręczne i już wgrane zostają', () => {
    expect(missingVariants([], aion.variants)).toHaveLength(aion.variants.length)
    const afterFirstRun = aion.variants.map((v) => ({ files: v.files, stone: v.stone }))
    expect(missingVariants(afterFirstRun, aion.variants)).toEqual([])
    // Michał zmienił nazwę jednego wariantu w panelu (obraz ten sam) i dodał własny: nic nie dublujemy.
    const edited = [{ files: [aion.variants[0].files[0]], stone: 'Szmaragdy i brylanty' }, { files: [null], stone: 'Rubin' }]
    expect(missingVariants(edited, aion.variants).map((v) => v.stone)).toEqual(
      aion.variants.slice(1).map((v) => v.stone),
    )
  })

  it('removeStones: usuwa po nazwie kamienia, reszta (także ręczne) zostaje', () => {
    const current = [
      { stone: 'Różowy szafir i diamenty' },
      { stone: 'Szmaragd i diamenty' },
      { stone: 'Rubin' },
    ]
    expect(keptVariants(current, aion.removeStones).map((v) => v.stone)).toEqual(['Szmaragd i diamenty', 'Rubin'])
    expect(keptVariants(current, [])).toHaveLength(3)
  })

  it('poprawka karty tylko przy dawnym kamieniu', () => {
    const fix = loadSpecs().find((s) => s.slug === 'leto')!.card!
    const plan = planCardFix({ stone: 'Kamień różowy', lead: 'x', description: 'y', media: [{ alt: '' }, { alt: 'Leto' }] }, fix)
    expect(plan.action).toBe('zmien')
    if (plan.action === 'zmien') {
      expect(plan.data.stone).toBe('Morganit różowy i diamenty')
      expect(plan.data.lead).toBe(fix.lead)
      expect(plan.mediaAlt).toBe(fix.mediaAlt)
    }
    expect(planCardFix({ stone: 'Morganit różowy i diamenty' }, fix).action).toBe('juz')
    expect(planCardFix({ stone: 'Turmalin różowy' }, fix).action).toBe('pomin')
  })

  it('alt zdjęć: nadpisuje tylko te bez nowego kamienia', () => {
    const fix = loadSpecs().find((s) => s.slug === 'leto')!.card!
    const result = fixMediaAlts([{ alt: 'Leto, kamień różowy', asset: 1 }, { alt: 'Leto z morganitem z boku', asset: 2 }, { asset: 3 }], fix)
    expect(result.map((m) => m.alt)).toEqual([fix.mediaAlt, 'Leto z morganitem z boku', fix.mediaAlt])
    expect(result.map((m) => m.asset)).toEqual([1, 2, 3])
  })
})

/* ------------------------------------------------------------------------------------------------------------------ */
/* Karta pierścionka (render na serwerze) */

const variants: StoneVariant[] = serializeStoneVariants([
  { stone: 'Różowy szafir i diamenty', swatch: 'rozowy', image: media(1, '/media/r.webp') },
  { stone: 'Szmaragd i diamenty', swatch: 'zielony', image: media(2, '/media/s.webp'), alt: 'Aion ze szmaragdami' },
  { stone: 'Białe diamenty', swatch: 'bialy', image: media(3, '/media/b.webp') },
])

const product = (name: string, extra: Partial<SiteProduct> = {}): SiteProduct => ({
  id: name.length,
  slug: name.toLowerCase(),
  name,
  lead: '',
  description: '',
  imagePath: `/media/${name}.jpg`,
  images: [`/media/${name}.jpg`, `/media/${name}-2.jpg`],
  video: '',
  metal: 'Żółte',
  stone: 'Diamenty niebieskie i białe',
  carats: '',
  clarity: '',
  seoTitle: '',
  seoDescription: '',
  seoImage: '',
  updatedAt: '2026-11-02T00:00:00.000Z',
  featuredOnHome: false,
  homeOrder: 0,
  stoneVariants: [],
  price: null,
  ...extra,
})

vi.mock('@/lib/collection', () => ({
  getProducts: async () => [product('Aion', { stoneVariants: variants }), product('Leto', { stone: 'Morganit różowy i diamenty' })],
}))

const { default: ProductPage, generateMetadata } = await import('@/app/(frontend)/pierscionki/[slug]/page')
const { default: ContactPage } = await import('@/app/(frontend)/kontakt/page')

const render = async (slug: string, searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(await ProductPage({ params: Promise.resolve({ slug }), searchParams: Promise.resolve(searchParams) }))

describe('karta pierścionka', () => {
  it('Aion: sekcja z 4 kółkami, pierwsze = oryginał (wybrane), bez etykiety „Wizualizacja”', async () => {
    const html = await render('aion')
    expect(html).toContain('Zamów z innym kamieniem')
    const buttons = [...html.matchAll(/<button[^>]*class="stone-option"[^>]*>/g)].map((m) => m[0])
    expect(buttons).toHaveLength(4)
    expect(buttons[0]).toContain('aria-pressed="true"')
    expect(buttons[0]).toContain('aria-label="Oryginał: Diamenty niebieskie i białe"')
    expect(html).toContain('przed zamówieniem pokażemy Ci zdjęcie lub film kamienia')
    expect(html).not.toContain('>Wizualizacja<')
    expect(html).toContain('/kontakt?temat=kolekcja&amp;projekt=Aion"')
  })

  it('Aion z ?kamien=: obraz wariantu, „Wizualizacja”, kamień w parametrach i w linku', async () => {
    const html = await render('aion', { kamien: 'szmaragd-i-diamenty' })
    const buttons = [...html.matchAll(/<button[^>]*class="stone-option"[^>]*>/g)].map((m) => m[0])
    expect(buttons[2]).toContain('aria-pressed="true"')
    expect(html).toContain('>Wizualizacja<')
    expect(html).toContain('Szmaragd i diamenty (na zamówienie)')
    expect(html).toContain('alt="Aion ze szmaragdami (wizualizacja)"')
    expect(html).toMatch(/\/_next\/image\?url=%2Fmedia%2Fs\.webp/)
    expect(html).toContain('kamien=Szmaragd+i+diamenty')
  })

  it('nieznany ?kamien= = oryginał, a adres kanoniczny zawsze bez parametru', async () => {
    const html = await render('aion', { kamien: 'rubin' })
    expect(html).not.toContain('(na zamówienie)')
    const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'aion' }) })
    expect(metadata.alternates?.canonical).toBe('/pierscionki/aion')
  })

  it('karta bez wariantów: sekcji nie ma', async () => {
    const html = await render('leto', { kamien: 'szmaragd-i-diamenty' })
    expect(html).not.toContain('Zamów z innym kamieniem')
    expect(html).not.toContain('stone-option')
    expect(html).toContain('Morganit różowy i diamenty')
  })
})

describe('formularz kontaktu z kamieniem', () => {
  it('?kamien= dopisuje kamień do pola projektu', async () => {
    const html = renderToStaticMarkup(
      await ContactPage({ searchParams: Promise.resolve({ temat: 'kolekcja', projekt: 'Aion', kamien: 'Szmaragd i diamenty' }) }),
    )
    expect(html).toContain('value="Aion, kamień: Szmaragd i diamenty"')
  })

  it('bez kamienia sama nazwa projektu', async () => {
    const html = renderToStaticMarkup(await ContactPage({ searchParams: Promise.resolve({ temat: 'kolekcja', projekt: 'Aion' }) }))
    expect(html).toContain('value="Aion"')
  })
})

describe('--podmien-obraz', () => {
  it('rozbiera <slug>:<kamień> i odrzuca zły zapis', () => {
    expect(parseReplaceArg('aion:Szafir granatowy i diamenty')).toEqual({ slug: 'aion', stone: 'Szafir granatowy i diamenty' })
    expect(() => parseReplaceArg('aion')).toThrow()
    expect(() => parseReplaceArg(undefined)).toThrow()
  })

  it('znajduje wariant po nazwie kamienia i daje osobny klucz Media', () => {
    const variants = [{ stone: 'Szmaragd i diamenty' }, { stone: 'Szafir  granatowy i diamenty' }]
    expect(findReplaceTarget(variants, 'szafir granatowy i diamenty')).toBe(variants[1])
    expect(findReplaceTarget(variants, 'Rubin')).toBeUndefined()
    expect(replacementKey('a.webp', 'abc')).toBe('seed://warianty/a.webp#abc')
  })
})
