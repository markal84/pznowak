import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { stoneSlug } from '@/lib/stone-variants'
import { checkImages, IMAGES_DIR, loadSpecs } from '../../scripts/warianty-v-logic'
import {
  align,
  convexHull,
  coverCrop,
  generationPrompt,
  jobs,
  loadConfig,
  PROPOSALS_PATH,
  proposals,
  REPO_ROOT,
  stoneMask,
  variantSpec,
} from '../../scripts/wizualizacje-w-logic'

/** Zlecenie W: wizualizacje kamieni przez Codex – konfiguracja, prompt i obróbka obrazu bez wywołań modeli. */

describe('wizualizacje W: konfiguracja i wpisy', () => {
  const config = loadConfig()

  it('próbka: Cyane w pięciu kamieniach, fason z oktagonem w pełnej szóstce Kamili', () => {
    // Kamienie na 1. zdjęciu; Y dopisało szafir granatowy i spokojniejszy szmaragd (Michał 04.11).
    const first = (slug: string) => jobs(config, [slug]).filter((j) => j.photo === 1).map((j) => j.stone.key)
    expect(first('cyane')).toEqual(['rubin', 'bialy-diament', 'szafir', 'topaz-jasnoniebieski', 'topaz-london-blue', 'szafir-granatowy', 'szmaragd-stonowany'])
    expect(first('daphne').sort()).toEqual(
      ['ametyst', 'bialy-diament', 'rubin', 'szafir', 'szafir-granatowy', 'szmaragd-stonowany', 'topaz-jasnoniebieski', 'topaz-london-blue'],
    )
  })

  it('dogrywka: biel od Kamili (2 i 3 do generatora, 1 i 4 tylko do oceny), Aion – szafir granatowy', () => {
    const white = config.kamienie['bialy-diament']
    expect(white.wzorce.filter((w) => !w.pomocniczy).map((w) => w.pliki[0])).toEqual(['wzorce/biel-wzor-2.jpg', 'wzorce/biel-wzor-3.jpg'])
    expect(white.wzorce.filter((w) => w.pomocniczy)).toHaveLength(2)
    for (const w of white.wzorce) expect(existsSync(path.join(REPO_ROOT, 'data', w.pliki[0]))).toBe(true)
    const [aion] = jobs(config, ['aion'])
    expect(variantSpec(aion)).toMatchObject({ stone: 'Szafir granatowy i diamenty', swatch: 'granatowy', files: ['aion-szafir-granatowy.webp'] })
    expect(aion.design.maska).toBe('wiele')
  })

  it('prompt obrączki: zmienia wszystkie różowe szafiry, diamenty zostają; biel: tylko barwa ze wzorców', () => {
    const description = { centre_stone_en: 'x', other_stones_en: 'x', metal_en: 'yellow gold', notes_pl: '' }
    const aion = generationPrompt(jobs(config, ['aion'])[0], description, 2)
    expect(aion).toContain('CHANGE ONLY all the pink sapphires')
    expect(aion).toContain('white diamonds between them')
    expect(aion).toContain('every changed stone')
    const white = generationPrompt(jobs(config, ['cyane-bialy-diament'])[0], description, 2)
    expect(white).toContain('take ONLY their colour')
    // Y: bez „round brilliant” – Daphne ma oktagon.
    expect(white).toContain('keep the cut, outline and facets of the stone in IMAGE 1')
  })

  it('każdy kamień ma wzorzec koloru ze zdjęcia z pracowni', () => {
    for (const stone of Object.values(config.kamienie)) expect(stone.wzorce.length).toBeGreaterThan(0)
  })

  it('wpisy w formacie warianty.json z V: nazwy, kółka, alt z „wizualizacja”, unikalne ?kamien=', () => {
    const all = proposals(config, new Set(jobs(config).map((j) => j.id)))
    const cyane = all.find((e) => e.slug === 'cyane')!
    expect(cyane.variants.map((v) => v.stone)).toEqual([
      'Rubin i diamenty',
      'Białe diamenty',
      'Szafir i diamenty',
      'Topaz jasnoniebieski i diamenty',
      'Topaz London blue i diamenty',
      'Szafir granatowy i diamenty',
      'Szmaragd i diamenty',
    ])
    for (const entry of all) {
      const slugs = entry.variants.map((v) => stoneSlug(v.stone))
      expect(new Set(slugs).size).toBe(slugs.length)
      for (const v of entry.variants) {
        expect(v.isVisualization).toBe(true)
        expect(v.alt).toMatch(/\(wizualizacja\)$/)
        for (const file of v.files) expect(file).toMatch(new RegExp(`^${entry.slug}-[a-z-]+(-[2-9])?\\.webp$`))
      }
    }
    expect(variantSpec(jobs(config, ['daphne-szmaragd-stonowany'])[0])).toMatchObject({ stone: 'Szmaragd', swatch: 'zielony' })
  })

  it('przyjęte wizualizacje W są w warianty.json (jeden przebieg staging:warianty wgrywa wszystko)', () => {
    const published = new Set(loadSpecs().flatMap((spec) => spec.variants.flatMap((v) => v.files)))
    for (const id of ['cyane-rubin', 'cyane-bialy-diament', 'daphne-szmaragd-stonowany', 'daphne-topaz-london-blue', 'aion-szafir-granatowy']) {
      expect(published.has(`${id}.webp`)).toBe(true)
    }
  })

  it('wizualizacje W mają proporcje zdjęcia karty i ≤ 300 KB', async () => {
    const expected: Record<string, number> = { cyane: 1980 / 1320, daphne: 1680 / 1120, aion: 4 / 5 }
    for (const spec of loadSpecs()) {
      // Tylko 1. zdjęcie galerii (kolejne mają własne proporcje – sprawdza je test zlecenia Y).
      for (const v of spec.variants.filter((variant) => variant.files[0].startsWith(`${spec.slug}-`))) {
        const { width, height } = await sharp(path.join(IMAGES_DIR, v.files[0])).metadata()
        expect((width ?? 0) / (height ?? 1)).toBeCloseTo(expected[spec.slug], 1)
      }
    }
  })

  it('zapisany warianty-w.json (czekające na akceptację) czyta loader z V, a jego obrazy są na miejscu', () => {
    if (!existsSync(PROPOSALS_PATH)) return
    const specs = loadSpecs(PROPOSALS_PATH)
    expect(checkImages(specs)).toEqual([])
    for (const spec of specs) for (const v of spec.variants) for (const file of v.files) expect(existsSync(path.join(IMAGES_DIR, file))).toBe(true)
  })

  it('prompt: zmienia tylko kamień główny, wzorce tylko jako kolor, wskazówka z poprzedniej próby', () => {
    const [job] = jobs(config, ['cyane-rubin'])
    const description = {
      centre_stone_en: 'round brilliant blue diamond in prongs',
      other_stones_en: 'white diamond halo',
      metal_en: 'yellow gold',
      notes_pl: '',
    }
    const prompt = generationPrompt(job, description, 2, 'prongs were changed')
    expect(prompt).toContain('CHANGE ONLY the centre stone (round brilliant blue diamond in prongs)')
    expect(prompt).toContain('IMAGES 2–3')
    expect(prompt).toContain('ONLY as a colour reference')
    expect(prompt).toContain('white diamond halo')
    expect(prompt).toContain('Previous attempt was rejected: prongs were changed')
  })
})

describe('wizualizacje W: obróbka obrazu', () => {
  it('cover crop do proporcji oryginału', () => {
    expect(coverCrop({ width: 1536, height: 1024 }, 1980 / 1320)).toEqual({ left: 0, top: 0, width: 1536, height: 1024 })
    expect(coverCrop({ width: 1024, height: 1536 }, 4 / 5)).toEqual({ left: 0, top: 128, width: 1024, height: 1280 })
  })

  it('otoczka wypukła kwadratu z punktem w środku', () => {
    const hull = convexHull([
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [2, 2],
    ])
    expect(hull).toHaveLength(4)
  })

  const W = 120
  const H = 80
  const rgb = (fill: (x: number, y: number) => [number, number, number]) => {
    const buf = new Uint8Array(W * H * 3)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) buf.set(fill(x, y), (y * W + x) * 3)
    return buf
  }
  const inStone = (x: number, y: number) => (x - 60) ** 2 + (y - 40) ** 2 < 100
  const facet = (x: number, y: number) => (x + y) % 7 === 0 // jasne odblaski, które w obu obrazach są białe

  it('maska kamienia: cały okrągły kamień z odblaskami, nie tło', () => {
    const blue = rgb((x, y) => (inStone(x, y) ? (facet(x, y) ? [250, 250, 250] : [30, 80, 160]) : [200, 190, 120]))
    const red = rgb((x, y) => (inStone(x, y) ? (facet(x, y) ? [250, 250, 250] : [150, 20, 40]) : [200, 190, 120]))
    const found = stoneMask(blue, red, W, H, 25, 0)!
    expect(found).not.toBeNull()
    expect(found.mask[40 * W + 60]).toBe(255)
    expect(found.mask[40 * W + 60 + 7 - ((60 + 40) % 7)]).toBe(255) // odblask w środku kamienia też w masce
    expect(found.mask[5 * W + 5]).toBe(0)
    expect(found.area).toBeGreaterThan(0.02)
    expect(found.area).toBeLessThan(0.04)
  })

  it('maska fasonu domyka krawędź kamienia przy małej zmianie koloru', () => {
    // niebieski → granatowy: zmienia się tylko środek kamienia, brzeg (pierścień 6–10 px) prawie wcale
    const blue = rgb((x, y) => (inStone(x, y) ? [30, 80, 160] : [200, 190, 120]))
    const navy = rgb((x, y) => ((x - 60) ** 2 + (y - 40) ** 2 < 36 ? [20, 30, 70] : inStone(x, y) ? [32, 80, 158] : [200, 190, 120]))
    const prior = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inStone(x, y)) prior[y * W + x] = 255
    const edge = 40 * W + 60 + 9
    expect(stoneMask(blue, navy, W, H, 25, 0)?.mask[edge] ?? 0).toBe(0)
    expect(stoneMask(blue, navy, W, H, 25, 0, prior)!.mask[edge]).toBe(255)
  })

  it('maska „wiele”: każdy zmieniony kamień obrączki osobno, bez wypełniania przerw między nimi', () => {
    const stones = [20, 50, 80, 110]
    const at = (x: number, y: number) => stones.some((cx, i) => i % 2 === 0 && (x - cx) ** 2 + (y - 40) ** 2 < 36)
    const pink = rgb((x, y) => (at(x, y) ? [220, 120, 150] : [200, 190, 120]))
    const navy = rgb((x, y) => (at(x, y) ? [25, 35, 90] : [200, 190, 120]))
    const found = stoneMask(pink, navy, W, H, 25, 0, null, 'wiele')!
    expect(found.mask[40 * W + 20]).toBe(255)
    expect(found.mask[40 * W + 80]).toBe(255)
    expect(found.mask[40 * W + 50]).toBe(0) // kamień pomiędzy (diament) bez zmiany
    expect(stoneMask(pink, navy, W, H, 25, 0, null, 'jeden')!.mask[40 * W + 80]).toBe(0) // tryb „jeden” bierze tylko 1 kamień
  })

  it('maska odrzuca zmianę całego kadru', () => {
    const a = rgb(() => [200, 190, 120])
    const b = rgb(() => [40, 60, 160])
    expect(stoneMask(a, b, W, H)).toBeNull()
  })

  it('dopasowanie znajduje przesunięcie wyniku generatora', () => {
    const pattern = (x: number, y: number) => ((Math.floor(x / 9) + Math.floor(y / 7)) % 2 ? 220 : 30) + ((x * 3 + y) % 11)
    const a = new Uint8Array(W * H)
    const b = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      a[y * W + x] = pattern(x, y)
      b[y * W + x] = pattern(x + 6, y - 4) // ten sam wzór przesunięty: oryginał (x, y) = wynik (x − 6, y + 4)
    }
    const found = align(a, b, W, H, [1], 0.1)
    expect([found.dx, found.dy]).toEqual([6, -4])
  })
})
