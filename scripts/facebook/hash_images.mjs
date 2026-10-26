// Liczy dHash (64 bity) całego obrazu i środka kadru (80 %) dla zdjęć FB, klatek filmów (frames/) i zdjęć
// starego katalogu (data/legacy/jewelry). Wynik: <fbDir>/hashes.json (cache po rozmiarze i mtime).
// Robi też małe miniatury starego katalogu do <fbDir>/legacy-thumbs/ (potrzebne do podpowiedzi „na stronie”).
// Nie zmienia niczego w media/, frames/ ani data/legacy.
// Użycie: node scripts/facebook/hash_images.mjs data/legacy data/facebook
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../../cms/package.json', import.meta.url))
const sharp = require('sharp')

const [legacyDir, fbDir] = process.argv.slice(2)
const out = path.join(fbDir, 'hashes.json')
let cache = { version: 1, fb: {}, legacy: {} }
try {
  cache = JSON.parse(await readFile(out, 'utf8'))
} catch {}

async function bitsOf(img) {
  const px = await img.greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer()
  let bits = 0n
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits = (bits << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n)
  return bits.toString(16).padStart(16, '0')
}

async function hashes(file) {
  const base = sharp(file).rotate()
  const buf = await base.toBuffer()
  const { width, height } = await sharp(buf).metadata()
  const cw = Math.round(width * 0.8)
  const ch = Math.round(height * 0.8)
  const f = await bitsOf(sharp(buf))
  const c = await bitsOf(sharp(buf).extract({ left: Math.round((width - cw) / 2), top: Math.round((height - ch) / 2), width: cw, height: ch }))
  return { f, c }
}

async function run(table, key, file, stamp) {
  const hit = table[key]
  if (hit && hit.stamp === stamp) return false
  table[key] = { ...(await hashes(file)), stamp }
  return true
}

let fresh = 0
const media = path.join(fbDir, 'media')
const frames = path.join(fbDir, 'frames')
const jobs = []
for (const f of await readdir(media)) if (f.endsWith('.jpg') && !f.includes('_thumb')) jobs.push([cache.fb, f, path.join(media, f)])
for (const f of await readdir(frames)) if (f.endsWith('.jpg')) jobs.push([cache.fb, `frames/${f}`, path.join(frames, f)])
const jewelry = path.join(legacyDir, 'jewelry')
await mkdir(path.join(fbDir, 'legacy-thumbs'), { recursive: true })
for (const f of await readdir(jewelry)) if (/\.(jpe?g|png|webp)$/i.test(f)) jobs.push([cache.legacy, f, path.join(jewelry, f)])

for (const [table, key, file] of jobs) {
  const st = await stat(file)
  const changed = await run(table, key, file, `${st.size}-${Math.round(st.mtimeMs)}`)
  if (changed) fresh++
  if (table === cache.legacy) {
    const thumb = path.join(fbDir, 'legacy-thumbs', key.replace(/\.\w+$/, '') + '.jpg')
    if (changed || !(await stat(thumb).catch(() => null))) await sharp(file).rotate().resize({ height: 240, withoutEnlargement: true }).jpeg({ quality: 75 }).toFile(thumb)
  }
}
await writeFile(out, JSON.stringify(cache))
console.log(`hashes.json: ${Object.keys(cache.fb).length} obrazów FB (z klatkami), ${Object.keys(cache.legacy).length} starego katalogu, ${fresh} policzonych na nowo`)
