// Dopasowuje zdjęcia starego katalogu (data/legacy) do zdjęć z eksportu FB po dHash.
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(new URL('../../cms/package.json', import.meta.url))
const sharp = require('sharp')

const [legacyDir, fbDir] = process.argv.slice(2)

async function dhash(file) {
  const px = await sharp(file).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer()
  let bits = 0n
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits = (bits << 1n) | (px[y * 9 + x] > px[y * 9 + x + 1] ? 1n : 0n)
  return bits
}
const dist = (a, b) => { let x = a ^ b, n = 0; while (x) { n += Number(x & 1n); x >>= 1n } return n }

const legacy = JSON.parse(await readFile(path.join(legacyDir, 'collection.json'), 'utf8')).products
const posts = JSON.parse(await readFile(path.join(fbDir, 'posts.json'), 'utf8')).posts
const media = path.join(fbDir, 'media')
const fbFiles = (await readdir(media)).filter((f) => f.endsWith('.jpg'))
const fbHashes = []
for (const f of fbFiles) fbHashes.push({ f, post: f.split('_')[0], h: await dhash(path.join(media, f)) })

const result = []
for (const p of legacy) {
  const votes = {}
  for (const img of p.images ?? []) {
    const h = await dhash(path.join(legacyDir, img))
    let best = null
    for (const c of fbHashes) { const d = dist(h, c.h); if (!best || d < best.d) best = { ...c, d } }
    if (best.d <= 12) votes[best.post] = Math.min(votes[best.post] ?? 99, best.d)
  }
  result.push({ id: p.id, name: p.name, matches: votes })
}
for (const r of result) {
  const m = Object.entries(r.matches).map(([post, d]) => {
    const fp = posts.find((x) => x.post_id === post)
    return `${post}(d${d} ${fp?.date?.slice(0, 10) ?? '?'})`
  })
  console.log(r.id, r.name.padEnd(12), m.join(' ') || 'BRAK')
}
