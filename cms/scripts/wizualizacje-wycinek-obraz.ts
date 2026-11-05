/**
 * Zlecenie Y.2: operacje na plikach dla wizualizacji „w wycinku” (patrz `wizualizacje-wycinek-logic.ts`): maska kamienia
 * z oryginału, kwadratowy wycinek dla generatora, wklejenie wyniku tylko w masce i dane do weryfikacji. Bez modeli.
 */
import sharp from 'sharp'

import { align, coverCrop } from './wizualizacje-w-logic'
import {
  type Box,
  cropBox,
  growMask,
  hintRegion,
  type HueRange,
  type OriginalStoneHint,
  originalStoneMask,
  type StoneCheck,
  verifyCutout,
} from './wizualizacje-wycinek-logic'

/** Szerokość, w której liczymy maskę oryginału (jak maska fasonu z W). */
export const MASK_WIDTH = 600
/**
 * Poszerzenie maski oryginału (px w `MASK_WIDTH`): rondysta kamienia pod łapkami ma stary kolor, a plamy koloru
 * kończą się przed krawędzią szlifu – przy 2 px Terra widziała turkusowy ślad na dolnym styku (Cyane, zdjęcie 2).
 */
export const MASK_GROW = 4
/** Generator dostaje wycinek co najmniej tej wielkości (powiększony, jeśli kamień jest mały). */
const CUTOUT_MIN_PX = 1024
/** Weryfikacja na wycinku w tej rozdzielczości. */
const VERIFY_PX = 384

const rgbRaw = (input: string | Buffer, width: number, height: number, raw?: { width: number; height: number; channels: 3 }) =>
  sharp(input, raw ? { raw } : undefined).resize(width, height, { fit: 'fill' }).removeAlpha().raw().toBuffer()

/** Maska kamienia oryginału w szerokości `MASK_WIDTH` (0/255) albo null. `prior` – maska fasonu (obszar podpowiedzi). */
export async function originalMask(source: string, hint: OriginalStoneHint, prior: Uint8Array | null, mode: 'jeden' | 'wiele' = 'jeden') {
  const meta = await sharp(source).metadata()
  const width = MASK_WIDTH
  const height = Math.round((width * meta.height!) / meta.width!)
  const rgb = await rgbRaw(source, width, height)
  const usablePrior = prior && prior.length === width * height ? prior : null
  const found = originalStoneMask(rgb, width, height, hint, hintRegion(width, height, hint, usablePrior), hint.maska ?? mode, MASK_GROW)
  return found && { ...found, width, height }
}

/** Podgląd maski do raportu: oryginał z czerwonym obrysem maski i ramką wycinka. */
export async function maskPreview(source: string, mask: Uint8Array, width: number, box: Box, output: string) {
  const height = mask.length / width
  const meta = await sharp(source).metadata()
  const rgb = Buffer.from(await rgbRaw(source, width, height))
  const sx = width / meta.width!
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue
    const x = i % width
    const edge = (x > 0 && !mask[i - 1]) || (x < width - 1 && !mask[i + 1]) || !mask[i - width] || !mask[i + width]
    if (edge) rgb.set([255, 40, 40], i * 3)
  }
  const [x0, y0] = [Math.round(box.left * sx), Math.round(box.top * sx)]
  const [x1, y1] = [Math.min(width - 1, Math.round((box.left + box.width) * sx)), Math.min(height - 1, Math.round((box.top + box.height) * sx))]
  for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) rgb.set([255, 210, 0], (y * width + x) * 3)
  for (let y = y0; y <= y1; y++) for (const x of [x0, x1]) rgb.set([255, 210, 0], (y * width + x) * 3)
  await sharp(rgb, { raw: { width, height, channels: 3 } }).jpeg({ quality: 82 }).toFile(output)
}

/** Wycinek dla generatora: kwadrat wokół maski z oryginału w pełnej rozdzielczości, powiększony do ≥ 1024 px. */
export async function makeCutout(source: string, mask: Uint8Array, maskWidth: number, output: string) {
  const meta = await sharp(source).metadata()
  const box = cropBox(mask, maskWidth, meta.width!, meta.height!)
  const side = Math.max(box.width, CUTOUT_MIN_PX)
  await sharp(source).extract(box).resize(side, side, { kernel: 'lanczos3' }).png().toFile(output)
  return box
}

/**
 * Wynik generatora (dla wycinka `box`) z powrotem do zdjęcia: dopasowanie (skala ±8 %, przesunięcie ±10 %),
 * wklejenie tylko w masce z miękką krawędzią, reszta kadru z oryginału. Zwraca weryfikację automatyczną, dopasowanie
 * i wycinki (oryginał / wynik) do oceny Terry.
 */
export async function pasteCutout(
  args: {
    source: string
    generated: string
    box: Box
    mask: Uint8Array
    maskWidth: number
    output: string
    /** Zbliżenia do oceny modelu (png, ten sam kadr co wycinek). */
    closeOriginal: string
    closeResult: string
  },
  originalHue: HueRange,
  check: StoneCheck | undefined,
) {
  const { source, generated, box, mask, maskWidth, output } = args
  const meta = await sharp(source).metadata()
  const W = meta.width!
  const H = meta.height!
  const side = box.width
  const raw = { width: side, height: side, channels: 3 } as const

  const genMeta = await sharp(generated).metadata()
  const square = coverCrop({ width: genMeta.width!, height: genMeta.height! }, 1)
  const gen = await sharp(generated).extract(square).resize(side, side, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  const orig = await sharp(source).extract(box).removeAlpha().raw().toBuffer()

  // dopasowanie w skali szarości: zgrubnie 96 px, dokładnie 320 px
  const grey = (input: Buffer, size: number) => sharp(input, { raw }).resize(size, size, { fit: 'fill' }).greyscale().raw().toBuffer()
  const coarseScales = Array.from({ length: 9 }, (_, i) => 0.92 + i * 0.02)
  const coarse = align(await grey(orig, 96), await grey(gen, 96), 96, 96, coarseScales, 0.1)
  const fine = align(await grey(orig, 320), await grey(gen, 320), 320, 320, Array.from({ length: 9 }, (_, i) => coarse.scale - 0.016 + i * 0.004), 5 / 320, {
    scale: coarse.scale,
    dx: Math.round((coarse.dx * 320) / 96),
    dy: Math.round((coarse.dy * 320) / 96),
  })
  const f = side / 320
  const scaled = Math.round(side * fine.scale)
  const left = Math.round(fine.dx * f)
  const top = Math.round(fine.dy * f)
  const srcLeft = Math.max(0, -left)
  const srcTop = Math.max(0, -top)
  const piece = await sharp(gen, { raw })
    .resize(scaled, scaled, { fit: 'fill' })
    .extract({
      left: srcLeft,
      top: srcTop,
      width: Math.min(scaled - srcLeft, side - Math.max(0, left)),
      height: Math.min(scaled - srcTop, side - Math.max(0, top)),
    })
    .png()
    .toBuffer()
  // brzegi poza wynikiem generatora: oryginał (i tak leżą poza maską)
  const aligned = await sharp(orig, { raw }).composite([{ input: piece, left: Math.max(0, left), top: Math.max(0, top) }]).removeAlpha().raw().toBuffer()

  // maska w kadrze wycinka (pełna rozdzielczość), poszerzona o miękką krawędź, żeby rozmycie nie zostawiło starego koloru
  const maskHeight = mask.length / maskWidth
  const featherPx = Math.max(2, Math.round(side / 220))
  const fullMask = await sharp(Buffer.from(mask), { raw: { width: maskWidth, height: maskHeight, channels: 1 } })
    .resize(W, H, { fit: 'fill' })
    .extract(box)
    .threshold(128)
    .extractChannel(0)
    .raw()
    .toBuffer()
  const grown = growMask(Uint8Array.from(fullMask, (v) => (v ? 1 : 0)), side, featherPx)
  const alpha = await sharp(Buffer.from(grown.map((v) => (v ? 255 : 0))), { raw: { width: side, height: side, channels: 1 } })
    .blur(featherPx / 2)
    .extractChannel(0)
    .raw()
    .toBuffer()
  const overlay = await sharp(aligned, { raw }).joinChannel(alpha, { raw: { width: side, height: side, channels: 1 } }).png().toBuffer()
  const merged = await sharp(orig, { raw }).composite([{ input: overlay }]).removeAlpha().raw().toBuffer()
  await sharp(source)
    .composite([{ input: await sharp(merged, { raw }).png().toBuffer(), left: box.left, top: box.top }])
    .png()
    .toFile(output)

  const closeSide = Math.min(1024, Math.max(side, 512))
  await sharp(orig, { raw }).resize(closeSide, closeSide).png().toFile(args.closeOriginal)
  await sharp(merged, { raw }).resize(closeSide, closeSide).png().toFile(args.closeResult)

  // weryfikacja w 384 px: maska bez poszerzenia, margines = poszerzenie + rozmycie
  const v = VERIFY_PX
  const small = (input: Buffer) => sharp(input, { raw }).resize(v, v, { fit: 'fill' }).raw().toBuffer()
  const vMask = await sharp(Buffer.from(fullMask), { raw: { width: side, height: side, channels: 1 } })
    .resize(v, v, { fit: 'fill' })
    .threshold(128)
    .extractChannel(0)
    .raw()
    .toBuffer()
  const verdict = verifyCutout(
    {
      original: await small(orig),
      result: await small(merged),
      generated: await small(aligned),
      mask: new Uint8Array(vMask),
      width: v,
      height: v,
      feather: Math.ceil((featherPx * 2 * v) / side) + 1,
    },
    originalHue,
    check,
  )
  return {
    verdict,
    alignment: { scale: Number(fine.scale.toFixed(3)), dx: left, dy: top, cost: Number(fine.cost.toFixed(1)) },
  }
}
