// Zrzut katalogu pierścionków z Payload do data/facebook/katalog.json (TYLKO ODCZYT) – materiał dla podpowiedzi
// modelu w przeglądzie FB (scripts/facebook/classify_posts.py): nazwy, kamienie, warianty (z oznaczeniem wizualizacji),
// adresy zdjęć. Bierze najnowszą wersję każdej karty, także szkice.
//
//   npm run katalog:snapshot      żywa baza strony, rozpoznana po endpoincie Neon (live-db.ts), nie po nazwie gałęzi
//
// Opcje: --out <plik> (domyślnie data/facebook/katalog.json), --env-root <katalog z cms/.env* i backend/.env*>.
// Niczego nie zapisuje w bazie ani w Blob.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadLiveEnv } from './live-db'

const args = process.argv.slice(2)
const option = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const envRoot = path.resolve(option('--env-root') ?? repoRoot)
const outPath = path.resolve(option('--out') ?? path.join(repoRoot, 'data/facebook/katalog.json'))
const env = 'live'
await loadLiveEnv(envRoot)

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config: await config })

type Upload =
  | null
  | number
  | { filename?: null | string; id: number; legacySourceUrl?: null | string; mimeType?: null | string; url?: null | string }
// source: legacySourceUrl (np. „fb:<post>_<zdjęcie>”) – pozwala testowi pominąć zdjęcia z tego samego posta.
const file = (u: Upload) =>
  u && typeof u === 'object' && u.url
    ? { id: u.id, url: u.url, video: (u.mimeType ?? '').startsWith('video/'), source: u.legacySourceUrl ?? null }
    : null

const found = await payload.find({
  collection: 'products',
  depth: 1,
  draft: true,
  limit: 1000,
  overrideAccess: true,
  pagination: false,
})

const products = found.docs.map((p) => {
  const media = (p.media ?? []).map((m) => ({ ...file(m.asset as Upload), primary: Boolean(m.isPrimary) })).filter((m) => m.url)
  media.sort((a, b) => Number(b.primary) - Number(a.primary))
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    status: p._status ?? 'published',
    archived: Boolean(p.archived),
    stone: p.stone ?? '',
    metal: p.metal ?? '',
    lead: p.lead ?? '',
    facebookKey: p.source?.facebookKey ?? null,
    media,
    variants: (p.stoneVariants ?? []).map((v) => ({
      stone: v.stone,
      swatch: v.swatch ?? null,
      isVisualization: Boolean(v.isVisualization),
      image: file(v.image as Upload),
      moreImages: ((v.moreImages ?? []) as Upload[]).map(file).filter(Boolean),
      hasVideo: Boolean(v.video),
    })),
  }
})

await mkdir(path.dirname(outPath), { recursive: true })
await writeFile(
  outPath,
  JSON.stringify({ about: 'Zrzut katalogu z Payload (tylko odczyt) dla podpowiedzi w przeglądzie FB.', env, takenAt: new Date().toISOString(), products }, null, 1),
)
const vis = products.reduce((n, p) => n + p.variants.filter((v) => v.isVisualization).length, 0)
console.log(
  `katalog.json: ${products.length} kart (szkice: ${products.filter((p) => p.status === 'draft').length}, ` +
    `archiwalne: ${products.filter((p) => p.archived).length}), wariantów z wizualizacją: ${vis} → ${outPath}`,
)
process.exit(0)
