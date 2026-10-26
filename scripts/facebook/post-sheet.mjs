// Stykówka wybranych postów: jeden wiersz na post (zdjęcia + klatki 25/50/75% filmów).
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../../cms/package.json', import.meta.url))
const sharp = require('sharp')

const [fbDir, out, ...idxs] = process.argv.slice(2)
const posts = JSON.parse(await readFile(path.join(fbDir, 'posts.json'), 'utf8')).posts
  .sort((a, b) => (a.time ?? 0) - (b.time ?? 0))
const media = await readdir(path.join(fbDir, 'media'))
const frames = await readdir(path.join(fbDir, 'frames'))
const tile = 260, maxCols = 6
const comps = []
for (const [row, idx] of idxs.map(Number).entries()) {
  const p = posts[idx]
  const imgs = [
    ...media.filter((f) => f.startsWith(p.post_id) && f.endsWith('.jpg') && !f.includes('_thumb')).map((f) => path.join(fbDir, 'media', f)),
    ...frames.filter((f) => f.startsWith(p.post_id)).sort().map((f) => path.join(fbDir, 'frames', f)),
  ].slice(0, maxCols)
  for (const [c, f] of imgs.entries()) comps.push({ input: await sharp(f).resize(tile, tile, { fit: 'contain', background: '#222' }).toBuffer(), left: c * tile, top: row * tile })
  comps.push({ input: Buffer.from(`<svg width="120" height="40"><rect width="100%" height="100%" fill="black"/><text x="8" y="30" font-size="28" fill="#ff0" font-family="Arial">#${idx}</text></svg>`), left: 0, top: row * tile })
}
await sharp({ create: { width: maxCols * tile, height: idxs.length * tile, channels: 3, background: '#111' } }).composite(comps).jpeg({ quality: 72 }).toFile(out)
console.log(out)
