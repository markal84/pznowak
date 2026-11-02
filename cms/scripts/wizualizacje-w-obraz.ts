/**
 * Operacje na obrazach dla wizualizacji kamieni (zlecenie W): dopasowanie wyniku generatora do oryginału, wycięcie
 * samego kamienia (reszta z oryginału), webp na stronę i dHash. Bez wywołań modeli – używa tego `wizualizacje-codex.ts`.
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

import { MAX_IMAGE_BYTES } from './warianty-v-logic'
import { align, coverCrop, dHashBits, stoneMask } from './wizualizacje-w-logic'

type Raw = { width: number; height: number; channels: 1 | 2 | 3 | 4 }

const grey = (input: string | Buffer, width: number, height: number, raw?: Raw) =>
  sharp(input, raw ? { raw } : undefined).resize(width, height, { fit: 'fill' }).greyscale().raw().toBuffer()

/**
 * Wynik generatora tylko w obszarze kamienia, reszta pikselami oryginału (pełna rozdzielczość, miękka krawędź maski).
 * Zwraca maskę (600 px szerokości), jej udział w kadrze i dopasowanie albo null, gdy zmiana nie układa się w jeden
 * kamień. `prior` – maska fasonu z przyjętego wariantu (patrz `stoneMask`).
 */
export async function composite(
  source: string,
  generated: string,
  output: string,
  prior?: Uint8Array | null,
  mode: 'jeden' | 'wiele' = 'jeden',
) {
  const { width, height } = await sharp(source).metadata()
  const W = width!
  const H = height!
  const genMeta = await sharp(generated).metadata()
  const crop = coverCrop({ width: genMeta.width!, height: genMeta.height! }, W / H)
  const genFull = await sharp(generated).extract(crop).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  const rawFull = { width: W, height: H, channels: 3 } as const

  // dopasowanie: zgrubnie (96 px, ±20 %, skala 0,85–1,15), potem dokładnie (384 px)
  const cw = 96
  const ch = Math.round((cw * H) / W)
  const coarseScales = Array.from({ length: 13 }, (_, i) => 0.85 + i * 0.025)
  const coarse = align(await grey(source, cw, ch), await grey(genFull, cw, ch, rawFull), cw, ch, coarseScales, 0.2)
  const fw = 384
  const fh = Math.round((fw * H) / W)
  const k = fw / cw
  const fineScales = Array.from({ length: 9 }, (_, i) => coarse.scale - 0.02 + i * 0.005)
  const fine = align(await grey(source, fw, fh), await grey(genFull, fw, fh, rawFull), fw, fh, fineScales, 6 / fw, {
    scale: coarse.scale,
    dx: Math.round(coarse.dx * k),
    dy: Math.round(coarse.dy * k),
  })

  const f = W / fw
  const sw = Math.round(W * fine.scale)
  const sh = Math.round(H * fine.scale)
  const left = Math.round(fine.dx * f)
  const top = Math.round(fine.dy * f)
  const srcLeft = Math.max(0, -left)
  const srcTop = Math.max(0, -top)
  const piece = await sharp(genFull, { raw: rawFull })
    .resize(sw, sh, { fit: 'fill' })
    .extract({
      left: srcLeft,
      top: srcTop,
      width: Math.min(sw - srcLeft, W - Math.max(0, left)),
      height: Math.min(sh - srcTop, H - Math.max(0, top)),
    })
    .png()
    .toBuffer()
  const aligned = await sharp({ create: { width: W, height: H, channels: 3, background: '#000' } })
    .composite([{ input: piece, left: Math.max(0, left), top: Math.max(0, top) }])
    .removeAlpha()
    .raw()
    .toBuffer()

  const SW = 600
  const SH = Math.round((SW * H) / W)
  const small = (input: string | Buffer, raw?: Raw) =>
    sharp(input, raw ? { raw } : undefined).resize(SW, SH, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  const found = stoneMask(await small(source), await small(aligned, rawFull), SW, SH, 25, 2, prior, mode)
  if (!found) return null
  const alpha = await sharp(Buffer.from(found.mask), { raw: { width: SW, height: SH, channels: 1 } })
    .resize(W, H, { fit: 'fill' })
    .blur(Math.max(1, W / 500))
    .extractChannel(0) // sharp oddaje maskę po rozmyciu jako sRGB (3 kanały)
    .raw()
    .toBuffer()
  const overlay = await sharp(aligned, { raw: rawFull })
    .joinChannel(alpha, { raw: { width: W, height: H, channels: 1 } })
    .png()
    .toBuffer()
  await sharp(source).composite([{ input: overlay }]).png().toFile(output)
  return {
    mask: found.mask,
    area: found.area,
    alignment: { scale: Number(fine.scale.toFixed(3)), dx: left, dy: top, cost: Number(fine.cost.toFixed(1)) },
  }
}

export async function dHash(file: string) {
  return dHashBits(await sharp(file).greyscale().resize(17, 16, { fit: 'fill' }).raw().toBuffer())
}

/** Webp na stronę: proporcje `aspect` (przycięcie środka), szerokość ≤ 1600 px, ≤ 300 KB. */
export async function toWebp(input: string, aspect: number, output: string) {
  const meta = await sharp(input).metadata()
  const crop = coverCrop({ width: meta.width!, height: meta.height! }, aspect)
  const width = Math.min(1600, crop.width)
  for (let quality = 86; quality >= 50; quality -= 6) {
    const buffer = await sharp(input).extract(crop).resize({ width }).webp({ quality, effort: 6 }).toBuffer()
    if (buffer.length <= MAX_IMAGE_BYTES) {
      writeFileSync(output, buffer)
      return { bytes: buffer.length, quality }
    }
  }
  throw new Error(`${path.basename(output)}: nie mieści się w ${MAX_IMAGE_BYTES} B`)
}

/** Zrzut z telefonu: obszar bez czarnych pasów (wiersze i kolumny o średniej jasności ≤ 14 od krawędzi). */
export async function contentBox(input: string) {
  const { data, info } = await sharp(input).greyscale().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = info
  const row = (y: number) => {
    let sum = 0
    for (let x = 0; x < width; x++) sum += data[y * width + x]
    return sum / width
  }
  const col = (x: number, y0: number, y1: number) => {
    let sum = 0
    for (let y = y0; y <= y1; y++) sum += data[y * width + x]
    return sum / (y1 - y0 + 1)
  }
  let top = 0
  let bottom = height - 1
  while (top < bottom && row(top) <= 14) top++
  while (bottom > top && row(bottom) <= 14) bottom--
  let left = 0
  let right = width - 1
  while (left < right && col(left, top, bottom) <= 14) left++
  while (right > left && col(right, top, bottom) <= 14) right--
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

/** Zrzut bez czarnych pasów, opcjonalnie przycięty do proporcji `aspect` (środek) i zmniejszony do `width`. */
export async function trimScreenshot(input: string, output: string, options: { aspect?: number; width?: number } = {}) {
  const box = await contentBox(input)
  const crop = options.aspect ? coverCrop(box, options.aspect) : { left: 0, top: 0, width: box.width, height: box.height }
  const region = { left: box.left + crop.left, top: box.top + crop.top, width: crop.width, height: crop.height }
  let image = sharp(input).extract(region)
  if (options.width) image = image.resize({ width: options.width })
  if (output.endsWith('.webp')) {
    for (let quality = 86; quality >= 50; quality -= 6) {
      const buffer = await image.clone().webp({ quality, effort: 6 }).toBuffer()
      if (buffer.length <= MAX_IMAGE_BYTES) return writeFileSync(output, buffer)
    }
    throw new Error(`${path.basename(output)}: nie mieści się w ${MAX_IMAGE_BYTES} B`)
  }
  await image.jpeg({ quality: 88 }).toFile(output)
}
