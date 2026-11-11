/**
 * Prototyp (bez Codexa): Celaeno, zdjęcie 1 – drobne bezbarwne diamenty pavé przemalowane lokalnie w Lab na kolorowe
 * kamienie. Pasy rzędów pavé wyznaczone ręcznie na zdjęciu 1024×683; plamy bezbarwne (`colourlessMask`) → koła kamieni
 * z uzupełnionymi brakami wzdłuż rzędu (`paveStones`) → przemalowanie (`recolourColourless`).
 * Wynik: `seed/warianty/kandydaci/celaeno-<kamień>-prototyp-*.webp` (porównanie, zbliżenie, wynik) i wspólne
 * `celaeno-kamienie-prototyp-{maska,numery}.webp`. Nic nie przyjmuje.
 *
 *   node --import=tsx/esm scripts/wizualizacje-celaeno-prototyp.ts --dane /Volumes/crucial/projects/pznowak-cms/data [--kamienie szafir-granatowy,szmaragd-stonowany,rubin]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

import { WARIANTY_DIR } from './warianty-v-logic'
import { firstExisting, loadConfig, REPO_ROOT } from './wizualizacje-w-logic'
import {
  colourlessMask,
  type HueRange,
  type PaveStrip,
  paveStones,
  recolourColourless,
  referenceColour,
  stoneCircleMask,
  stripMask,
} from './wizualizacje-wycinek-logic'

const arg = (name: string) => {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const dataDir = path.resolve(arg('--dane') ?? path.join(REPO_ROOT, 'data'))
const outDir = path.join(WARIANTY_DIR, 'kandydaci')
mkdirSync(outDir, { recursive: true })

const W = 1024
const H = 683
const px = (x: number, y: number): [number, number] => [x / W, y / H]
/** Rzędy pavé na zdjęciu 1 (piksele 1024×683 → ułamki). */
export const CELAENO_1_STRIPS: PaveStrip[] = [
  // lewy brzeg: linia przez środki kamieni z powiększenia (y 340–490), niżej sama oprawa z kulkami
  { punkty: [px(380, 318), px(374, 342), px(365, 368), px(356, 402), px(352, 434), px(349, 467), px(346, 520), px(346, 560), px(350, 612)], szerokosc: 11 / W, odchylenie: 0.6 },
  { punkty: [px(526, 172), px(513, 250), px(506, 335)], szerokosc: 13 / W, odchylenie: 0.6 }, // górna żyłka
  { punkty: [px(520, 342), px(560, 330), px(620, 313), px(692, 284)], szerokosc: 15 / W, odchylenie: 0.6 }, // środkowa żyłka
  { punkty: [px(418, 594), px(480, 576), px(550, 558), px(620, 538), px(668, 518)], szerokosc: 17 / W, odchylenie: 0.6 }, // dolny rząd
]

/** Kolory: zakres odcienia wzorca (tło wzorca bywa nasycone) i jasność L' = a + b·L, mnożnik nasycenia. */
const STONES: Record<string, { range: HueRange; a: number; b: number; chroma: number; name: string }> = {
  'szafir-granatowy': { range: [200, 320], a: 5, b: 0.32, chroma: 0.8, name: 'szafir granatowy' },
  // spokojny, średnio-ciemny
  'szmaragd-stonowany': { range: [120, 210], a: 14, b: 0.34, chroma: 0.7, name: 'szmaragd stonowany' },
  // głęboki, lekko purpurowy; wzorce mają niskie C (ciemne zdjęcia), przy × 0.9 wychodził śliwkowy
  rubin: { range: [330, 40], a: 8, b: 0.32, chroma: 1.5, name: 'rubin' },
}
const wanted = (arg('--kamienie') ?? 'szafir-granatowy').split(',').filter(Boolean)

const source = firstExisting(dataDir, ['legacy/jewelry/1-28-1024x683.jpg'])!
const rgb = await sharp(source).removeAlpha().raw().toBuffer()
const meta = await sharp(source).metadata()
if (meta.width !== W || meta.height !== H) throw new Error(`oczekuję 1024×683, jest ${meta.width}×${meta.height}`)

const blobs = colourlessMask(rgb, W, H, CELAENO_1_STRIPS, { chromaMax: 10, density: 0.35, radius: 3, grow: 2 })
const { stones, before, after, skipped } = paveStones(rgb, blobs, W, H, CELAENO_1_STRIPS)
const mask = stoneCircleMask(rgb, stones, W, H)
const ROWS = ['lewy brzeg', 'górna żyłka', 'środkowa żyłka', 'dolny rząd']

const raw = { width: W, height: H, channels: 3 } as const
const out = (name: string) => path.join(outDir, `celaeno-${name}.webp`)

// nakładka: koła kamieni (zielone – z maski, niebieskie – dodane w przerwach) z numerami w rzędzie, granice pasów
const zone = stripMask(W, H, CELAENO_1_STRIPS)
const base = Uint8Array.from(rgb)
for (let i = 0; i < W * H; i++) {
  const x = i % W
  if (zone[i] && ((x > 0 && !zone[i - 1]) || (x < W - 1 && !zone[i + 1]) || !zone[i - W] || !zone[i + W])) base.set([255, 220, 0], i * 3)
}
const counters = CELAENO_1_STRIPS.map(() => 0)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${stones
  .map((st) => {
    const k = ++counters[st.strip]
    const colour = st.added ? '#22b8ff' : '#3dff6a'
    return `<circle cx="${st.x.toFixed(1)}" cy="${st.y.toFixed(1)}" r="${st.r.toFixed(1)}" fill="none" stroke="${colour}" stroke-width="1"/><text x="${(st.x + st.r + 1).toFixed(0)}" y="${(st.y - st.r).toFixed(0)}" font-family="sans-serif" font-size="8" fill="${colour}">${st.strip + 1}.${k}</text>`
  })
  .join('')}</svg>`
const numbered = await sharp(Buffer.from(base), { raw }).composite([{ input: Buffer.from(svg) }]).png().toBuffer()
await sharp(numbered).extract({ left: 320, top: 150, width: 400, height: 480 }).resize(800, 960, { kernel: 'lanczos3' }).webp({ quality: 84 }).toFile(out('kamienie-prototyp-numery'))
const overlay = Uint8Array.from(rgb)
for (let i = 0; i < W * H; i++) if (mask[i]) overlay.set([255, 30, 30], i * 3)
await sharp(Buffer.from(overlay), { raw }).webp({ quality: 82 }).toFile(out('kamienie-prototyp-maska'))

const side = async (a: Uint8Array | Buffer, b: Uint8Array | Buffer, box: { left: number; top: number; width: number; height: number }, scale: number, file: string) => {
  const w = Math.round(box.width * scale)
  const h = Math.round(box.height * scale)
  const tile = (buf: Uint8Array | Buffer) => sharp(Buffer.from(buf), { raw }).extract(box).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer()
  await sharp({ create: { width: w * 2 + 8, height: h, channels: 3, background: '#ffffff' } })
    .composite([{ input: await tile(a), left: 0, top: 0 }, { input: await tile(b), left: w + 8, top: 0 }])
    .webp({ quality: 82 })
    .toFile(file)
}

const config = loadConfig()
const summary: { rows: { name: string; blobs: number; stones: number }[]; skipped: number; stones: { key: string; name: string; hue: number; chroma: number; a: number; b: number }[] } = {
  rows: ROWS.map((name, i) => ({ name, blobs: before[i], stones: after[i] })),
  skipped: skipped.length,
  stones: [],
}
for (const key of wanted) {
  const spec = STONES[key]
  if (!spec) throw new Error(`nieznany kamień ${key} (${Object.keys(STONES).join(', ')})`)
  const colours = []
  for (const w of config.kamienie[key].wzorce) {
    const file = firstExisting(dataDir, w.pliki)
    if (!file) continue
    const ref = await sharp(file).resize({ width: 600 }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    colours.push(referenceColour(ref.data, ref.info.width * ref.info.height, spec.range))
  }
  // średnia kołowa odcienia (rubin przechodzi przez 0°)
  const hx = colours.reduce((s, c) => s + Math.cos((c.hue * Math.PI) / 180), 0)
  const hy = colours.reduce((s, c) => s + Math.sin((c.hue * Math.PI) / 180), 0)
  const target = {
    hue: (((Math.atan2(hy, hx) * 180) / Math.PI) + 360) % 360,
    chroma: (colours.reduce((s, c) => s + c.chroma, 0) / colours.length) * spec.chroma,
  }
  const result = recolourColourless(rgb, mask, W, H, target, { a: spec.a, b: spec.b })
  const short = key.split('-')[0]
  await sharp(Buffer.from(result), { raw }).webp({ quality: 82 }).toFile(out(`${short}-prototyp-wynik`))
  await side(rgb, result, { left: 0, top: 0, width: W, height: H }, 0.6, out(`${short}-prototyp-porownanie`))
  await side(rgb, result, { left: 320, top: 160, width: 400, height: 470 }, 1.4, out(`${short}-prototyp-zblizenie`))
  summary.stones.push({ key: short, name: spec.name, hue: Math.round(target.hue), chroma: Number(target.chroma.toFixed(1)), a: spec.a, b: spec.b })
  console.log(`${spec.name}: odcień ${target.hue.toFixed(0)}°, C ${target.chroma.toFixed(1)} (wzorce ${colours.map((c) => `${c.hue}°/${c.chroma.toFixed(0)}`).join(', ')}), L' = ${spec.a} + ${spec.b}·L`)
}
writeFileSync(path.join(outDir, 'celaeno-prototyp.json'), `${JSON.stringify(summary, null, 1)}\n`)
console.log(`kamienie na rząd (przed → po): ${ROWS.map((name, i) => `${name} ${before[i]} → ${after[i]}`).join(', ')}; dodane w przerwach: ${stones.filter((s) => s.added).length}; maska ${mask.reduce((s, v) => s + v, 0)} px`)
if (arg('--debug') !== undefined) {
  for (const st of stones) console.log(`  rząd ${st.strip + 1}: (${st.x.toFixed(0)}, ${st.y.toFixed(0)}) r ${st.r.toFixed(1)} od linii ${st.off.toFixed(1)}${st.added ? ' dodany' : ''}`)
  for (const sk of skipped) console.log(`  rząd ${sk.strip + 1}: luka (${sk.x.toFixed(0)}, ${sk.y.toFixed(0)}) pominięta – złoto ${(sk.gold * 100).toFixed(0)} %`)
}
console.log(`zapisano: ${path.relative(REPO_ROOT, outDir)}/celaeno-*-prototyp-*.webp`)
