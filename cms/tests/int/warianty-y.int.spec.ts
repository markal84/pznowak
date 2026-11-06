import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'

import type { SiteProduct } from '@/lib/public-products'
import { galleryVideo, serializeStoneVariants, variantImageAlt, variantImages, variantVideo, type StoneVariant } from '@/lib/stone-variants'
import { checkImages, IMAGES_DIR, loadSpecs, missingVariants, planVariantImages, seedFile, WARIANTY_DIR } from '../../scripts/warianty-v-logic'
import { designPhotos, jobs, loadConfig, proposals } from '../../scripts/wizualizacje-w-logic'

/** Zlecenie Y: wariant kamienia zmienia całą galerię (lista obrazów zamiast jednego). */

const media = (id: number, url: string, mimeType = 'image/webp') => ({ id, url, mimeType, alt: '', updatedAt: '', createdAt: '' })

const specFile = (variants: unknown[]) => {
  const dir = mkdtempSync(path.join(tmpdir(), 'warianty-y-'))
  const file = path.join(dir, 'warianty.json')
  writeFileSync(file, JSON.stringify([{ slug: 'x', name: 'X', variants }]))
  return file
}
const base = { stone: 'Rubin', swatch: 'czerwony', alt: 'X z rubinem (wizualizacja)', isVisualization: true }

describe('warianty.json: lista obrazów', () => {
  it('„files” w kolejności galerii; stary „file” = lista jednoelementowa', () => {
    const [spec] = loadSpecs(specFile([{ ...base, files: ['x-rubin.webp', 'x-rubin-2.webp'] }, { ...base, stone: 'Szafir', file: 'x-szafir.webp' }]))
    expect(spec.variants.map((v) => v.files)).toEqual([['x-rubin.webp', 'x-rubin-2.webp'], ['x-szafir.webp']])
  })

  it('odrzuca „file” razem z „files”, pustą listę i powtórzony obraz', () => {
    expect(() => loadSpecs(specFile([{ ...base, file: 'a.webp', files: ['a.webp'] }]))).toThrow(/nie oba/)
    expect(() => loadSpecs(specFile([{ ...base, files: [] }]))).toThrow(/files/)
    expect(() => loadSpecs(specFile([{ ...base, files: ['a.webp', 'a.webp'] }]))).toThrow(/dwa razy/)
  })
})

describe('staging:warianty – obrazy istniejącego wariantu', () => {
  it('plik z legacySourceUrl, także po --podmien-obraz (klucz ze skrótem)', () => {
    expect(seedFile('seed://warianty/a.webp')).toBe('a.webp')
    expect(seedFile('seed://warianty/a.webp#abc123')).toBe('a.webp')
    expect(seedFile('https://fb/x.jpg')).toBeNull()
    expect(seedFile(null)).toBeNull()
  })

  it('ta sama lista = zostaw; inna lista z seeda = podmień; obraz z panelu = nie ruszam', () => {
    const spec = { stone: 'Szmaragd', swatch: 'zielony' as const, alt: '', isVisualization: true, files: ['d-s.webp', 'd-s-2.webp', 'd-s-3.webp'] }
    expect(planVariantImages({ stone: 'Szmaragd', files: ['d-s.webp', 'd-s-2.webp', 'd-s-3.webp'] }, spec).action).toBe('zostaw')
    expect(planVariantImages({ stone: 'Szmaragd', files: ['daphne-szmaragd.webp'] }, spec).action).toBe('podmien')
    expect(planVariantImages({ stone: 'Szmaragd', files: ['d-s.webp', null] }, spec).action).toBe('reczne')
  })

  it('wariant o tej samej nazwie (inne obrazy) nie jest dopisywany drugi raz', () => {
    const spec = { ...base, swatch: 'czerwony' as const, files: ['x-rubin.webp', 'x-rubin-2.webp'] }
    expect(missingVariants([{ stone: 'Rubin', files: ['stary.webp'] }], [spec])).toEqual([])
    expect(missingVariants([{ stone: 'Szafir', files: ['x-szafir.webp'] }], [spec])).toEqual([spec])
  })
})

describe('dane strony: obrazy wariantu', () => {
  it('„Obraz” + „Kolejne obrazy” w kolejności; bez filmów i powtórzeń', () => {
    const [variant] = serializeStoneVariants([
      {
        stone: 'Rubin',
        swatch: 'czerwony',
        image: media(1, '/m/1.webp'),
        moreImages: [media(2, '/m/2.webp'), media(3, '/m/film.mp4', 'video/mp4'), media(1, '/m/1.webp'), media(4, '/m/4.webp')],
      },
    ])
    expect(variant.image).toBe('/m/1.webp')
    expect(variant.images).toEqual(['/m/1.webp', '/m/2.webp', '/m/4.webp'])
    const [single] = serializeStoneVariants([{ stone: 'Szafir', swatch: 'granatowy', image: media(5, '/m/5.webp') }])
    expect(single.images).toEqual(['/m/5.webp'])
  })

  it('film wariantu (AB): tylko wideo; obraz w polu „Film” jest ignorowany; brak = pusty tekst', () => {
    const [withClip, withImage, none] = serializeStoneVariants([
      { stone: 'Rubin', swatch: 'czerwony', image: media(1, '/m/1.webp'), video: media(2, '/m/r.mp4', 'video/mp4') },
      { stone: 'Szafir', swatch: 'granatowy', image: media(3, '/m/3.webp'), video: media(4, '/m/4.webp') },
      { stone: 'Topaz', swatch: 'niebieski', image: media(5, '/m/5.webp') },
    ])
    expect(withClip.video).toBe('/m/r.mp4')
    expect(withImage.video).toBe('')
    expect(none.video).toBe('')
    expect(variantVideo({})).toBe('')
    expect(variantVideo({ video: '/m/r.mp4' })).toBe('/m/r.mp4')
  })

  it('variantImages: brak „images” (dane sprzed Y) = [image]; pusta lista też', () => {
    expect(variantImages({ image: '/media/a.webp' })).toEqual(['/media/a.webp'])
    expect(variantImages({ image: '/media/a.webp', images: null })).toEqual(['/media/a.webp'])
    expect(variantImages({ image: '/media/a.webp', images: [] })).toEqual(['/media/a.webp'])
    expect(variantImages({ image: '/media/a.webp', images: ['/media/a.webp', '/media/b.webp'] })).toEqual(['/media/a.webp', '/media/b.webp'])
    expect(variantImages({ image: '' })).toEqual([])
  })

  it('alt: kolejne ujęcia numerowane, wizualizacja zawsze z „(wizualizacja)”', () => {
    const v = { stone: 'Rubin i diamenty', alt: 'Pierścionek Cyane z rubinem (wizualizacja)', isVisualization: true }
    expect(variantImageAlt('Cyane', v, 0)).toBe('Pierścionek Cyane z rubinem (wizualizacja)')
    expect(variantImageAlt('Cyane', v, 2)).toBe('Pierścionek Cyane z rubinem, ujęcie 3 (wizualizacja)')
    expect(variantImageAlt('Cyane', { ...v, alt: '' }, 1)).toBe('Cyane z kamieniem: rubin i diamenty, ujęcie 2 (wizualizacja)')
    expect(variantImageAlt('Cyane', { ...v, alt: 'Cyane z rubinem', isVisualization: false }, 1)).toBe('Cyane z rubinem, ujęcie 2')
  })
})

describe('generator (Codex): zdjęcia galerii', () => {
  const config = loadConfig()

  it('kamienie z „cala_galeria” na każdym zdjęciu (końcówka -n), pozostałe tylko na pierwszym', () => {
    const cyane = config.fasony.find((d) => d.slug === 'cyane')!
    expect(designPhotos(cyane).map((p) => p.photoKey)).toEqual(['cyane', 'cyane-2', 'cyane-3', 'cyane-4'])
    expect(jobs(config, ['cyane-szafir-granatowy']).map((j) => j.file)).toEqual([
      'cyane-szafir-granatowy.webp',
      'cyane-szafir-granatowy-2.webp',
      'cyane-szafir-granatowy-3.webp',
      'cyane-szafir-granatowy-4.webp',
    ])
    expect(jobs(config, ['cyane-topaz-london-blue']).map((j) => j.file)).toEqual(['cyane-topaz-london-blue.webp'])
    expect(jobs(config, ['cyane-rubin-3']).map((j) => j.photoKey)).toEqual(['cyane-3'])
  })

  it('wpis wariantu tylko z kompletem zdjęć', () => {
    const all = jobs(config, ['daphne-rubin'])
    const done = proposals(config, new Set(all.map((j) => j.id)))
    expect(done[0].variants[0].files).toEqual(['daphne-rubin.webp', 'daphne-rubin-2.webp', 'daphne-rubin-3.webp'])
    expect(proposals(config, new Set(all.slice(0, 2).map((j) => j.id)))).toEqual([])
  })

  it('szmaragd Y: spokojniejsza zieleń, ta sama nazwa wariantu co wcześniej', () => {
    const calm = config.kamienie['szmaragd-stonowany']
    expect(calm.nazwa).toBe('Szmaragd')
    expect(calm.kolor_en).toMatch(/less saturated/)
    expect(calm.wzorce.length).toBeGreaterThan(0)
  })
})

describe('warianty.json po Y: próbka Cyane, Daphne, Aion', () => {
  const specs = loadSpecs()
  const config = loadConfig()
  const variant = (slug: string, stone: string) => specs.find((s) => s.slug === slug)!.variants.find((v) => v.stone === stone)!

  it('4 kolory Michała na całej galerii tam, gdzie Codex dał komplet', () => {
    expect(variant('cyane', 'Szafir granatowy i diamenty').files).toHaveLength(4)
    expect(variant('cyane', 'Szmaragd i diamenty').files).toHaveLength(4)
    expect(variant('cyane', 'Rubin i diamenty').files).toHaveLength(4)
    expect(variant('daphne', 'Szafir granatowy').files).toHaveLength(3)
    expect(variant('daphne', 'Szmaragd').files).toEqual(['daphne-szmaragd-stonowany.webp', 'daphne-szmaragd-stonowany-2.webp', 'daphne-szmaragd-stonowany-3.webp'])
    expect(variant('daphne', 'Rubin').files).toHaveLength(3)
    expect(variant('aion', 'Szmaragd i diamenty').files).toEqual(['aion-szmaragd-stonowany.webp'])
    expect(checkImages(specs)).toEqual([])
  })

  it('jasny szafir z W wycofany (Marcin 05.11): zostaje szafir granatowy', () => {
    expect(specs.find((s) => s.slug === 'cyane')!.removeStones).toEqual(['Szafir i diamenty'])
    expect(specs.find((s) => s.slug === 'daphne')!.removeStones).toEqual(['Szafir'])
    expect(specs.find((s) => s.slug === 'daphne')!.variants.map((v) => v.stone)).not.toContain('Szafir')
  })

  it('n-ty obraz wariantu ma proporcje n-tego zdjęcia karty; alt kończy „(wizualizacja)”', async () => {
    for (const slug of ['cyane', 'daphne']) {
      const photos = designPhotos(config.fasony.find((d) => d.slug === slug)!)
      for (const v of specs.find((s) => s.slug === slug)!.variants.filter((x) => x.files.length > 1)) {
        expect(v.files).toHaveLength(photos.length)
        expect(v.alt).toMatch(/\(wizualizacja\)$/)
        for (const [i, file] of v.files.entries()) {
          const a = await sharp(path.join(IMAGES_DIR, file)).metadata()
          const o = await sharp(path.join(WARIANTY_DIR, 'podglad', `${photos[i].photoKey}-oryginal.webp`)).metadata()
          expect((a.width ?? 0) / (a.height ?? 1)).toBeCloseTo((o.width ?? 0) / (o.height ?? 1), 1)
        }
      }
    }
  })
})

/* ------------------------------------------------------------------------------------------------------------------ */
/* Karta pierścionka (render na serwerze) */

const galleryVariants: StoneVariant[] = serializeStoneVariants([
  {
    stone: 'Rubin i diamenty',
    swatch: 'czerwony',
    image: media(11, '/media/rubin-1.webp'),
    moreImages: [media(12, '/media/rubin-2.webp')],
    alt: 'Pierścionek Cyane z rubinem (wizualizacja)',
  },
  { stone: 'Topaz London blue i diamenty', swatch: 'granatowy', image: media(13, '/media/topaz.webp') },
  // Zlecenie AB: prawdziwy wariant z własnym filmem (film karty, którą połączono z fasonem).
  {
    stone: 'Szmaragd i diamenty',
    swatch: 'zielony',
    image: media(14, '/media/szmaragd-1.webp'),
    moreImages: [media(16, '/media/szmaragd-2.webp')],
    video: media(15, '/media/szmaragd.mp4', 'video/mp4'),
    isVisualization: false,
  },
])

const product: SiteProduct = {
  id: 1,
  slug: 'cyane',
  name: 'Cyane',
  lead: '',
  description: '',
  imagePath: '/media/cyane-1.jpg',
  images: ['/media/cyane-1.jpg', '/media/cyane-2.jpg'],
  video: '/media/cyane.mp4',
  metal: 'Żółte',
  stone: 'Diament niebieski, diamenty',
  carats: '',
  clarity: '',
  seoTitle: '',
  seoDescription: '',
  seoImage: '',
  updatedAt: '2026-11-05T00:00:00.000Z',
  featuredOnHome: false,
  homeOrder: 0,
  stoneVariants: [
    ...galleryVariants,
    // Kształt sprzed Y (wpis z Data Cache zapisany starszym wdrożeniem): bez `images`.
    { slug: 'stary-wpis', stone: 'Stary wpis', swatch: 'czerwony', image: '/media/stary.webp', alt: '', isVisualization: true } as unknown as StoneVariant,
  ],
}

vi.mock('@/lib/collection', () => ({ getProducts: async () => [product] }))

const { default: ProductPage } = await import('@/app/(frontend)/pierscionki/[slug]/page')

const render = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(await ProductPage({ params: Promise.resolve({ slug: 'cyane' }), searchParams: Promise.resolve(searchParams) }))

const enc = (src: string) => encodeURIComponent(src)

describe('karta: wybrany kamień zmienia całą galerię', () => {
  it('oryginał: zdjęcia karty i film', async () => {
    const html = await render()
    expect(html).toContain(enc('/media/cyane-2.jpg'))
    expect(html).not.toContain(enc('/media/rubin-1.webp'))
    expect(html).toContain('Film o pierścionku')
    expect(html).not.toContain('Na filmie kamień')
  })

  it('wariant z galerią: tylko jego obrazy (także miniatury), „Wizualizacja”, alt z ujęciem; film zostaje', async () => {
    const html = await render({ kamien: 'rubin-i-diamenty' })
    expect(html).toContain(enc('/media/rubin-1.webp'))
    expect(html).toContain(enc('/media/rubin-2.webp'))
    expect(html).not.toContain(enc('/media/cyane-2.jpg'))
    expect(html).toContain('>Wizualizacja<')
    expect(html).toContain('alt="Pierścionek Cyane z rubinem (wizualizacja)"')
    expect(html).toContain('aria-label="Wizualizacja 2: rubin i diamenty"')
    // Przy innym kamieniu film ma podpis, jaki kamień na nim widać.
    expect(html).toContain('aria-label="Na filmie kamień: diament niebieski"')
    expect(html).not.toContain('oryginał')
    // Ten sam kadr co zdjęcie karty: bez rozmytego tła pojedynczego obrazu.
    expect(html).not.toContain('ph-variant')
  })

  it('wariant z własnym filmem (AB): karta pokazuje film w galerii (miniatura „Film”), bez plakietki wizualizacji', async () => {
    const html = await render({ kamien: 'szmaragd-i-diamenty' })
    expect(html).toContain('Film o pierścionku')
    expect(html).toContain(enc('/media/szmaragd-2.webp'))
    expect(html).not.toContain('>Wizualizacja<')
  })

  it('galleryVideo: własny film wariantu z okładką wariantu; inaczej film oryginału z okładką oryginału', () => {
    const own = { video: '/media/szmaragd.mp4' }
    expect(galleryVideo(own, ['/media/szmaragd-1.webp'], '/media/cyane.mp4', ['/media/cyane-1.jpg'])).toEqual({
      src: '/media/szmaragd.mp4',
      poster: '/media/szmaragd-1.webp',
    })
    expect(galleryVideo({ video: '' }, ['/media/rubin-1.webp'], '/media/cyane.mp4', ['/media/cyane-1.jpg'])).toEqual({
      src: '/media/cyane.mp4',
      poster: '/media/cyane-1.jpg',
    })
    // Bez wybranego kamienia (oryginał) film wariantu się nie pojawia; bez żadnego filmu: null.
    expect(galleryVideo(null, [], '/media/cyane.mp4', ['/media/cyane-1.jpg'])?.src).toBe('/media/cyane.mp4')
    expect(galleryVideo(own, [], '', ['/media/cyane-1.jpg'])).toBeNull()
    expect(galleryVideo(undefined, [], '', [])).toBeNull()
  })

  it('wariant bez „images” (stary wpis cache): jeden obraz z „image”, bez błędu', async () => {
    const html = await render({ kamien: 'stary-wpis' })
    expect(html).toContain(enc('/media/stary.webp'))
    expect(html).not.toContain(enc('/media/cyane-2.jpg'))
    expect(html).toContain('ph-variant')
    // Przy innym kamieniu film ma podpis, jaki kamień na nim widać.
    expect(html).toContain('aria-label="Na filmie kamień: diament niebieski"')
  })

  it('wariant z jednym obrazem: tylko ten obraz (bez mieszania z oryginałem) na rozmytym tle', async () => {
    const html = await render({ kamien: 'topaz-london-blue-i-diamenty' })
    expect(html).toContain(enc('/media/topaz.webp'))
    expect(html).not.toContain(enc('/media/cyane-2.jpg'))
    expect(html).toContain('ph-variant')
  })
})
