// Zdjęcia z przeglądu FB do ISTNIEJĄCYCH kart (catalog-selection.json → toExisting), tylko jako wersja robocza.
//
//   npm run fb:do-istniejacych                 na sucho: co się zmieni, bez zapisu
//   npm run fb:do-istniejacych -- --apply      zapis (wymaga wpisania słowa ZAPISZ w terminalu)
//
// Obsługuje:
//   zamiast-wizualizacji  wariant kamienia, który ma dziś wizualizację, dostaje prawdziwe zdjęcia z posta
//                         (image = pierwsze zdjęcie, moreImages = kolejne, isVisualization = false, alt bez „(wizualizacja)”).
//                         Poprzednia wizualizacja zostaje w bibliotece mediów (do cofnięcia ręcznie albo --rollback).
//   dodatek               zdjęcia dopisane na koniec galerii karty (media).
//   nowy-wariant          pomijany z komunikatem (decyzja: inny kamień w tym fasonie = nowa karta).
// Opublikowana karta dostaje NOWĄ WERSJĘ ROBOCZĄ (draft: true): strona się nie zmienia, dopóki Marcin nie opublikuje
// zmian w panelu. Szkic zostaje szkicem.
//
// Baza: --env live (domyślnie) czyta backend/.env.staging.local, bo żywa strona działa na gałęzi Neon nazwanej na
// Macu „staging” (scripts/backup/README.md). Opcje: --input <catalog-selection.json>, --data <katalog z media/>,
// --env-root <katalog z cms/.env* i backend/.env*>, --rollback <plik przebiegu> [--apply].
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

import { parse } from 'dotenv'
import sharp from 'sharp'

const args = process.argv.slice(2)
const option = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const apply = args.includes('--apply')
const rollbackFile = option('--rollback')
const env = option('--env') ?? 'live'
if (env !== 'live') throw new Error('Na razie tylko --env live (żywa baza strony)')

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const envRoot = path.resolve(option('--env-root') ?? repoRoot)
const dataDir = path.resolve(option('--data') ?? path.join(repoRoot, 'data/facebook'))
const inputPath = path.resolve(option('--input') ?? path.join(dataDir, 'catalog-selection.json'))
for (const file of ['cms/.env', 'cms/.env.local', 'backend/.env.staging.local']) {
  Object.assign(process.env, parse(await readFile(path.join(envRoot, file))))
}
if (process.env.NEON_BRANCH !== 'staging') throw new Error('Zmienne nie wskazują żywej bazy (NEON_BRANCH=staging)')

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config: await config })
const context = { skipFrontendRevalidation: true }

type Item = {
  action: 'dodatek' | 'nowy-wariant' | 'zamiast-wizualizacji'
  confidence?: number
  key: string
  name: string
  photos: string[]
  posts: Array<{ postId: string; url: null | string }>
  product: string
  productName: string
  reason?: string
  variant: string
  videos: string[]
}
type RunLog = {
  at: string
  createdMedia: number[]
  products: Array<{ action: string; before: unknown; id: number; slug: string }>
}

const norm = (s: string) => s.trim().toLowerCase().normalize('NFC')
const stripViz = (alt: string) => alt.replace(/\s*\(wizualizacja\)\s*$/i, '').trim()

async function confirm() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question('Zapis do ŻYWEJ bazy (tylko wersje robocze). Wpisz ZAPISZ, aby kontynuować: ')
  rl.close()
  if (answer.trim() !== 'ZAPISZ') throw new Error('Przerwano: brak potwierdzenia')
}

async function upload(file: string, alt: string, log: RunLog): Promise<number> {
  const source = `fb:${file.replace(/^media\//, '')}`
  const known = await payload.find({ collection: 'media', depth: 0, limit: 1, overrideAccess: true, where: { legacySourceUrl: { equals: source } } })
  if (known.docs[0]) {
    console.log(`  = ${file} już jest w mediach (#${known.docs[0].id})`)
    return known.docs[0].id
  }
  const data = await sharp(path.join(dataDir, file))
    .rotate()
    .resize({ fit: 'inside', height: 2000, width: 2000, withoutEnlargement: true })
    .toColorspace('srgb')
    .jpeg({ mozjpeg: true, quality: 85 })
    .toBuffer()
  const name = `fb-${path.basename(file, path.extname(file))}.jpg`
  const media = await payload.create({
    collection: 'media',
    data: { alt, legacySourceUrl: source },
    file: { data, mimetype: 'image/jpeg', name, size: data.byteLength },
    overrideAccess: true,
  })
  log.createdMedia.push(media.id)
  console.log(`  ↑ ${file} → media #${media.id}`)
  return media.id
}

async function rollback(file: string) {
  const log = JSON.parse(await readFile(path.resolve(dataDir, file), 'utf8')) as RunLog
  console.log(`Cofnięcie przebiegu ${log.at}: ${log.products.length} kart, ${log.createdMedia.length} plików`)
  if (!apply) return console.log('Na sucho. Dodaj --apply, żeby cofnąć.')
  await confirm()
  for (const p of log.products) {
    await payload.update({ collection: 'products', context, data: p.before as never, draft: true, id: p.id, overrideAccess: true })
    console.log(`  ↺ ${p.slug}: przywrócona poprzednia treść (jako wersja robocza)`)
  }
  for (const id of log.createdMedia) {
    await payload.delete({ collection: 'media', id, overrideAccess: true })
    console.log(`  ✕ media #${id}`)
  }
}

if (rollbackFile) {
  await rollback(rollbackFile)
  process.exit(0)
}

const selection = JSON.parse(await readFile(inputPath, 'utf8')) as { toExisting?: Item[] }
const items = selection.toExisting ?? []
console.log(`Żywa baza · tryb: ${apply ? 'ZAPIS (wersje robocze)' : 'na sucho'} · pozycji: ${items.length}\n`)
if (!items.length) process.exit(0)
if (apply) await confirm()

const log: RunLog = { at: new Date().toISOString(), createdMedia: [], products: [] }
for (const item of items) {
  const found = await payload.find({ collection: 'products', depth: 0, draft: true, limit: 1, overrideAccess: true, where: { slug: { equals: item.product } } })
  const product = found.docs[0]
  const where = `„${item.name}” → ${item.productName} (/pierscionki/${item.product})`
  if (!product) {
    console.log(`! ${where}: nie ma takiej karty, pomijam`)
    continue
  }
  const state = product._status === 'published' ? 'opublikowana → nowa wersja robocza' : 'szkic'
  if (item.action === 'nowy-wariant') {
    console.log(`= ${where}: nowy wariant – pomijam (inny kamień w tym fasonie robimy jako nową kartę)`)
    continue
  }
  if (!item.photos.length) {
    console.log(`! ${where}: brak zdjęć „w katalogu”, pomijam`)
    continue
  }
  if (item.action === 'zamiast-wizualizacji') {
    const variants = product.stoneVariants ?? []
    const i = variants.findIndex((v) => norm(v.stone ?? '') === norm(item.variant))
    if (i < 0) {
      console.log(`! ${where}: karta nie ma wariantu „${item.variant}” (są: ${variants.map((v) => v.stone).join(', ')}), pomijam`)
      continue
    }
    const v = variants[i]
    const alt = stripViz(v.alt ?? '') || `${product.name} – ${item.variant}`
    console.log(`+ ${where} [${state}]`)
    console.log(`    wariant „${v.stone}”: ${v.isVisualization ? 'wizualizacja' : 'zdjęcie'} #${v.image} → prawdziwe zdjęcia z posta (${item.photos.length}), bez znacznika wizualizacji`)
    console.log(`    alt: ${alt}`)
    for (const f of item.photos) console.log(`    · ${f}`)
    if (!apply) continue
    const ids: number[] = []
    for (const f of item.photos) ids.push(await upload(f, alt, log))
    const next = variants.map((x, j) => (j === i ? { ...x, alt, image: ids[0], isVisualization: false, moreImages: ids.slice(1) } : x))
    log.products.push({ action: item.action, before: { stoneVariants: variants }, id: product.id, slug: product.slug })
    await payload.update({ collection: 'products', context, data: { stoneVariants: next }, draft: true, id: product.id, overrideAccess: true })
    console.log(`  ✓ zapisane jako wersja robocza`)
  } else if (item.action === 'dodatek') {
    const media = product.media ?? []
    console.log(`+ ${where} [${state}]: dopisz ${item.photos.length} zdj. do galerii (jest ${media.length})`)
    for (const f of item.photos) console.log(`    · ${f}`)
    if (!apply) continue
    const ids: number[] = []
    for (const f of item.photos) ids.push(await upload(f, `${product.name} – zdjęcie z pracowni`, log))
    log.products.push({ action: item.action, before: { media }, id: product.id, slug: product.slug })
    await payload.update({
      collection: 'products',
      context,
      data: { media: [...media, ...ids.map((asset) => ({ asset, isPrimary: false }))] },
      draft: true,
      id: product.id,
      overrideAccess: true,
    })
    console.log(`  ✓ zapisane jako wersja robocza`)
  }
}

if (apply) {
  const out = path.join(dataDir, `fb-do-istniejacych-${log.at.replace(/[:.]/g, '-')}.json`)
  await writeFile(out, JSON.stringify(log, null, 1))
  console.log(`\nPrzebieg zapisany: ${out} (cofnięcie: --rollback ${path.basename(out)} --apply)`)
} else {
  console.log('\nNa sucho: nic nie zapisano. Zapis: npm run fb:do-istniejacych -- --apply')
}
process.exit(0)
