import sharp, { type Sharp } from 'sharp'

import { sniffImageType, type DetectedType } from './rules'

/**
 * Przetwarzanie zdjęć od klientów po stronie serwera. Do magazynu trafia wyłącznie obraz zdekodowany
 * i zakodowany od nowa jako JPEG:
 * - typ rozpoznany po zawartości (sygnatura), a dekoder `sharp` musi potwierdzić ten sam format,
 * - wymiary sprawdzone przed dekodowaniem (bomby dekompresyjne: mały plik, gigantyczny obraz),
 * - EXIF (także GPS), XMP, IPTC i dane doklejone do pliku znikają, bo zapisujemy tylko piksele;
 *   plik-poliglota (np. JPEG z HTML-em w środku) przestaje nim być,
 * - HEIC z iPhone'a dekoduje libheif skompilowany do WebAssembly (`heic-decode`), bo `sharp` z paczki
 *   obsługuje tylko AVIF; błąd w dekoderze zostaje w pamięci WebAssembly.
 */

export const IMAGE_LIMITS = {
  /** Pikseli na wejściu (zdjęcie 48 Mpx z iPhone'a ma ok. 48,8 mln). */
  maxInputPixels: 50_000_000,
  /** Dłuższy bok na wejściu. */
  maxInputSide: 12_000,
  /** Dłuższy bok zapisanego zdjęcia. */
  outputMaxSide: 2048,
  /** Dłuższy bok miniatury w panelu. */
  thumbMaxSide: 480,
  quality: 85,
  thumbQuality: 75,
  timeoutSeconds: 15,
} as const

export type RejectReason = 'unsupported_type' | 'too_large_dimensions' | 'corrupt'

export type ProcessedImage = {
  ok: true
  detectedType: DetectedType
  full: Buffer
  thumb: Buffer
  width: number
  height: number
}

export type ProcessResult = ProcessedImage | { ok: false; reason: RejectReason }

const SHARP_FORMAT: Record<Exclude<DetectedType, 'heic'>, string> = {
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
}

const isPixelLimit = (error: unknown) =>
  error instanceof Error && /exceeds pixel limit/i.test(error.message)

const tooLarge = (width: number, height: number) =>
  !width ||
  !height ||
  width > IMAGE_LIMITS.maxInputSide ||
  height > IMAGE_LIMITS.maxInputSide ||
  width * height > IMAGE_LIMITS.maxInputPixels

async function heicSource(bytes: Buffer): Promise<{ input: Sharp } | { reason: RejectReason }> {
  const { default: decode } = await import('heic-decode')
  let images: Awaited<ReturnType<typeof decode.all>>
  try {
    images = await decode.all({ buffer: new Uint8Array(bytes) })
  } catch {
    return { reason: 'corrupt' }
  }
  const primary = images[0]
  if (!primary) return { reason: 'corrupt' }
  // Wymiary z nagłówka, jeszcze przed dekodowaniem pikseli.
  if (tooLarge(primary.width, primary.height)) return { reason: 'too_large_dimensions' }
  try {
    const { width, height, data } = await primary.decode()
    if (tooLarge(width, height)) return { reason: 'too_large_dimensions' }
    return {
      input: sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), {
        raw: { width, height, channels: 4 },
      }),
    }
  } catch {
    return { reason: 'corrupt' }
  }
}

async function sharpSource(
  bytes: Buffer,
  type: Exclude<DetectedType, 'heic'>,
): Promise<{ input: Sharp } | { reason: RejectReason }> {
  const input = sharp(bytes, {
    limitInputPixels: IMAGE_LIMITS.maxInputPixels,
    failOn: 'error',
    // Animacje (WebP, APNG): tylko pierwsza klatka.
    pages: 1,
  })
  let meta: Awaited<ReturnType<Sharp['metadata']>>
  try {
    meta = await input.metadata()
  } catch (error) {
    // `sharp` sprawdza limit pikseli już na nagłówku (bomba dekompresyjna nie jest nawet rozpakowywana).
    return { reason: isPixelLimit(error) ? 'too_large_dimensions' : 'corrupt' }
  }
  // Dekoder musi zobaczyć ten sam format co sygnatura (np. nie SVG ani TIFF udający JPEG).
  if (meta.format !== SHARP_FORMAT[type]) return { reason: 'unsupported_type' }
  if (tooLarge(meta.width ?? 0, meta.height ?? 0)) return { reason: 'too_large_dimensions' }
  return { input }
}

function encode(input: Sharp, maxSide: number, quality: number) {
  return input
    .clone()
    .autoOrient()
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .toColourspace('srgb')
    .jpeg({ quality, mozjpeg: true })
    .timeout({ seconds: IMAGE_LIMITS.timeoutSeconds })
    .toBuffer({ resolveWithObject: true })
}

export async function processImage(bytes: Buffer): Promise<ProcessResult> {
  const detectedType = sniffImageType(bytes)
  if (!detectedType) return { ok: false, reason: 'unsupported_type' }

  const source =
    detectedType === 'heic' ? await heicSource(bytes) : await sharpSource(bytes, detectedType)
  if ('reason' in source) return { ok: false, reason: source.reason }

  try {
    const full = await encode(source.input, IMAGE_LIMITS.outputMaxSide, IMAGE_LIMITS.quality)
    const thumb = await encode(source.input, IMAGE_LIMITS.thumbMaxSide, IMAGE_LIMITS.thumbQuality)
    return {
      ok: true,
      detectedType,
      full: full.data,
      thumb: thumb.data,
      width: full.info.width,
      height: full.info.height,
    }
  } catch (error) {
    return { ok: false, reason: isPixelLimit(error) ? 'too_large_dimensions' : 'corrupt' }
  }
}
