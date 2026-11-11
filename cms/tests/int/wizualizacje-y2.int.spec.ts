import { describe, expect, it } from 'vitest'

import {
  mainStoneName,
  originalFilmCaption,
  PHOTOGRAPHED_STONE_NOTE,
  photographedStoneLabel,
  STONE_VARIANTS_NOTE,
  STONE_VARIANTS_NOTE_NATURAL,
  stoneVariantsNote,
} from '@/lib/stone-variants'
import { cutoutCheckPrompt, cutoutPrompt, jobs, loadConfig } from '../../scripts/wizualizacje-w-logic'
import {
  cropBox,
  hintRegion,
  inHue,
  lch,
  labToRgb,
  originalStoneMask,
  rgbToLab,
  stoneFix,
  stoneFixOptions,
  verifyCutout,
} from '../../scripts/wizualizacje-wycinek-logic'

/** Zlecenie Y.2: wizualizacje w wycinku (maska z oryginału, kontrola automatyczna), podpis filmu i dopisek pod kółkami. */

const W = 120
const H = 100
const BLUE: [number, number, number] = [20, 110, 150]
const WHITE: [number, number, number] = [235, 235, 232]
const GREY: [number, number, number] = [90, 90, 92]
const GOLD: [number, number, number] = [200, 165, 80]

type Px = [number, number, number]
const image = (paint: (x: number, y: number) => Px) => {
  const out = new Uint8Array(W * H * 3)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) out.set(paint(x, y), (y * W + x) * 3)
  return out
}
const disk = (x: number, y: number, cx: number, cy: number, r: number) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r
/** Pierścionek „z góry”: niebieski kamień (z białymi odblaskami) w środku, halo z białych kamieni, złote łapki. */
const ring = (stone: (x: number, y: number) => Px) =>
  image((x, y) => {
    if (disk(x, y, 60, 50, 14)) return stone(x, y)
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4
      if (disk(x, y, 60 + 24 * Math.cos(a), 50 + 24 * Math.sin(a), 6)) return WHITE
    }
    if (disk(x, y, 60, 50, 31)) return GOLD
    return GREY
  })
const blueStone = (x: number, y: number): Px => ((x + y) % 7 === 0 ? WHITE : BLUE)
const whiteDiamond = (x: number, y: number): Px => ((x * 3 + y) % 5 < 2 ? [250, 250, 250] : (x + y) % 3 ? [150, 152, 154] : [40, 40, 42])
const blueHint = { odcien: [165, 285] as [number, number], chroma_min: 10 }
const count = (mask: Uint8Array) => mask.reduce((s, v) => s + (v ? 1 : 0), 0)

describe('Y.2: maska kamienia z oryginału', () => {
  const original = ring(blueStone)

  it('cały niebieski kamień z odblaskami, bez białego halo i bez tła', () => {
    const found = originalStoneMask(original, W, H, blueHint, hintRegion(W, H, blueHint), 'jeden', 1)!
    expect(found).not.toBeNull()
    const at = (x: number, y: number) => found.mask[y * W + x] > 0
    expect(at(60, 50)).toBe(true)
    expect(at(49, 50)).toBe(true) // brzeg kamienia
    expect(at(60 + 24, 50)).toBe(false) // kamień halo
    expect(at(5, 5)).toBe(false)
    // ~ π·14² (+ poszerzenie o 1 px)
    expect(count(found.mask)).toBeGreaterThan(Math.PI * 13 * 13)
    expect(count(found.mask)).toBeLessThan(Math.PI * 16 * 16)
  })

  it('ręczny obszar ogranicza szukanie; poza nim kamienia nie ma', () => {
    const hint = { ...blueHint, obszar: [0, 0, 0.2, 0.2] as [number, number, number, number] }
    expect(originalStoneMask(original, W, H, hint, hintRegion(W, H, hint))).toBeNull()
  })

  it('„wiele”: dwie plamy koloru (korona i pawilon z boku) dostają osobne obrysy, oprawa między nimi zostaje', () => {
    const side = image((x, y) => (disk(x, y, 40, 30, 8) || disk(x, y, 40, 70, 8) ? BLUE : GOLD))
    const found = originalStoneMask(side, W, H, blueHint, hintRegion(W, H, blueHint), 'wiele', 0)!
    expect(found.mask[30 * W + 40]).toBe(255)
    expect(found.mask[70 * W + 40]).toBe(255)
    expect(found.mask[50 * W + 40]).toBe(0)
  })

  it('odcień przez zero (róż/czerwień)', () => {
    expect(inHue(350, [330, 40])).toBe(true)
    expect(inHue(20, [330, 40])).toBe(true)
    expect(inHue(80, [330, 40])).toBe(false)
  })

  it('wycinek: kwadrat wokół kamienia, w kadrze, z marginesem', () => {
    const found = originalStoneMask(original, W, H, blueHint, hintRegion(W, H, blueHint))!
    const box = cropBox(found.mask, W, 1200, 1000, 0.6, 64)
    expect(box.width).toBe(box.height)
    expect(box.left).toBeGreaterThanOrEqual(0)
    expect(box.top + box.height).toBeLessThanOrEqual(1000)
    // kamień ~300 px w pełnej rozdzielczości → bok ~ 300 · 2,2
    expect(box.width).toBeGreaterThan(550)
    expect(box.width).toBeLessThan(800)
    // przy krawędzi kadru: przesunięty do środka, nie ucięty
    const edge = new Uint8Array(W * H)
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) edge[y * W + x] = 255
    expect(cropBox(edge, W, 1200, 1000, 0.6, 64)).toMatchObject({ left: 0, top: 0 })
  })
})

describe('Y.2: kontrola automatyczna wycinka', () => {
  const original = ring(blueStone)
  const mask = originalStoneMask(original, W, H, blueHint, hintRegion(W, H, blueHint), 'jeden', 1)!.mask
  const inMask = (x: number, y: number) => mask[y * W + x] > 0
  const paste = (generated: Uint8Array) => {
    const out = original.slice()
    for (let i = 0; i < W * H; i++) if (mask[i]) out.set(generated.subarray(i * 3, i * 3 + 3), i * 3)
    return out
  }
  const verify = (result: Uint8Array, generated: Uint8Array, white = true) =>
    verifyCutout({ original, result, generated, mask, width: W, height: H, feather: 1 }, blueHint.odcien, white ? { bialy: true } : undefined)

  it('biały diament w masce, reszta z oryginału → przechodzi (jasny, bezbarwny, z kontrastem)', () => {
    const generated = ring(whiteDiamond)
    const v = verify(paste(generated), generated)
    expect(v.reasons_pl).toEqual([])
    expect(v.ok).toBe(true)
    expect(v.outsideChanged).toBe(0)
    expect(v.inside.chroma).toBeLessThan(9)
  })

  it('resztki niebieskiego w kamieniu → odrzut', () => {
    const generated = ring((x, y) => (x < 56 ? BLUE : whiteDiamond(x, y)))
    const v = verify(paste(generated), generated)
    expect(v.ok).toBe(false)
    expect(v.reasons_pl.join(' ')).toMatch(/starego koloru/)
  })

  it('szary, płaski kamień → odrzut (biel ma być jasna i z blaskiem)', () => {
    const generated = ring(() => [120, 120, 121])
    const v = verify(paste(generated), generated)
    expect(v.ok).toBe(false)
    expect(v.reasons_pl.join(' ')).toMatch(/ciemny|płaski/)
  })

  it('zmiana poza maską → odrzut', () => {
    const generated = ring(whiteDiamond)
    const result = paste(generated)
    for (let i = 0; i < 400; i++) result.set([255, 0, 0], i * 3)
    expect(verify(result, generated).reasons_pl.join(' ')).toMatch(/poza maską/)
  })

  it('generator przesunął oprawę wokół kamienia → odrzut (na granicy byłby szew)', () => {
    const shifted = image((x, y) => {
      const sx = x - 7
      if (disk(sx, y, 60, 50, 14)) return whiteDiamond(x, y)
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4
        if (disk(sx, y, 60 + 24 * Math.cos(a), 50 + 24 * Math.sin(a), 6)) return WHITE
      }
      return disk(sx, y, 60, 50, 31) ? GOLD : GREY
    })
    const v = verify(paste(shifted), shifted)
    expect(v.ok).toBe(false)
    expect(v.reasons_pl.join(' ')).toMatch(/oprawę/)
    expect(inMask(60, 50)).toBe(true)
  })

  it('kolorowy kamień: odcień docelowy (rubin) zamiast kryterium bieli', () => {
    const generated = ring(() => [150, 20, 40])
    const ok = verifyCutout(
      { original, result: paste(generated), generated, mask, width: W, height: H, feather: 1 },
      blueHint.odcien,
      { odcien: [335, 45], chroma_min: 18 },
    )
    expect(ok.ok).toBe(true)
    const green = ring(() => [30, 120, 60])
    const bad = verifyCutout(
      { original, result: paste(green), generated: green, mask, width: W, height: H, feather: 1 },
      blueHint.odcien,
      { odcien: [335, 45], chroma_min: 18 },
    )
    expect(bad.ok).toBe(false)
  })
})

describe('Y.2: konfiguracja i prompty wycinka', () => {
  const config = loadConfig()

  it('Cyane i Aion generują w wycinku; Cyane z boku (zdjęcie 3) ma osobne plamy; Aion dostał biały diament', () => {
    const cyane = jobs(config, ['cyane-bialy-diament'])
    expect(cyane).toHaveLength(4)
    for (const job of cyane) expect(job.hint?.odcien).toEqual([165, 285])
    expect(cyane.find((j) => j.photo === 3)?.hint?.maska).toBe('wiele')
    expect(cyane.find((j) => j.photo === 2)?.hint?.maska).toBeUndefined()
    const [aionWhite] = jobs(config, ['aion-bialy-diament'])
    expect(aionWhite.hint).toMatchObject({ odcien: [330, 40], maska: 'wiele' })
    expect(config.kamienie['bialy-diament'].kontrola).toEqual({ bialy: true })
    // Daphne bez podpowiedzi: zostaje stara technika (maska z różnicy).
    expect(jobs(config, ['daphne-rubin'])[0].hint).toBeUndefined()
  })

  it('prompt wycinka: zbliżenie, tylko kamień, dla bieli „jasny, bez niebieskiego”', () => {
    const description = { centre_stone_en: 'round brilliant blue diamond in six prongs', other_stones_en: 'white diamond halo', metal_en: 'yellow gold', notes_pl: '' }
    const [job] = jobs(config, ['cyane-bialy-diament'])
    const prompt = cutoutPrompt(job, description, 2, 'too grey')
    expect(prompt).toContain('square close-up crop')
    expect(prompt).toContain('Only the stone area of your result will be pasted back')
    expect(prompt).toContain('BRIGHT')
    expect(prompt).toContain('no blue or teal')
    expect(prompt).toContain('Previous attempt was rejected: too grey')
    const check = cutoutCheckPrompt(job, 4)
    expect(check).toContain('jasny, bezbarwny, z ogniem')
    expect(check).toContain('NIE podobieństwem do oryginału')
    const [ruby] = jobs(config, ['aion-rubin'])
    expect(cutoutPrompt(ruby, description, 2)).not.toContain('BRIGHT')
    expect(cutoutCheckPrompt(ruby, 2)).not.toContain('z ogniem')
  })
})

describe('Y.2: film przy wariancie i dopisek pod kółkami', () => {
  it('podpis filmu: „Na filmie kamień: <kamień główny>”, pierwsza litera mała, bez „oryginał”', () => {
    expect(originalFilmCaption('Diament niebieski')).toBe('Na filmie kamień: diament niebieski')
    expect(originalFilmCaption('Diament niebieski, diamenty')).toBe('Na filmie kamień: diament niebieski')
    expect(originalFilmCaption('Topaz London Blue i diamenty')).toBe('Na filmie kamień: topaz London Blue i diamenty')
    expect(originalFilmCaption('')).toBe('Na filmie kamień ze zdjęć')
  })

  it('kółko kamienia ze zdjęć: nazwa kamienia (jak pozostałe), nie „Oryginał”', () => {
    expect(mainStoneName('Diament niebieski, diamenty')).toBe('Diament niebieski')
    expect(mainStoneName('  Topaz London Blue i diamenty ')).toBe('Topaz London Blue i diamenty')
    expect(photographedStoneLabel('Diament niebieski, diamenty')).toBe('Diament niebieski, diamenty – kamień ze zdjęć')
    expect(photographedStoneLabel('')).toBe('Kamień ze zdjęć')
  })

  it('dopisek: jeden tekst o kamieniach naturalnych', () => {
    expect(STONE_VARIANTS_NOTE).toMatch(/^Wizualizacje pokazują kolor kamienia\./)
    expect(STONE_VARIANTS_NOTE).toContain('przed zamówieniem pokażemy Ci zdjęcie lub film kamienia')
  })
})

describe('dopisek pod kółkami zależy od rodzaju wariantów', () => {
  it('karta z wizualizacją dostaje zdanie o wizualizacjach', () => {
    expect(stoneVariantsNote([{ isVisualization: false }, { isVisualization: true }])).toBe(
      `${PHOTOGRAPHED_STONE_NOTE} ${STONE_VARIANTS_NOTE}`,
    )
  })
  it('karta z samymi prawdziwymi zdjęciami (Urania) dostaje tylko zdanie o kamieniach naturalnych', () => {
    const note = stoneVariantsNote([{ isVisualization: false }, { isVisualization: false }])
    expect(note).toBe(`${PHOTOGRAPHED_STONE_NOTE} ${STONE_VARIANTS_NOTE_NATURAL}`)
    expect(note).not.toMatch(/Wizualizacje/)
  })
})

describe('poprawka bez generatora (stoneFix)', () => {
  const GREEN: Px = [40, 150, 90]
  const PURPLE: Px = [150, 60, 150]
  const NAVY: Px = [10, 12, 40]
  const mask = Uint8Array.from({ length: W * H }, (_, i) => (disk(i % W, Math.floor(i / W), 60, 50, 20) ? 1 : 0))
  const hueAt = (rgb: Uint8Array, x: number, y: number) => lch(rgb.subarray((y * W + x) * 3, (y * W + x) * 3 + 3), 1).H[0]

  it('Lab → RGB odwraca RGB → Lab', () => {
    for (const px of [GREEN, PURPLE, NAVY, GOLD, WHITE]) {
      expect(labToRgb(...rgbToLab(...px)).map((v, i) => Math.abs(v - px[i]) <= 1)).toEqual([true, true, true])
    }
  })

  it('stary kolor tuż za maską dostaje odcień kamienia; dalej obraz bez zmian', () => {
    // zielony kamień, fioletowy pas 5 px za maską (rondysta), dalej fioletowa plama poza pasem (promień pasu 6 px)
    const result = image((x, y) => (disk(x, y, 60, 50, 20) ? GREEN : disk(x, y, 60, 50, 25) ? PURPLE : x < 8 ? PURPLE : GREY))
    const options = { ...stoneFixOptions('szmaragd-stonowany', [285, 360], 1), bandFrac: 0.3 }
    const { rgb, band, stats } = stoneFix(result, result, mask, W, H, options)
    expect(stats.spillPx).toBeGreaterThan(0)
    expect(Math.abs(stats.targetHue - hueAt(result, 60, 50))).toBeLessThan(10)
    expect(Math.abs(hueAt(rgb, 82, 50) - stats.targetHue)).toBeLessThan(15)
    expect(band[2 * W + 2]).toBe(0)
    for (let i = 0; i < W * H; i++) if (!band[i]) expect([rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]]).toEqual([...result.subarray(i * 3, i * 3 + 3)])
  })

  it('szafir granatowy: mediana L w masce podniesiona do celu', () => {
    const result = image((x, y) => (disk(x, y, 60, 50, 20) ? NAVY : GREY))
    const strong = stoneFix(result, result, mask, W, H, stoneFixOptions('szafir-granatowy', [265, 340], 2))
    expect(strong.stats.lift?.[0]).toBeLessThan(10)
    expect(strong.stats.lift?.[1]).toBeCloseTo(14, 0)
  })

  it('weryfikacja z pasem: zmiana w pasie dozwolona, poza nim nie', () => {
    const original = image((x, y) => (disk(x, y, 60, 50, 20) ? BLUE : GREY))
    const changed = image((x, y) => (disk(x, y, 60, 50, 20) ? GREEN : disk(x, y, 60, 50, 24) ? WHITE : GREY))
    const band = Uint8Array.from({ length: W * H }, (_, i) => (disk(i % W, Math.floor(i / W), 60, 50, 25) ? 1 : 0))
    const input = { original, result: changed, generated: changed, mask: Uint8Array.from(mask, (v) => v * 255), width: W, height: H, feather: 1 }
    expect(verifyCutout(input, [180, 240], undefined).ok).toBe(false)
    expect(verifyCutout({ ...input, band }, [180, 240], undefined).ok).toBe(true)
  })
})
