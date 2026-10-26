// Stykówka: pierwsza klatka/zdjęcie każdego posta z numerem (kolejność chronologiczna).
import { readFile, readdir, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../../cms/package.json', import.meta.url))
const sharp = require('sharp')

const [fbDir, outDir] = process.argv.slice(2)
const posts = JSON.parse(await readFile(path.join(fbDir, 'posts.json'), 'utf8')).posts
  .sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
const files = await readdir(path.join(fbDir, 'media'))
await mkdir(outDir, { recursive: true })

const tile = 220, cols = 8, perSheet = 40
for (let s = 0; s * perSheet < posts.length; s++) {
  const chunk = posts.slice(s * perSheet, (s + 1) * perSheet)
  const rows = Math.ceil(chunk.length / cols)
  const comps = []
  for (const [i, p] of chunk.entries()) {
    const idx = s * perSheet + i
    const f = files.find((x) => x.startsWith(p.post_id) && x.endsWith('.jpg'))
    const x = (i % cols) * tile, y = Math.floor(i / cols) * tile
    if (f) comps.push({ input: await sharp(path.join(fbDir, 'media', f)).resize(tile, tile, { fit: 'cover' }).toBuffer(), left: x, top: y })
    const label = `${idx}${p.videos.length ? ' V' : ''} P${p.photos.length}`
    comps.push({ input: Buffer.from(`<svg width="${tile}" height="34"><rect width="100%" height="100%" fill="black" opacity="0.7"/><text x="6" y="25" font-size="24" fill="#ff0" font-family="Arial">${label}</text></svg>`), left: x, top: y })
  }
  await sharp({ create: { width: cols * tile, height: rows * tile, channels: 3, background: '#333' } })
    .composite(comps).jpeg({ quality: 70 }).toFile(path.join(outDir, `sheet-${s}.jpg`))
}
console.log('ok')
