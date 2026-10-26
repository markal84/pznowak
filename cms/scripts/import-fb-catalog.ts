// Import pierścionków z przeglądu FB (catalog-selection.json) do Payload jako szkice.
//
//   npm run import:fb -- --env staging                    na sucho: plan i raport, bez zapisu
//   npm run import:fb -- --env staging --apply            nowe pierścionki (szkice) + wgranie plików
//   npm run import:fb -- --env staging --apply --gallery  tylko uzupełnienia galerii (wersja robocza produktu)
//   npm run import:fb -- --env staging --rollback <plik przebiegu> [--apply]   cofnięcie przebiegu (tylko staging)
//
// Opcje: --input <catalog-selection.json> (domyślnie data/facebook/), --data <katalog z media/> (domyślnie
// data/facebook), --env-root <katalog z cms/.env* i backend/.env*> (domyślnie korzeń repozytorium).
// Produkcja: --env production; --apply wymaga wpisania słowa PRODUKCJA w terminalu.
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { parse } from 'dotenv'
import sharp from 'sharp'

import {
  buildImportPlan,
  type ExistingProduct,
  type FbCatalogSelection,
  type ImportPlan,
  type PlannedFile,
} from '../src/lib/fb-import'
import type { Product } from '../src/payload-types'

const run = promisify(execFile)
const args = process.argv.slice(2)
const option = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const flag = (name: string) => args.includes(name)

const env = option('--env')
const apply = flag('--apply')
const galleryMode = flag('--gallery')
const rollbackFile = option('--rollback')
if (env !== 'staging' && env !== 'production') {
  throw new Error('Podaj --env staging albo --env production')
}
if (rollbackFile && env !== 'staging') throw new Error('--rollback działa tylko na stagingu')

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const envRoot = path.resolve(option('--env-root') ?? repoRoot)
const dataDir = path.resolve(option('--data') ?? path.join(repoRoot, 'data/facebook'))
const inputPath = path.resolve(option('--input') ?? path.join(dataDir, 'catalog-selection.json'))
const outDir = path.dirname(inputPath)

// Zmienne środowiska przed importem konfiguracji Payload (prefiks Blob i baza są czytane przy imporcie).
const envFiles = [
  'cms/.env',
  'cms/.env.local',
  env === 'staging' ? 'backend/.env.staging.local' : 'backend/.env.local',
]
for (const file of envFiles) {
  Object.assign(process.env, parse(await readFile(path.join(envRoot, file))))
}
if (process.env.NEON_BRANCH !== env) {
  throw new Error(`Zmienne wskazują NEON_BRANCH=${process.env.NEON_BRANCH ?? '?'}, a nie ${env}`)
}
const dbHost = new URL(process.env.DATABASE_URL ?? 'postgres://brak').hostname
console.log(`Środowisko: ${env} (${dbHost}) · tryb: ${apply ? 'ZAPIS' : 'na sucho'}`)

const { getPayload } = await import('payload')
const { sql } = await import('@payloadcms/db-postgres')
const { default: config } = await import('../src/payload.config')
const { isStagingEnvironment, STAGING_MEDIA_PREFIX } = await import('../src/lib/staging-media')
if (env === 'staging' && !isStagingEnvironment()) throw new Error('Konfiguracja nie widzi stagingu')

const payload = await getPayload({ config: await config })

type RunLog = {
  createdMedia: number[]
  createdProducts: number[]
  env: string
  galleryDrafts: Array<{ productId: number; added: number[] }>
  runId: string
}

async function confirmProduction() {
  if (env !== 'production' || !apply) return
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question('Zapis na PRODUKCJI. Wpisz PRODUKCJA, aby kontynuować: ')
  rl.close()
  if (answer.trim() !== 'PRODUKCJA') throw new Error('Przerwano: brak potwierdzenia')
}

async function hasSourceColumn(): Promise<boolean> {
  const result = (await payload.db.drizzle.execute(
    sql`SELECT 1 FROM information_schema.columns WHERE table_name = 'cms_products' AND column_name = 'source_facebook_key'`,
  )) as { rows: unknown[] }
  return result.rows.length > 0
}

// Bez migracji (tylko na sucho) czytamy produkty bez kolumn source_*, a żaden produkt nie ma jeszcze klucza FB.
async function loadState(migrated: boolean) {
  const media = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 2000,
    overrideAccess: true,
    pagination: false,
    where: { legacySourceUrl: { like: 'fb:' } },
  })
  const mediaBySource = new Map(
    media.docs
      .filter((m) => m.legacySourceUrl?.startsWith('fb:'))
      .map((m) => [m.legacySourceUrl as string, { id: m.id }] as const),
  )
  const found = await payload.find({
    collection: 'products',
    depth: 1,
    draft: true,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    ...(migrated
      ? {}
      : { select: { _status: true, media: true, name: true, slug: true, sortOrder: true } }),
  })
  const products: ExistingProduct[] = found.docs.map((p) => ({
    facebookKey: (p as Product).source?.facebookKey,
    id: p.id,
    media: (p.media ?? []).map((entry) => {
      const asset = typeof entry.asset === 'object' ? entry.asset : null
      return {
        alt: entry.alt,
        asset: {
          id: asset?.id ?? (entry.asset as number),
          mimeType: asset?.mimeType,
          source: asset?.legacySourceUrl,
        },
        isPrimary: entry.isPrimary,
      }
    }),
    name: p.name,
    slug: p.slug,
    sortOrder: p.sortOrder,
    status: p._status ?? 'draft',
  }))
  return { mediaBySource, products }
}

type VideoInfo = { codec: string; duration: number; height: number; size: number; width: number }

async function probeVideo(fullPath: string): Promise<VideoInfo> {
  const { stdout } = await run('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'format=duration,size:stream=width,height,codec_name',
    '-of',
    'json',
    fullPath,
  ])
  const info = JSON.parse(stdout) as {
    format: { duration: string; size: string }
    streams: Array<{ codec_name: string; height: number; width: number }>
  }
  const [video] = info.streams
  return {
    codec: video.codec_name,
    duration: Number(info.format.duration),
    height: video.height,
    size: Number(info.format.size),
    width: video.width,
  }
}

const VIDEO_MAX = 1280

// H.264 do 1280 px idzie bez zmian; VP9/AV1 z FB (Safari i starsze iPhone'y nie odtworzą ich w MP4) i większe
// filmy są przekodowane: CRF 23 przy 720×1280 wygląda jak źródło, a plik jest ok. 2× mniejszy niż VP9 1080p.
function canCopyVideo(v: VideoInfo): boolean {
  return v.codec === 'h264' && Math.max(v.width, v.height) <= VIDEO_MAX
}

async function describeFile(file: PlannedFile) {
  const fullPath = path.join(dataDir, file.file)
  if (file.kind === 'photo') {
    const meta = await sharp(fullPath).metadata()
    const long = Math.max(meta.width ?? 0, meta.height ?? 0)
    const note = long > 2000 ? ' → 2000 px' : long < 1000 ? ' – mała rozdzielczość' : ''
    return `${meta.width}×${meta.height}${note}${meta.exif ? ', EXIF do usunięcia' : ''}`
  }
  const v = await probeVideo(fullPath)
  const target = canCopyVideo(v) ? 'bez przekodowania' : '→ H.264 ≤ 1280 px'
  return `${v.width}×${v.height} ${v.codec} ${target}, ${Math.round(v.duration)} s, ${(v.size / 1e6).toFixed(1)} MB`
}

/** Plik pod www. Zdjęcie: JPEG q85, najwyżej 2000 px, sRGB, bez metadanych. Film: MP4 H.264, bez metadanych. */
async function prepareFile(
  file: PlannedFile,
): Promise<{ data: Buffer; mimetype: string; name: string }> {
  const fullPath = path.join(dataDir, file.file)
  const base = path.basename(file.file, path.extname(file.file))
  if (file.kind === 'photo') {
    const data = await sharp(fullPath)
      .rotate()
      .resize({ fit: 'inside', height: 2000, width: 2000, withoutEnlargement: true })
      .toColorspace('srgb')
      .jpeg({ mozjpeg: true, quality: 85 })
      .toBuffer()
    return { data, mimetype: 'image/jpeg', name: `fb-${base}.jpg` }
  }
  const video = canCopyVideo(await probeVideo(fullPath))
    ? ['-c:v', 'copy']
    : [
        '-vf',
        `scale=w='min(${VIDEO_MAX},iw)':h='min(${VIDEO_MAX},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,
        '-c:v',
        'libx264',
        '-crf',
        '23',
        '-preset',
        'slow',
        '-pix_fmt',
        'yuv420p',
      ]
  const dir = await mkdtemp(path.join(tmpdir(), 'fb-import-'))
  try {
    const out = path.join(dir, `fb-${base}.mp4`)
    await run('ffmpeg', [
      '-v',
      'error',
      '-i',
      fullPath,
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-map_metadata',
      '-1',
      '-map_chapters',
      '-1',
      ...video,
      '-c:a',
      'copy',
      '-movflags',
      '+faststart',
      out,
    ])
    return { data: await readFile(out), mimetype: 'video/mp4', name: `fb-${base}.mp4` }
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

function printPlan(plan: ImportPlan, details: Map<string, string>) {
  const s = plan.summary
  console.log(
    `\nNowe pierścionki (szkice): ${s.productsToCreate} · już w CMS: ${s.productsExisting} · uzupełnienia galerii: ${s.galleryToAppend}` +
      ` · pliki do wgrania: ${s.filesToUpload} · użyte ponownie: ${s.filesReused} · filmy czekające na galerię: ${s.pendingVideos}` +
      ` · ostrzeżenia: ${s.warnings}\n`,
  )
  for (const p of plan.products) {
    const head =
      p.action === 'create' ? '+ UTWÓRZ SZKIC' : '= JEST (id ' + p.existingProductId + '), pomijam'
    console.log(`${head}: ${p.data.name}  /pierscionki/${p.data.slug}`)
    console.log(
      `    kamień: ${p.data.stone || '–'} · metal: ${p.data.metal || '–'} · karaty: ${p.data.carats || '–'} · czystość: ${p.data.clarity || '–'}${p.parsed.certificate ? ` · certyfikat: ${p.parsed.certificate}` : ''}`,
    )
    console.log(`    krótki opis: ${p.data.lead || '–'}`)
    for (const f of p.files) {
      console.log(
        `    ${f.isPrimary ? '★' : '·'} ${f.file} (${details.get(f.file) ?? '?'})${f.existingMediaId ? ` – już w media #${f.existingMediaId}` : ''}`,
      )
    }
    for (const v of p.pendingVideos) console.log(`    ⏸ ${v} – czeka na galerię filmów`)
    for (const w of p.warnings) console.log(`    ! ${w}`)
  }
  console.log(
    galleryMode
      ? '\nUzupełnienia galerii (ten przebieg):'
      : '\nUzupełnienia galerii (osobny krok: --gallery):',
  )
  for (const g of plan.gallery) {
    const head =
      g.action === 'append'
        ? `+ DOPISZ ${g.files.length} do „${g.productName}” (id ${g.productId}, ${g.productStatus === 'published' ? 'opublikowany → nowa wersja robocza' : 'szkic'})`
        : `= POMIŃ „${g.ring}”`
    console.log(head)
    for (const f of g.files) console.log(`    · ${f.file} (${details.get(f.file) ?? '?'})`)
    for (const v of g.pendingVideos) console.log(`    ⏸ ${v} – czeka na galerię filmów`)
    for (const w of g.warnings) console.log(`    ! ${w}`)
  }
  if (plan.warnings.length) {
    console.log('\nOstrzeżenia z eksportu:')
    for (const w of plan.warnings) console.log(`  ! ${w}`)
  }
}

async function ensureMedia(
  file: PlannedFile,
  cache: Map<string, number>,
  log: RunLog,
): Promise<number> {
  const known = cache.get(file.source)
  if (known) return known
  const prepared = await prepareFile(file)
  const media = await payload.create({
    collection: 'media',
    data: { alt: file.alt, legacySourceUrl: file.source },
    file: { ...prepared, size: prepared.data.byteLength },
    overrideAccess: true,
  })
  if (!/^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//.test(media.url ?? '')) {
    throw new Error(`Plik ${file.file} nie trafił do Vercel Blob (media #${media.id})`)
  }
  if (env === 'staging' && (media as { prefix?: string }).prefix !== STAGING_MEDIA_PREFIX) {
    throw new Error(`Plik ${file.file} poza prefiksem stagingu`)
  }
  cache.set(file.source, media.id)
  log.createdMedia.push(media.id)
  console.log(`  ↑ ${file.file} → media #${media.id}`)
  return media.id
}

async function rollback(file: string) {
  const log = JSON.parse(await readFile(path.resolve(file), 'utf8')) as RunLog
  if (log.env !== 'staging') throw new Error('Ten przebieg nie był na stagingu')
  console.log(
    `Cofnięcie przebiegu ${log.runId}: ${log.createdProducts.length} produktów, ${log.createdMedia.length} plików` +
      (log.galleryDrafts.length
        ? `; wersje robocze galerii (${log.galleryDrafts.length}) cofnij w panelu: Wersje → przywróć poprzednią`
        : ''),
  )
  if (!apply) return console.log('Na sucho: nic nie usunięto. Dodaj --apply.')
  for (const id of log.createdProducts) {
    await payload.delete({ collection: 'products', id, overrideAccess: true })
  }
  for (const id of log.createdMedia) {
    await payload.delete({ collection: 'media', id, overrideAccess: true })
  }
  console.log('Cofnięto.')
}

try {
  const migrated = await hasSourceColumn()
  if (!migrated) {
    const message =
      'Na tej bazie brak migracji 20261026_125727_fb_import_zrodlo (npx payload migrate)'
    if (apply || rollbackFile) throw new Error(message)
    console.log(`! ${message}; na sucho zakładam, że żaden produkt nie ma jeszcze klucza FB.`)
  }
  if (rollbackFile) {
    await rollback(rollbackFile)
  } else {
    const selection = JSON.parse(await readFile(inputPath, 'utf8')) as FbCatalogSelection
    console.log(
      `Wejście: ${inputPath} (eksport ${selection.generatedAt}, decyzje rev ${selection.selectionRev})`,
    )
    const plan = buildImportPlan(selection, await loadState(migrated))
    const files = [
      ...plan.products.flatMap((p) => p.files),
      ...plan.gallery.flatMap((g) => g.files),
    ]
    const details = new Map<string, string>()
    for (const f of files) details.set(f.file, await describeFile(f))
    printPlan(plan, details)

    const planPath = path.join(outDir, `import-plan-${env}.json`)
    await writeFile(
      planPath,
      JSON.stringify(
        { createdAt: new Date().toISOString(), env, input: inputPath, ...plan },
        null,
        1,
      ),
    )
    console.log(`\nPlan zapisany: ${planPath}`)

    if (apply) {
      await confirmProduction()
      const runId = new Date().toISOString().replace(/[:.]/g, '-')
      const log: RunLog = { createdMedia: [], createdProducts: [], env, galleryDrafts: [], runId }
      const logPath = path.join(outDir, `import-run-${env}-${runId}.json`)
      const cache = new Map<string, number>()
      try {
        if (!galleryMode) {
          for (const p of plan.products.filter((item) => item.action === 'create')) {
            const media = []
            for (const f of p.files) {
              media.push({
                alt: f.alt,
                asset: f.existingMediaId ?? (await ensureMedia(f, cache, log)),
                isPrimary: f.isPrimary,
              })
            }
            const product = await payload.create({
              collection: 'products',
              data: {
                ...p.data,
                _status: 'draft',
                generateSlug: false,
                media,
                source: {
                  facebookKey: p.key,
                  facebookPayload: {
                    importRun: runId,
                    parsed: p.parsed,
                    pendingVideos: p.pendingVideos,
                    posts: p.posts,
                  },
                },
              },
              draft: true,
              overrideAccess: true,
            })
            log.createdProducts.push(product.id)
            console.log(`+ szkic #${product.id}: ${p.data.name}`)
          }
        } else {
          for (const g of plan.gallery.filter(
            (item) => item.action === 'append' && item.productId,
          )) {
            const current = await payload.findByID({
              collection: 'products',
              depth: 0,
              draft: true,
              id: g.productId as number,
              overrideAccess: true,
            })
            const added: number[] = []
            for (const f of g.files)
              added.push(f.existingMediaId ?? (await ensureMedia(f, cache, log)))
            const media = [
              ...(current.media ?? []).map((m) => ({
                alt: m.alt,
                asset: typeof m.asset === 'object' ? m.asset.id : m.asset,
                isPrimary: m.isPrimary,
              })),
              ...g.files.map((f, i) => ({ alt: f.alt, asset: added[i], isPrimary: false })),
            ]
            await payload.update({
              collection: 'products',
              data: { media },
              draft: true,
              id: current.id,
              overrideAccess: true,
            })
            log.galleryDrafts.push({ added, productId: current.id })
            console.log(`+ galeria „${g.productName}”: +${added.length} (wersja robocza)`)
          }
        }
      } finally {
        await writeFile(logPath, JSON.stringify(log, null, 1))
        console.log(`Przebieg zapisany: ${logPath}`)
      }
    } else {
      console.log('Na sucho: nic nie zapisano w CMS ani w Blob.')
    }
  }
} finally {
  await payload.destroy()
}
// Pula połączeń i wątki sharp potrafią trzymać proces po destroy().
process.exit(process.exitCode ?? 0)
