// @vitest-environment node
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { IMAGE_LIMITS, processImage, type ProcessedImage } from '@/lib/attachments/image'
import { parseManifest, photosLabel, sniffImageType } from '@/lib/attachments/rules'
import {
  HTML_PAYLOAD,
  disguised,
  hasGpsPointer,
  heicFixture,
  jpeg,
  jpegRotated,
  jpegWithGps,
  png,
  pngBomb,
  polyglot,
  webp,
} from './helpers/images'

async function processed(bytes: Buffer): Promise<ProcessedImage> {
  const result = await processImage(bytes)
  if (!result.ok) throw new Error(`odrzucone: ${result.reason}`)
  return result
}

describe('rozpoznanie typu po zawartości (nie po rozszerzeniu)', () => {
  it('przyjmuje JPG, PNG, WebP i HEIC', async () => {
    expect(sniffImageType(await jpeg())).toBe('jpeg')
    expect(sniffImageType(await png())).toBe('png')
    expect(sniffImageType(await webp())).toBe('webp')
    expect(sniffImageType(heicFixture())).toBe('heic')
  })

  it.each(Object.entries(disguised).filter(([name]) => name !== 'brokenJpeg'))(
    'odrzuca %s udający zdjęcie',
    (_name, bytes) => {
      expect(sniffImageType(bytes)).toBeNull()
    },
  )

  it('pusty i bardzo krótki plik to nie zdjęcie', () => {
    expect(sniffImageType(new Uint8Array())).toBeNull()
    expect(sniffImageType(Buffer.from([0xff, 0xd8]))).toBeNull()
  })
})

describe('przetwarzanie na serwerze', () => {
  it.each([
    ['program (exe)', disguised.exe],
    ['program (ELF)', disguised.elf],
    ['strona HTML', disguised.html],
    ['SVG ze skryptem', disguised.svg],
    ['SVG z nagłówkiem XML', disguised.svgXml],
    ['PDF z JavaScriptem', disguised.pdf],
    ['archiwum ZIP', disguised.zip],
    ['AVIF', disguised.avif],
  ])('%s przemianowany na .jpg: odrzucony bez dekodowania', async (_name, bytes) => {
    expect(await processImage(bytes)).toEqual({ ok: false, reason: 'unsupported_type' })
  })

  it('uszkodzony JPEG (dobra sygnatura, śmieci w środku): odrzucony', async () => {
    expect(await processImage(disguised.brokenJpeg)).toEqual({ ok: false, reason: 'corrupt' })
  })

  it('JPG zakodowany od nowa: JPEG, miniatura, wymiary bez powiększania', async () => {
    const result = await processed(await jpeg(320, 240))
    expect(result.detectedType).toBe('jpeg')
    expect(sniffImageType(result.full)).toBe('jpeg')
    expect(sniffImageType(result.thumb)).toBe('jpeg')
    expect([result.width, result.height]).toEqual([320, 240])
    const thumb = await sharp(result.thumb).metadata()
    expect(Math.max(thumb.width!, thumb.height!)).toBeLessThanOrEqual(IMAGE_LIMITS.thumbMaxSide)
  })

  it('duże zdjęcie zmniejszone do 2048 px po dłuższym boku', async () => {
    const result = await processed(await jpeg(4000, 3000))
    expect([result.width, result.height]).toEqual([2048, 1536])
  })

  it('PNG i WebP zapisane jako JPEG; przezroczystość na białym tle', async () => {
    const fromPng = await processed(await png(64, 48, true))
    expect(fromPng.detectedType).toBe('png')
    expect((await sharp(fromPng.full).metadata()).format).toBe('jpeg')
    const { data } = await sharp(fromPng.full).raw().toBuffer({ resolveWithObject: true })
    expect(data[0]).toBeGreaterThan(245)
    const fromWebp = await processed(await webp())
    expect(fromWebp.detectedType).toBe('webp')
    expect((await sharp(fromWebp.full).metadata()).format).toBe('jpeg')
  })

  it('EXIF z GPS: po przetworzeniu brak EXIF, GPS, XMP i ICC', async () => {
    const original = await jpegWithGps()
    expect(hasGpsPointer((await sharp(original).metadata()).exif)).toBe(true)
    expect(original.includes(Buffer.from('ZDRADZAJACY-TELEFON'))).toBe(true)

    const result = await processed(original)
    for (const output of [result.full, result.thumb]) {
      const meta = await sharp(output).metadata()
      expect(meta.exif).toBeUndefined()
      expect(meta.xmp).toBeUndefined()
      expect(meta.iptc).toBeUndefined()
      expect(output.includes(Buffer.from('ZDRADZAJACY-TELEFON'))).toBe(false)
      expect(output.includes(Buffer.from('iPhone'))).toBe(false)
    }
  })

  it('orientacja z EXIF zastosowana przed usunięciem metadanych (zdjęcie pionowe zostaje pionowe)', async () => {
    const result = await processed(await jpegRotated())
    expect([result.width, result.height]).toEqual([200, 300])
  })

  it('poliglota JPG+HTML: zostaje sam obraz, bez HTML-a', async () => {
    const bytes = await polyglot()
    expect(bytes.includes(Buffer.from('<script'))).toBe(true)
    const result = await processed(bytes)
    for (const output of [result.full, result.thumb]) {
      expect(output.includes(Buffer.from('<script'))).toBe(false)
      expect(output.includes(Buffer.from('<html'))).toBe(false)
      expect(output.toString('latin1')).not.toContain(HTML_PAYLOAD)
    }
  })

  it('bomba dekompresyjna (PNG 30 000 × 30 000 w kilku KB): odrzucona przed dekodowaniem i szybko', async () => {
    const bomb = pngBomb()
    expect(bomb.length).toBeLessThan(5_000)
    const started = Date.now()
    expect(await processImage(bomb)).toEqual({ ok: false, reason: 'too_large_dimensions' })
    expect(Date.now() - started).toBeLessThan(2_000)
  })

  it('zbyt długi bok (13 000 px) odrzucony, choć pikseli mało', async () => {
    expect(await processImage(pngBomb(13_000, 10))).toEqual({
      ok: false,
      reason: 'too_large_dimensions',
    })
  })

  it('HEIC z iPhone’a: poprawna konwersja do JPEG z zachowanymi kolorami', async () => {
    const result = await processed(heicFixture())
    expect(result.detectedType).toBe('heic')
    expect([result.width, result.height]).toEqual([120, 80])
    expect((await sharp(result.full).metadata()).format).toBe('jpeg')
    const { data, info } = await sharp(result.full).raw().toBuffer({ resolveWithObject: true })
    // Piksel z lewej górnej ćwiartki: (200, 160, 90) z niewielką stratą kompresji.
    const at = (10 * info.width + 10) * info.channels
    expect(Math.abs(data[at] - 200)).toBeLessThan(12)
    expect(Math.abs(data[at + 1] - 160)).toBeLessThan(12)
    expect(Math.abs(data[at + 2] - 90)).toBeLessThan(12)
  })

  it('uszkodzony HEIC (dobra sygnatura, brak obrazu): odrzucony', async () => {
    const broken = Buffer.concat([heicFixture().subarray(0, 40), Buffer.alloc(200)])
    expect(sniffImageType(broken)).toBe('heic')
    expect(await processImage(broken)).toEqual({ ok: false, reason: 'corrupt' })
  })
})

describe('zapowiedź plików w zgłoszeniu', () => {
  it('brak pola = zgłoszenie bez zdjęć', () => {
    expect(parseManifest(undefined)).toEqual({ ok: true, sizes: [] })
  })

  it('przyjmuje do 5 plików po najwyżej 4 MB', () => {
    expect(parseManifest([{ size: 1 }, { size: 4 * 1024 * 1024 }])).toEqual({
      ok: true,
      sizes: [1, 4 * 1024 * 1024],
    })
  })

  it.each([
    ['za dużo plików', Array.from({ length: 6 }, () => ({ size: 100 }))],
    ['plik za duży', [{ size: 4 * 1024 * 1024 + 1 }]],
    ['rozmiar ułamkowy', [{ size: 1.5 }]],
    ['rozmiar zero', [{ size: 0 }]],
    ['rozmiar jako tekst', [{ size: '100' }]],
    ['nie lista', { size: 100 }],
    ['pusty element', [null]],
  ])('%s: błąd', (_name, raw) => {
    expect(parseManifest(raw).ok).toBe(false)
  })

  it('polska odmiana liczby zdjęć', () => {
    expect([1, 2, 4, 5, 12, 22, 25].map(photosLabel)).toEqual([
      '1 zdjęcie',
      '2 zdjęcia',
      '4 zdjęcia',
      '5 zdjęć',
      '12 zdjęć',
      '22 zdjęcia',
      '25 zdjęć',
    ])
  })
})
