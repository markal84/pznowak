import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32, deflateSync } from 'node:zlib'

import sharp from 'sharp'

/** Pliki testowe dla zdjęć od klientów; generowane w locie, poza HEIC (zrobiony raz programem `sips` na Macu). */

const here = path.dirname(fileURLToPath(import.meta.url))

/** HEIC z iPhone'a w miniaturze: 120×80, lewa połowa czerwonawa (200,160,90), prawa ciemniejsza. */
export const heicFixture = () =>
  readFileSync(path.resolve(here, '../../fixtures/zalaczniki/iphone.heic'))

export const jpeg = (width = 320, height = 240, background = '#c8813a') =>
  sharp({ create: { width, height, channels: 3, background } })
    .jpeg({ quality: 90 })
    .toBuffer()

export const png = (width = 64, height = 48, alpha = false) =>
  sharp({
    create: {
      width,
      height,
      channels: alpha ? 4 : 3,
      background: alpha ? { r: 20, g: 120, b: 60, alpha: 0 } : '#147a3c',
    },
  })
    .png()
    .toBuffer()

export const webp = () =>
  sharp({ create: { width: 80, height: 60, channels: 3, background: '#335577' } })
    .webp()
    .toBuffer()

/** JPEG z EXIF: aparat i współrzędne GPS (Busko-Zdrój), jak zdjęcie prosto z telefonu. */
export const jpegWithGps = () =>
  sharp({ create: { width: 200, height: 150, channels: 3, background: '#996633' } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'Apple', Model: 'iPhone 15 Pro', Software: 'ZDRADZAJACY-TELEFON' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '50/1 28/1 3000/100',
        GPSLongitudeRef: 'E',
        GPSLongitude: '20/1 43/1 0/1',
      },
    })
    .toBuffer()

/** JPEG z EXIF Orientation = 6 (zdjęcie z telefonu trzymanego pionowo): 300×200 zapisane, 200×300 do pokazania. */
export const jpegRotated = () =>
  sharp({ create: { width: 300, height: 200, channels: 3, background: '#445566' } })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer()

export const HTML_PAYLOAD = '<html><script>alert(document.cookie)</script></html>'

/**
 * Poliglota JPG+HTML: poprawny JPEG z HTML-em w segmencie komentarza (COM) i doklejonym po końcu obrazu.
 * Przeglądarka, która zgaduje typ po treści, mogłaby go uznać za stronę.
 */
export async function polyglot(): Promise<Buffer> {
  const base = await jpeg(64, 64)
  const comment = Buffer.from(HTML_PAYLOAD, 'latin1')
  const com = Buffer.concat([
    Buffer.from([0xff, 0xfe, (comment.length + 2) >> 8, (comment.length + 2) & 0xff]),
    comment,
  ])
  // Segment COM zaraz po SOI (FF D8).
  return Buffer.concat([base.subarray(0, 2), com, base.subarray(2), comment])
}

function pngChunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'latin1')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'latin1'), data])), 0)
  return Buffer.concat([head, data, crc])
}

/**
 * Bomba dekompresyjna: PNG o wymiarach `width`×`height` (np. 30 000 × 30 000 = 900 mln pikseli, po rozpakowaniu
 * ponad 2,5 GB), a w pliku kilkaset bajtów skompresowanych zer.
 */
export function pngBomb(width = 30_000, height = 30_000): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // głębia bitowa
  ihdr[9] = 2 // RGB
  const idat = deflateSync(Buffer.alloc(64 * 1024))
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

/** Pliki, które nie są zdjęciami, choć mają nazwę .jpg. */
export const disguised = {
  exe: Buffer.concat([
    Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'latin1'),
    Buffer.alloc(200, 0x41),
  ]),
  elf: Buffer.concat([Buffer.from('\x7fELF\x02\x01\x01\x00', 'latin1'), Buffer.alloc(200)]),
  html: Buffer.from(`<!doctype html>${HTML_PAYLOAD}`),
  svg: Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(2)</script></svg>',
  ),
  svgXml: Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"/>'),
  pdf: Buffer.from('%PDF-1.7\n1 0 obj << /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>'),
  zip: Buffer.concat([Buffer.from('PK\x03\x04', 'latin1'), Buffer.alloc(100)]),
  /** AVIF: kontener HEIF, ale nie HEIC (nie przyjmujemy). */
  avif: Buffer.concat([
    Buffer.from([0, 0, 0, 0x1c]),
    Buffer.from('ftypavif\0\0\0\0avifmif1miaf', 'latin1'),
  ]),
  /** Sygnatura JPEG, a dalej śmieci. */
  brokenJpeg: Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(500, 0x37)]),
}

/** Czy w EXIF są znaczniki GPS (wskaźnik GPS IFD, znacznik 0x8825, w obu kolejnościach bajtów). */
export const hasGpsPointer = (exif: Buffer | undefined) =>
  Boolean(
    exif && (exif.includes(Buffer.from([0x88, 0x25])) || exif.includes(Buffer.from([0x25, 0x88]))),
  )
