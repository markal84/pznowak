// Zdjęcia z przeglądu FB do ISTNIEJĄCYCH kart (catalog-selection.json → toExisting), tylko jako wersja robocza.
//
//   npm run fb:do-istniejacych                 na sucho: co się zmieni, bez zapisu
//   npm run fb:do-istniejacych -- --apply      zapis (wymaga wpisania słowa PRODUKCJA w terminalu albo kliknięcia
//                                              „Zastosuj eksport” na tablicy przeglądu)
//
// Obsługuje:
//   zamiast-wizualizacji  wariant kamienia, który ma dziś wizualizację, dostaje prawdziwe zdjęcia z posta
//                         (image = pierwsze zdjęcie, moreImages = kolejne, isVisualization = false, alt bez „(wizualizacja)”).
//                         Poprzednia wizualizacja zostaje w bibliotece mediów (do cofnięcia ręcznie albo --rollback).
//   dodatek               zdjęcia dopisane na koniec galerii karty (media); z wariantem: do wariantu. Gdy karta nie ma
//                         jeszcze tego wariantu, a są prawdziwe zdjęcia (np. od Kamili), wariant powstaje (kolor kółka
//                         z nazwy kamienia, do sprawdzenia w panelu); sam film czeka na zdjęcia.
//   nowy-wariant          pomijany z komunikatem (decyzja: inny kamień w tym fasonie = nowa karta).
// Opublikowana karta dostaje NOWĄ WERSJĘ ROBOCZĄ (draft: true): strona się nie zmienia, dopóki Marcin nie opublikuje
// zmian w panelu. Szkic zostaje szkicem.
//
// Baza: zawsze żywa baza strony, rozpoznana po endpoincie Neon (live-db.ts), niezależnie od nazw gałęzi i plików .env.
// Opcje: --input <catalog-selection.json>, --data <katalog z media/>,
// --env-root <katalog z cms/.env* i backend/.env*>, --rollback <plik przebiegu> [--apply].
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import sharp from 'sharp'

import { guessSwatch } from '../src/lib/stone-variants'
import { confirmedOnBoard, isLiveDatabase, loadLiveEnv } from './live-db'

const run = promisify(execFile)
const args = process.argv.slice(2)
const option = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const apply = args.includes('--apply')
const rollbackFile = option('--rollback')

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const envRoot = path.resolve(option('--env-root') ?? repoRoot)
const dataDir = path.resolve(option('--data') ?? path.join(repoRoot, 'data/facebook'))
const inputPath = path.resolve(option('--input') ?? path.join(dataDir, 'catalog-selection.json'))
await loadLiveEnv(envRoot)
if (!isLiveDatabase()) throw new Error('Zmienne nie wskazują żywej bazy')

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
  // Tablica przeglądu (przycisk „Zastosuj eksport”) to świadome potwierdzenie Marcina zamiast wpisywania słowa.
  if (confirmedOnBoard()) {
    console.log('Zapis potwierdzony na tablicy przeglądu (przycisk „Zastosuj eksport”).')
    return
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question('Zapis do ŻYWEJ bazy (tylko wersje robocze). Wpisz PRODUKCJA, aby kontynuować: ')
  rl.close()
  if (answer.trim() !== 'PRODUKCJA') throw new Error('Przerwano: brak potwierdzenia')
}

const isVideoFile = (file: string) => /\.(mp4|mov|m4v|webm)$/i.test(file)

// Film: MP4 H.264 do 1280 px; inne kodeki z FB (VP9/AV1) są przekodowywane (tak samo jak w import-fb-catalog.ts).
async function prepareVideo(fullPath: string): Promise<{ data: Buffer; mimetype: string; name: string }> {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,codec_name', '-of', 'json', fullPath])
  const [v] = (JSON.parse(stdout) as { streams: Array<{ codec_name: string; height: number; width: number }> }).streams
  const copy = v.codec_name === 'h264' && Math.max(v.width, v.height) <= 1280
  const video = copy
    ? ['-c:v', 'copy']
    : ['-vf', "scale=w='min(1280,iw)':h='min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2", '-c:v', 'libx264', '-crf', '23', '-preset', 'slow', '-pix_fmt', 'yuv420p']
  const dir = await mkdtemp(path.join(tmpdir(), 'fb-video-'))
  try {
    const out = path.join(dir, 'out.mp4')
    await run('ffmpeg', ['-v', 'error', '-i', fullPath, '-map', '0:v:0', '-map', '0:a?', '-map_metadata', '-1', '-map_chapters', '-1', ...video, '-c:a', 'copy', '-movflags', '+faststart', out])
    return { data: await readFile(out), mimetype: 'video/mp4', name: `fb-${path.basename(fullPath, path.extname(fullPath))}.mp4` }
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

async function upload(file: string, alt: string, log: RunLog): Promise<number> {
  const base = file.replace(/^media\//, '')
  const source = `fb:${base}`
  // Import nowych kart zapisuje źródło jako „fb:<post>/<plik>”: ten sam plik wgrany tamtą drogą nie wraca drugi raz.
  const viaImport = `fb:${base.split('_')[0]}/${base}`
  const known = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { or: [{ legacySourceUrl: { equals: source } }, { legacySourceUrl: { equals: viaImport } }] },
  })
  if (known.docs[0]) {
    console.log(`  = ${file} już jest w mediach (#${known.docs[0].id})`)
    return known.docs[0].id
  }
  if (isVideoFile(file)) {
    const prepared = await prepareVideo(path.join(dataDir, file))
    const media = await payload.create({
      collection: 'media',
      data: { alt, legacySourceUrl: source },
      file: { ...prepared, size: prepared.data.byteLength },
      overrideAccess: true,
    })
    log.createdMedia.push(media.id)
    console.log(`  ↑ ${file} → media #${media.id} (film)`)
    return media.id
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
const waiting: string[] = []
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
  if (!item.photos.length && !item.videos?.length) {
    console.log(`! ${where}: brak zdjęć i filmu „w katalogu”, pomijam`)
    continue
  }
  const videoFile = item.videos?.[0]
  if (item.videos && item.videos.length > 1) console.log(`  ! ${item.videos.length} filmów, wgrywam tylko pierwszy (${videoFile}), reszta czeka na galerię filmów`)
  if (item.action === 'zamiast-wizualizacji' || (item.action === 'dodatek' && item.variant)) {
    const variants = product.stoneVariants ?? []
    const i = variants.findIndex((v) => norm(v.stone ?? '') === norm(item.variant))
    const swatch = guessSwatch(item.variant)
    if (item.action === 'dodatek' && i < 0 && item.photos.length && swatch) {
      // Prawdziwe zdjęcia wariantu, którego karta jeszcze nie ma (np. Hesperia → Turmalin od Kamili): wariant powstaje.
      const alt = `${product.name} – ${item.variant}`
      console.log(`+ ${where} [${state}]: nowy wariant „${item.variant}” (kółko: ${swatch}) z ${item.photos.length} zdj.${videoFile ? ' + film' : ''}`)
      for (const f of item.photos) console.log(`    · ${f}`)
      if (!apply) continue
      const ids: number[] = []
      for (const f of item.photos) ids.push(await upload(f, alt, log))
      const entry: Record<string, unknown> = { alt, image: ids[0], isVisualization: false, moreImages: ids.slice(1), stone: item.variant, swatch }
      if (videoFile) entry.video = await upload(videoFile, `${alt} – film`, log)
      log.products.push({ action: 'nowy-wariant-ze-zdjec', before: { stoneVariants: variants }, id: product.id, slug: product.slug })
      await payload.update({ collection: 'products', context, data: { stoneVariants: [...variants, entry] }, draft: true, id: product.id, overrideAccess: true })
      console.log(`  ✓ zapisane jako wersja robocza (kolor kółka i nazwę kamienia sprawdź w panelu)`)
      continue
    }
    if (item.action === 'dodatek' && (i < 0 || variants[i].isVisualization)) {
      // Decyzja zostaje w selection.json: kolejne uruchomienie (po dodaniu wariantu z prawdziwym zdjęciem) dopnie film i zdjęcia.
      const why =
        i >= 0 ? 'wariant ma na razie tylko wizualizację'
        : item.photos.length ? `wariantu jeszcze nie ma, a z nazwy „${item.variant}” nie umiem dobrać koloru kółka (dodaj wariant w panelu)`
        : 'wariantu jeszcze nie ma; sam film czeka na zdjęcia tego kamienia'
      console.log(`⏸ ${where}: wariant „${item.variant}” – ${why}; czeka (${item.photos.length} zdj., ${item.videos?.length ?? 0} film)`)
      waiting.push(`${item.productName} → ${item.variant}: ${why}`)
      continue
    }
    if (i < 0) {
      console.log(`! ${where}: karta nie ma wariantu „${item.variant}” (są: ${variants.map((v) => v.stone).join(', ')}), pomijam`)
      continue
    }
    const v = variants[i]
    const alt = stripViz(v.alt ?? '') || `${product.name} – ${item.variant}`
    // Wariant, który ma już prawdziwe zdjęcie (np. uzupełnione ręcznie po podpowiedzi modelu), zostaje bez zmian w zdjęciach:
    // podmiana zdjęć dotyczy tylko wizualizacji, dla prawdziwego wariantu zdjęcia z posta idą na koniec moreImages.
    const replace = item.action === 'zamiast-wizualizacji' && Boolean(v.isVisualization)
    const more = (v.moreImages ?? []).map((m) => (typeof m === 'object' ? m.id : m))
    console.log(`+ ${where} [${state}]`)
    console.log(
      `    wariant „${v.stone}”: ${v.isVisualization ? 'wizualizacja' : 'prawdziwe zdjęcie'} #${typeof v.image === 'object' ? v.image.id : v.image} → ` +
        (replace
          ? `prawdziwe zdjęcia z posta (${item.photos.length}), bez znacznika wizualizacji`
          : `zdjęcia dopisane do moreImages (${item.photos.length}), główne zostaje`),
    )
    for (const f of item.photos) console.log(`    · ${f}`)
    const hasVideo = Boolean(v.video)
    if (videoFile) console.log(`    ${hasVideo ? '⏸' : '▶'} film ${videoFile} ${hasVideo ? '– wariant ma już film, pomijam' : '→ pole „Film” wariantu'}`)
    if (!apply) continue
    const ids: number[] = []
    for (const f of item.photos) ids.push(await upload(f, alt, log))
    const patch: Record<string, unknown> = {}
    if (replace && ids.length) Object.assign(patch, { alt, image: ids[0], isVisualization: false, moreImages: ids.slice(1) })
    else if (ids.length) patch.moreImages = [...more, ...ids]
    if (videoFile && !hasVideo) patch.video = await upload(videoFile, `${product.name} – ${item.variant} – film`, log)
    if (!Object.keys(patch).length) continue
    const next = variants.map((x, j) => (j === i ? { ...x, ...patch } : x))
    log.products.push({ action: item.action, before: { stoneVariants: variants }, id: product.id, slug: product.slug })
    await payload.update({ collection: 'products', context, data: { stoneVariants: next }, draft: true, id: product.id, overrideAccess: true })
    console.log(`  ✓ zapisane jako wersja robocza`)
  } else if (item.action === 'dodatek') {
    const media = product.media ?? []
    const ids0 = media.map((m) => (typeof m.asset === 'object' ? m.asset.id : m.asset))
    const existingVideos = ids0.length
      ? await payload.find({ collection: 'media', depth: 0, limit: 1, overrideAccess: true, where: { and: [{ id: { in: ids0 } }, { mimeType: { like: 'video/' } }] } })
      : { docs: [] }
    // Film, który karta już ma (ten sam plik z FB wgrany wcześniej), nie jest dopisywany drugi raz.
    const sameVideo = videoFile
      ? await payload.find({ collection: 'media', depth: 0, limit: 1, overrideAccess: true, where: { legacySourceUrl: { equals: `fb:${videoFile.replace(/^media\//, '')}` } } })
      : { docs: [] }
    const alreadyThere = sameVideo.docs.some((d) => ids0.includes(d.id))
    const addVideo = Boolean(videoFile) && !existingVideos.docs.length && !alreadyThere
    console.log(`+ ${where} [${state}]: dopisz ${item.photos.length} zdj.${addVideo ? ' + film' : ''} do galerii (jest ${media.length})`)
    for (const f of item.photos) console.log(`    · ${f}`)
    if (videoFile) console.log(`    ${addVideo ? '▶' : '⏸'} film ${videoFile}${addVideo ? '' : ' – karta ma już film (limit jednego), pomijam'}`)
    if (!apply) continue
    const ids: number[] = []
    for (const f of item.photos) ids.push(await upload(f, `${product.name} – zdjęcie z pracowni`, log))
    if (addVideo) ids.push(await upload(videoFile as string, `${product.name} – film`, log))
    // Ponowny przebieg tego samego eksportu (np. drugi klik „Zastosuj eksport”) nie dubluje zdjęć w galerii.
    const newIds = [...new Set(ids)].filter((id) => !ids0.includes(id))
    if (!newIds.length) {
      if (ids.length) console.log('  = te zdjęcia są już w galerii karty – nic nie dopisuję')
      continue
    }
    log.products.push({ action: item.action, before: { media }, id: product.id, slug: product.slug })
    await payload.update({
      collection: 'products',
      context,
      data: { media: [...media, ...newIds.map((asset) => ({ asset, isPrimary: false }))] },
      draft: true,
      id: product.id,
      overrideAccess: true,
    })
    console.log(`  ✓ zapisane jako wersja robocza`)
  }
}

if (waiting.length) console.log(`\nCzekające (${waiting.length}), zrobią się same przy kolejnym uruchomieniu, gdy warunek się spełni:\n${waiting.map((w) => `  ⏸ ${w}`).join('\n')}`)

if (apply) {
  const out = path.join(dataDir, `fb-do-istniejacych-${log.at.replace(/[:.]/g, '-')}.json`)
  await writeFile(out, JSON.stringify(log, null, 1))
  console.log(`\nPrzebieg zapisany: ${out} (cofnięcie: --rollback ${path.basename(out)} --apply)`)
} else {
  console.log('\nNa sucho: nic nie zapisano. Zapis: npm run fb:do-istniejacych -- --apply')
}
process.exit(0)
