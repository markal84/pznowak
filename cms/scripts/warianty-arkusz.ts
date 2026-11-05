/**
 * Arkusz miniatur wariantów (zlecenie Y) do raportu: dla każdej karty wiersz = zdjęcie galerii, kolumny = oryginał
 * i warianty z `warianty.json`. Pusta komórka = wariant nie ma obrazu dla tego zdjęcia („tylko 1. zdjęcie”).
 *
 *   npm run warianty:arkusz                      wszystkie karty z warianty.json, które mają wizualizacje
 *   npm run warianty:arkusz -- --tylko cyane     wybrane karty
 *
 * Oryginały: `seed/warianty/podglad/<zdjęcie>-oryginal.webp` (zapisuje je `warianty:wizualizacje`). Wynik:
 * `seed/warianty/podglad/arkusz-<slug>.jpg`. Niczego nie wywołuje i nie publikuje.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'

import sharp, { type OverlayOptions } from 'sharp'

import { IMAGES_DIR, loadSpecs, WARIANTY_DIR } from './warianty-v-logic'
import { designPhotos, loadConfig } from './wizualizacje-w-logic'

const CELL = 220
const GAP = 8
const HEAD = 44
const LABEL = 26

const only = (() => {
  const i = process.argv.indexOf('--tylko')
  return i >= 0 ? (process.argv[i + 1] ?? '').split(',').filter(Boolean) : []
})()

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const text = (value: string, width: number, height: number, size: number, weight = 400) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="4" y="${Math.round(height * 0.7)}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="#2a2722">${esc(value)}</text></svg>`,
  )

const cell = async (file: string | null) => {
  if (!file || !existsSync(file)) {
    return sharp({ create: { width: CELL, height: CELL, channels: 3, background: '#efebe3' } })
      .composite([{ input: text('tylko 1. zdjęcie', CELL, CELL, 15), top: 0, left: 50 }])
      .png()
      .toBuffer()
  }
  return sharp(file).resize(CELL, CELL, { fit: 'contain', background: '#ffffff' }).png().toBuffer()
}

const config = loadConfig()
for (const spec of loadSpecs()) {
  const design = config.fasony.find((d) => d.slug === spec.slug)
  if (!design || (only.length && !only.includes(spec.slug))) continue
  const photos = designPhotos(design)
  const columns = [{ name: 'Oryginał', files: photos.map((p) => path.join(WARIANTY_DIR, 'podglad', `${p.photoKey}-oryginal.webp`)) }]
  for (const variant of spec.variants) columns.push({ name: variant.stone, files: variant.files.map((f) => path.join(IMAGES_DIR, f)) })
  const width = columns.length * (CELL + GAP) + GAP
  const height = HEAD + LABEL + photos.length * (CELL + GAP) + GAP
  const layers: OverlayOptions[] = [{ input: text(`${design.name} – oryginał i warianty (zdjęcia galerii po kolei)`, width, HEAD, 22, 600), top: 0, left: GAP }]
  for (const [c, column] of columns.entries()) {
    const left = GAP + c * (CELL + GAP)
    layers.push({ input: text(column.name, CELL, LABEL, column.name.length > 26 ? 12 : 14, 600), top: HEAD, left })
    for (const [r] of photos.entries()) {
      layers.push({ input: await cell(column.files[r] ?? null), top: HEAD + LABEL + r * (CELL + GAP), left })
    }
  }
  const out = path.join(WARIANTY_DIR, 'podglad', `arkusz-${spec.slug}.jpg`)
  await sharp({ create: { width, height, channels: 3, background: '#faf8f4' } }).composite(layers).jpeg({ quality: 78 }).toFile(out)
  console.log(`${path.relative(process.cwd(), out)}: ${columns.length - 1} wariantów × ${photos.length} zdjęć`)
}
