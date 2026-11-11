/**
 * Prototyp (bez Codexa): Celaeno, zdjęcie 1 – drobne bezbarwne diamenty pavé przemalowane lokalnie w Lab na szafir
 * granatowy (`colourlessMask` + `recolourColourless`). Pasy rzędów pavé wyznaczone ręcznie na zdjęciu 1024×683.
 * Wynik: `seed/warianty/kandydaci/celaeno-szafir-prototyp-*.webp` (porównanie, zbliżenie, maska, wynik). Nic nie przyjmuje.
 *
 *   node --import=tsx/esm scripts/wizualizacje-celaeno-prototyp.ts --dane /Volumes/crucial/projects/pznowak-cms/data
 */
import { mkdirSync } from 'node:fs'
import path from 'node:path'

import sharp, { type Sharp } from 'sharp'

import { WARIANTY_DIR } from './warianty-v-logic'
import { firstExisting, loadConfig, REPO_ROOT } from './wizualizacje-w-logic'
import { colourlessMask, lch, type PaveStrip, recolourColourless, referenceColour, stripMask } from './wizualizacje-wycinek-logic'

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
  { punkty: [px(386, 318), px(366, 400), px(352, 480), px(346, 560), px(350, 612)], szerokosc: 13 / W }, // lewy brzeg
  { punkty: [px(526, 172), px(513, 250), px(506, 335)], szerokosc: 13 / W }, // górna żyłka
  { punkty: [px(520, 342), px(560, 330), px(620, 313), px(692, 284)], szerokosc: 15 / W }, // środkowa żyłka
  { punkty: [px(418, 594), px(480, 576), px(550, 558), px(620, 538), px(668, 518)], szerokosc: 17 / W }, // dolny rząd
]

const source = firstExisting(dataDir, ['legacy/jewelry/1-28-1024x683.jpg'])!
const rgb = await sharp(source).removeAlpha().raw().toBuffer()
const meta = await sharp(source).metadata()
if (meta.width !== W || meta.height !== H) throw new Error(`oczekuję 1024×683, jest ${meta.width}×${meta.height}`)

// kolor docelowy: wzorce szafiru granatowego z konfiguracji (średnia odcienia i nasycenia)
const stone = loadConfig().kamienie['szafir-granatowy']
const colours = []
for (const w of stone.wzorce) {
  const file = firstExisting(dataDir, w.pliki)
  if (!file) continue
  const ref = await sharp(file).resize({ width: 600 }).removeAlpha().raw({}).toBuffer({ resolveWithObject: true })
  colours.push(referenceColour(ref.data, ref.info.width * ref.info.height, [200, 320]))
}
const target = { hue: colours.reduce((s, c) => s + c.hue, 0) / colours.length, chroma: colours.reduce((s, c) => s + c.chroma, 0) / colours.length }

const maskOptions = { chromaMax: Number(arg('--chroma') ?? 10), density: Number(arg('--gestosc') ?? 0.35), radius: Number(arg('--promien') ?? 3), grow: Number(arg('--poszerz') ?? 2) }
const mask = colourlessMask(rgb, W, H, CELAENO_1_STRIPS, maskOptions)
// granat: ciemniej niż 12 + 0.45·L (przy L ≈ 58 w masce wychodził chabrowy, 8 + 0.38·L – królewski), nasycenie 0.8 wzorca – bez neonu
const recolour = { a: Number(arg('--a') ?? 5), b: Number(arg('--b') ?? 0.32) }
const chromaScale = Number(arg('--nasycenie') ?? 0.8)
const result = recolourColourless(rgb, mask, W, H, { hue: target.hue, chroma: target.chroma * chromaScale }, recolour)

// statystyki maski: kamienie (spójne plamy), złoto w masce
const { L, C, H: hue } = lch(rgb, W * H)
let goldInMask = 0
let maskPx = 0
for (let i = 0; i < W * H; i++) {
  if (!mask[i]) continue
  maskPx++
  if (C[i] >= 15 && hue[i] >= 55 && hue[i] <= 100) goldInMask++
}
const seen = new Uint8Array(W * H)
const blobs: number[] = []
for (let s = 0; s < W * H; s++) {
  if (!mask[s] || seen[s]) continue
  let size = 0
  const stack = [s]
  seen[s] = 1
  while (stack.length) {
    const p = stack.pop()!
    size++
    for (const q of [p - 1, p + 1, p - W, p + W]) {
      if (q < 0 || q >= W * H || !mask[q] || seen[q]) continue
      seen[q] = 1
      stack.push(q)
    }
  }
  blobs.push(size)
}
const meanL = (on: (i: number) => boolean) => {
  let s = 0
  let k = 0
  for (let i = 0; i < W * H; i++) {
    if (!on(i)) continue
    s += L[i]
    k++
  }
  return k ? s / k : 0
}

const raw = { width: W, height: H, channels: 3 } as const
const save = (buf: Uint8Array | Buffer, name: string, op: (s: Sharp) => Sharp = (s) => s) =>
  op(sharp(Buffer.from(buf), { raw })).webp({ quality: 82 }).toFile(path.join(outDir, `celaeno-szafir-prototyp-${name}.webp`))

// nakładka: maska na czerwono, granice pasów na żółto
const overlay = Uint8Array.from(rgb)
const zone = stripMask(W, H, CELAENO_1_STRIPS)
for (let i = 0; i < W * H; i++) {
  const x = i % W
  if (mask[i]) overlay.set([255, 30, 30], i * 3)
  else if (zone[i] && ((x > 0 && !zone[i - 1]) || (x < W - 1 && !zone[i + 1]) || !zone[i - W] || !zone[i + W])) overlay.set([255, 220, 0], i * 3)
}
await save(result, 'wynik')
await save(overlay, 'maska')
const side = async (a: Uint8Array | Buffer, b: Uint8Array | Buffer, box: { left: number; top: number; width: number; height: number }, scale: number, name: string) => {
  const w = Math.round(box.width * scale)
  const h = Math.round(box.height * scale)
  const tile = (buf: Uint8Array | Buffer) => sharp(Buffer.from(buf), { raw }).extract(box).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer()
  await sharp({ create: { width: w * 2 + 8, height: h, channels: 3, background: '#ffffff' } })
    .composite([{ input: await tile(a), left: 0, top: 0 }, { input: await tile(b), left: w + 8, top: 0 }])
    .webp({ quality: 82 })
    .toFile(path.join(outDir, `celaeno-szafir-prototyp-${name}.webp`))
}
await side(rgb, result, { left: 0, top: 0, width: W, height: H }, 0.6, 'porownanie')
await side(rgb, result, { left: 410, top: 260, width: 300, height: 360 }, 1.8, 'zblizenie')

console.log(
  `szafir docelowy: odcień ${target.hue.toFixed(0)}°, C ${target.chroma.toFixed(1)} (wzorce: ${colours.map((c) => `${c.hue}°/${c.chroma.toFixed(0)}`).join(', ')})\n` +
    `maska: ${maskPx} px, plam ${blobs.length} (≥ 6 px: ${blobs.filter((b) => b >= 6).length}, mediana ${blobs.sort((a, b) => a - b)[Math.floor(blobs.length / 2)]} px), złoto w masce: ${goldInMask} px\n` +
    `L w masce: przed ${meanL((i) => mask[i] === 1).toFixed(1)}, po ≈ ${(recolour.a + recolour.b * meanL((i) => mask[i] === 1)).toFixed(1)}; L' = ${recolour.a} + ${recolour.b}·L, C × ${chromaScale}`,
)
console.log(`zapisano: ${path.relative(REPO_ROOT, outDir)}/celaeno-szafir-prototyp-{wynik,maska,porownanie,zblizenie}.webp`)
