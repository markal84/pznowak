/**
 * Wizualizacje kamieni przez Codex headless (zlecenie W): zdjęcie karty → ten sam pierścionek z innym kamieniem.
 *
 *   npm run warianty:wizualizacje                         plan: co powstanie i ile wywołań (nic nie woła)
 *   npm run warianty:wizualizacje -- --apply              generuje, ocenia i zapisuje wynik
 *   npm run warianty:wizualizacje -- --apply --tylko cyane,daphne-rubin   tylko wybrane fasony / warianty
 *   opcje: --proby N (najwyżej 3 na obraz), --rownolegle N (domyślnie 3), --dane <katalog data/> (domyślnie data/ w repo),
 *          --ponow (warianty bez przyjętego obrazu dostają nową serię prób; stare zostają w historii)
 *
 * Na obraz: (1) opis zdjęcia źródłowego, raz na fason (Terra medium, tylko do odczytu) – z niego prompt nazywa szlif
 * i oprawę; (2) generowanie: Terra low przekazuje prompt narzędziu do obrazów, wejście = zdjęcie karty + 2 wzorce koloru;
 * (3) szybki filtr kadru (dHash) – inny kadr odpada bez wywołania modelu; (4) ocena Terrą medium (oryginał, wynik,
 * wzorce), przy odrzuceniu wskazówka trafia do kolejnej próby. Po pierwszym przyjętym wariancie fason dostaje „maskę
 * fasonu” (ten sam kamień na tym samym zdjęciu) – kolejne warianty wycinają co najmniej ten obszar, więc przy małej
 * różnicy koloru (niebieski → granatowy/biały) na krawędzi kamienia nie zostaje stary kolor. Program: CODEX_BIN, konto ChatGPT (bez klucza API).
 *
 * Wynik: `seed/warianty/obrazy/<slug>-<kamien>.webp` (proporcje oryginału, ≤ 300 KB), `seed/warianty/warianty-w.json`
 * (format `warianty.json` z V; tylko warianty, których jeszcze nie ma w `warianty.json` – po akceptacji Kamili wpisy
 * przenosimy tam ręcznie, a ten plik przy następnym przebiegu znika), arkusz `seed/warianty/podglad-<data>.html`. Próby, oceny i liczniki: `data/warianty-w/`
 * (poza gitem). Ponowne uruchomienie pomija przyjęte obrazy. Nic nie publikuje – na staging trafia dopiero przez V.
 */
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'

import sharp from 'sharp'

import { IMAGES_DIR, loadSpecs, WARIANTY_DIR } from './warianty-v-logic'
import { composite, dHash, toWebp } from './wizualizacje-w-obraz'
import {
  CHECK_MODEL,
  CHECK_SCHEMA,
  checkPrompt,
  DESCRIBE_SCHEMA,
  describePrompt,
  firstExisting,
  GEN_MODEL,
  generationPrompt,
  hamming,
  isAccepted,
  jobs as allJobs,
  loadConfig,
  MAX_ATTEMPTS,
  MAX_HASH_DISTANCE,
  previewHtml,
  PROPOSALS_PATH,
  proposals,
  REPO_ROOT,
  type Check,
  type Description,
  type Job,
} from './wizualizacje-w-logic'

const arg = (name: string) => {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const applyChanges = process.argv.includes('--apply')
const retryRejected = process.argv.includes('--ponow')
const only = (arg('--tylko') ?? '').split(',').filter(Boolean)
const maxAttempts = Math.min(MAX_ATTEMPTS, Number(arg('--proby') ?? MAX_ATTEMPTS))
const parallel = Math.max(1, Number(arg('--rownolegle') ?? 3))
const dataDir = path.resolve(arg('--dane') ?? path.join(REPO_ROOT, 'data'))
const workDir = path.join(dataDir, 'warianty-w')
const CODEX_BIN = process.env.CODEX_BIN ?? '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex'
const CODEX_HOME = process.env.CODEX_HOME ?? path.join(homedir(), '.codex')
const TIMEOUT_MS = 10 * 60 * 1000
const today = new Date().toISOString().slice(0, 10)

// ---------- plan ----------

const config = loadConfig()
const todo = allJobs(config, only)
if (!todo.length) throw new Error(`Brak wariantów dla --tylko ${only.join(',')}`)

const sources = new Map<string, string>()
const refs = new Map<string, { slug: string; file: string; pomocniczy: boolean }[]>()
const missing: string[] = []
for (const job of todo) {
  const source = firstExisting(dataDir, job.design.zrodlo)
  if (source) sources.set(job.design.slug, source)
  else missing.push(`${job.design.slug}: brak zdjęcia źródłowego (${job.design.zrodlo.join(' | ')})`)
  const found = job.stone.wzorce.flatMap((w) => {
    const file = firstExisting(dataDir, w.pliki)
    return file ? [{ slug: w.slug, file, pomocniczy: Boolean(w.pomocniczy) }] : []
  })
  if (found.length) refs.set(job.stone.key, found)
  else missing.push(`${job.stone.key}: brak wzorca koloru – nie zgaduję, wariant pominięty`)
}
const runnable = todo.filter((job) => sources.has(job.design.slug) && refs.has(job.stone.key))

type Attempt = {
  n: number
  file: string
  thread: string
  seconds: number
  tokens: number
  hashDistance: number | null
  placement?: { area: number; alignment: { scale: number; dx: number; dy: number; cost: number }; designMask?: boolean } | null
  check: Check | null
  accepted: boolean
  reason: string
}
type State = {
  descriptions: Record<string, Description & { seconds: number; tokens: number }>
  jobs: Record<string, { attempts: Attempt[]; accepted: string | null; earlier?: Attempt[] }>
}
const statePath = path.join(workDir, 'stan.json')
const state: State = existsSync(statePath)
  ? JSON.parse(readFileSync(statePath, 'utf8'))
  : { descriptions: {}, jobs: {} }
const saveState = () => writeFileSync(statePath, JSON.stringify(state, null, 1))

if (retryRejected && applyChanges) {
  for (const job of runnable) {
    const entry = state.jobs[job.id]
    if (entry && !entry.accepted && entry.attempts.length) {
      entry.earlier = [...(entry.earlier ?? []), ...entry.attempts]
      entry.attempts = []
    }
  }
}
const designs = [...new Set(runnable.map((job) => job.design.slug))]
const pending = runnable.filter((job) => {
  const entry = state.jobs[job.id]
  return !entry?.accepted && (retryRejected || (entry?.attempts.length ?? 0) < maxAttempts)
})
console.log(`Fasony: ${designs.join(', ')} · wariantów: ${runnable.length} (do zrobienia ${pending.length})`)
for (const job of runnable) {
  const done = state.jobs[job.id]?.accepted ? ' – już przyjęty' : ''
  const refList = refs.get(job.stone.key)!.map((r) => r.slug).join(', ')
  console.log(`  ${job.id.padEnd(30)} ${path.basename(sources.get(job.design.slug)!)} · wzorce: ${refList}${done}`)
}
for (const problem of missing) console.log(`  ! ${problem}`)
const describeCalls = designs.filter((slug) => !state.descriptions[slug]).length
console.log(
  `Wywołania Codexa: opis ${describeCalls} + najwyżej ${pending.length * maxAttempts} generowań (${GEN_MODEL.id} ${GEN_MODEL.effort})` +
    ` + najwyżej ${pending.length * maxAttempts} ocen (${CHECK_MODEL.id} ${CHECK_MODEL.effort}); próby na obraz: ${maxAttempts}`,
)
if (!applyChanges) {
  console.log('Podgląd. Dodaj --apply, żeby wywołać Codexa.')
  process.exit(0)
}
if (!existsSync(CODEX_BIN)) throw new Error(`Nie ma programu Codex: ${CODEX_BIN} (ustaw CODEX_BIN)`)
mkdirSync(path.join(workDir, 'proby'), { recursive: true })

// ---------- codex exec ----------

type Run = { code: number; thread: string; tokens: number; seconds: number; tail: string }

function codex(args: string[], prompt: string): Promise<Run> {
  const empty = path.join(tmpdir(), `codex-empty-w-${process.pid}`)
  mkdirSync(empty, { recursive: true })
  const started = Date.now()
  return new Promise((resolve) => {
    const child = spawn(CODEX_BIN, ['exec', '--skip-git-repo-check', '-C', empty, '--json', ...args, '--', prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    const timer = setTimeout(() => child.kill('SIGTERM'), TIMEOUT_MS)
    child.on('close', (code) => {
      clearTimeout(timer)
      let thread = ''
      let tokens = 0
      for (const line of out.split('\n')) {
        try {
          const event = JSON.parse(line)
          if (event.type === 'thread.started') thread = event.thread_id
          if (event.type === 'turn.completed') tokens += (event.usage?.input_tokens ?? 0) + (event.usage?.output_tokens ?? 0)
        } catch {
          // linia spoza JSONL
        }
      }
      resolve({ code: code ?? 1, thread, tokens, seconds: (Date.now() - started) / 1000, tail: (err || out).trim().slice(-400) })
    })
  })
}

const modelArgs = (model: { id: string; effort: string }) => ['-m', model.id, '-c', `model_reasoning_effort="${model.effort}"`]

async function structured<T>(model: { id: string; effort: string }, schema: object, images: string[], prompt: string, tag: string) {
  const schemaPath = path.join(workDir, `schemat-${tag}.json`)
  writeFileSync(schemaPath, JSON.stringify(schema))
  const outPath = path.join(tmpdir(), `codex-out-w-${tag}-${process.pid}-${Date.now()}.json`)
  const args = [...modelArgs(model), '-s', 'read-only', '--ephemeral', '--output-schema', schemaPath, '-o', outPath]
  for (const image of images) args.push('-i', image)
  const run = await codex(args, prompt)
  const text = existsSync(outPath) ? readFileSync(outPath, 'utf8') : ''
  if (run.code !== 0 || !text) throw new Error(`codex exec (${tag}, kod ${run.code}): ${run.tail}`)
  const match = text.match(/\{[\s\S]*\}/)
  return { result: JSON.parse(match ? match[0] : text) as T, run }
}

/** Do generatora tylko wzorce główne; pomocnicze (`pomocniczy`) dostaje dopiero ocena. */
const genRefs = (job: Job) => refs.get(job.stone.key)!.filter((r) => !r.pomocniczy)

async function generate(job: Job, prompt: string, n: number) {
  const args = [...modelArgs(GEN_MODEL), '-s', 'read-only', '-i', sources.get(job.design.slug)!]
  for (const ref of genRefs(job)) args.push('-i', ref.file)
  const run = await codex(args, prompt)
  const dir = path.join(CODEX_HOME, 'generated_images', run.thread)
  const pngs = run.thread && existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.png')) : []
  if (!pngs.length) return { run, file: null }
  const newest = pngs.map((f) => path.join(dir, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]
  const file = path.join(workDir, 'proby', `${job.id}-${n}.png`)
  copyFileSync(newest, file)
  return { run, file }
}

// ---------- przebieg ----------

for (const slug of designs) {
  if (state.descriptions[slug]) continue
  console.log(`opis zdjęcia: ${slug}…`)
  const { result, run } = await structured<Description>(CHECK_MODEL, DESCRIBE_SCHEMA, [sources.get(slug)!], describePrompt(), `opis-${slug}`)
  state.descriptions[slug] = { ...result, seconds: run.seconds, tokens: run.tokens }
  saveState()
  console.log(`  ${slug}: ${result.centre_stone_en} | inne: ${result.other_stones_en}`)
}

const aspects = new Map<string, number>()
for (const slug of designs) {
  const meta = await sharp(sources.get(slug)!).metadata()
  aspects.set(slug, meta.width! / meta.height!)
}

/** Maska fasonu: z pierwszego przyjętego wariantu (kolejność z konfiguracji), zapisana w data/warianty-w/maski. */
const designMasks = new Map<string, Uint8Array>()
async function designMask(slug: string) {
  if (designMasks.has(slug)) return designMasks.get(slug)!
  const file = path.join(workDir, 'maski', `${slug}.png`)
  if (existsSync(file)) {
    const mask = new Uint8Array(await sharp(file).extractChannel(0).raw().toBuffer())
    designMasks.set(slug, mask)
    return mask
  }
  for (const job of allJobs(config, [slug])) {
    const accepted = state.jobs[job.id]?.attempts.find((a) => a.accepted)
    const raw = accepted && path.join(workDir, accepted.file.replace(/-kompozycja\.png$/, '.png'))
    if (!raw || !existsSync(raw)) continue
    const placed = await composite(sources.get(slug)!, raw, path.join(tmpdir(), `maska-${slug}-${process.pid}.png`), null, job.design.maska)
    if (!placed) continue
    mkdirSync(path.dirname(file), { recursive: true })
    const height = placed.mask.length / 600
    await sharp(Buffer.from(placed.mask), { raw: { width: 600, height, channels: 1 } }).png().toFile(file)
    designMasks.set(slug, placed.mask)
    console.log(`maska fasonu ${slug}: z wariantu ${job.id}`)
    return placed.mask
  }
  return null
}

async function runJob(job: Job) {
  const entry = (state.jobs[job.id] ??= { attempts: [], accepted: null })
  if (entry.accepted) return
  const original = await dHash(sources.get(job.design.slug)!)
  const refCount = genRefs(job).length
  const checkRefCount = refs.get(job.stone.key)!.length
  let hint: string | undefined = [...entry.attempts].reverse().find((a) => a.check?.fix_hint_en)?.check?.fix_hint_en
  while (entry.attempts.length < maxAttempts) {
    const n = entry.attempts.length + 1
    const prompt = generationPrompt(job, state.descriptions[job.design.slug], refCount, hint)
    const { run, file } = await generate(job, prompt, n)
    const attempt: Attempt = {
      n,
      file: file ? path.relative(workDir, file) : '',
      thread: run.thread,
      seconds: run.seconds,
      tokens: run.tokens,
      hashDistance: null,
      check: null,
      accepted: false,
      reason: '',
    }
    if (!file) {
      attempt.reason = `brak obrazu (kod ${run.code}): ${run.tail.slice(-160)}`
    } else {
      attempt.hashDistance = hamming(original, await dHash(file))
      const merged = file.replace(/\.png$/, '-kompozycja.png')
      const prior = await designMask(job.design.slug)
      const placed =
        attempt.hashDistance > MAX_HASH_DISTANCE ? null : await composite(sources.get(job.design.slug)!, file, merged, prior, job.design.maska)
      attempt.placement = placed && { area: placed.area, alignment: placed.alignment, designMask: Boolean(prior) }
      if (attempt.hashDistance > MAX_HASH_DISTANCE) {
        attempt.reason = `inny kadr/kompozycja (dHash ${attempt.hashDistance} > ${MAX_HASH_DISTANCE}) – bez oceny modelu`
        hint = 'Keep the exact composition, crop and camera angle of IMAGE 1; only recolour the centre stone.'
      } else if (placed === null) {
        attempt.reason = 'zmiana nie układa się w jeden kamień (maska różnicy za mała, za duża albo rozbita) – bez oceny modelu'
        hint = 'Change only the colour of the centre stone; leave every other pixel of IMAGE 1 as it is.'
      } else {
        attempt.file = path.relative(workDir, merged)
        const images = [sources.get(job.design.slug)!, merged, ...refs.get(job.stone.key)!.map((r) => r.file)]
        const { result, run: checkRun } = await structured<Check>(CHECK_MODEL, CHECK_SCHEMA, images, checkPrompt(job, checkRefCount), `ocena-${job.id}-${n}`)
        attempt.check = result
        attempt.seconds += checkRun.seconds
        attempt.tokens += checkRun.tokens
        attempt.accepted = isAccepted(result)
        attempt.reason = result.reason_pl
        hint = result.fix_hint_en || hint
      }
    }
    entry.attempts.push(attempt)
    console.log(`${job.id} próba ${n}: ${attempt.accepted ? 'PRZYJĘTA' : 'odrzucona'} – ${attempt.reason}`)
    if (attempt.accepted) {
      const out = path.join(IMAGES_DIR, job.file)
      const webp = await toWebp(path.join(workDir, attempt.file), aspects.get(job.design.slug)!, out)
      entry.accepted = attempt.file
      console.log(`  → ${path.relative(REPO_ROOT, out)} (${Math.round(webp.bytes / 1024)} KB, q${webp.quality})`)
    }
    saveState()
    if (attempt.accepted) return
  }
}

const queue = [...pending]
await Promise.all(
  Array.from({ length: Math.min(parallel, queue.length) }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      try {
        await runJob(job)
      } catch (error) {
        console.log(`${job.id}: błąd – ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }),
)

// ---------- wynik ----------

// Wynik zawsze ze wszystkich przyjętych wariantów (także spoza --tylko), żeby częściowy przebieg nie gubił reszty.
const acceptedIds = new Set(allJobs(config).filter((job) => state.jobs[job.id]?.accepted).map((job) => job.id))
// warianty-w.json = przyjęte, ale jeszcze nie przeniesione do warianty.json (czekają na akceptację Kamili).
const published = new Set(loadSpecs().flatMap((spec) => spec.variants.map((variant) => variant.file)))
const waiting = proposals(config, new Set([...acceptedIds].filter((id) => !published.has(`${id}.webp`))))
if (waiting.length) writeFileSync(PROPOSALS_PATH, `${JSON.stringify(waiting, null, 2)}\n`)
else rmSync(PROPOSALS_PATH, { force: true })
console.log(`Czeka na akceptację (warianty-w.json): ${waiting.reduce((sum, entry) => sum + entry.variants.length, 0)}`)

const previewDir = path.join(WARIANTY_DIR, 'podglad')
mkdirSync(previewDir, { recursive: true })
const rows = []
for (const design of config.fasony) {
  const source = firstExisting(dataDir, design.zrodlo)
  if (!source || !allJobs(config, [design.slug]).some((job) => acceptedIds.has(job.id))) continue
  const original = `podglad/${design.slug}-oryginal.webp`
  const meta = await sharp(source).metadata()
  await toWebp(source, meta.width! / meta.height!, path.join(WARIANTY_DIR, original))
  const variants = allJobs(config, [design.slug])
    .filter((job) => acceptedIds.has(job.id))
    .map((job) => ({ job, attempts: state.jobs[job.id].attempts.length }))
  rows.push({ design, original, variants })
}
const sheet = path.join(WARIANTY_DIR, `podglad-${today}.html`)
writeFileSync(sheet, previewHtml(rows, today))

let calls = describeCalls
let seconds = 0
let tokens = 0
console.log('\nPodsumowanie:')
for (const job of runnable) {
  const entry = state.jobs[job.id]
  if (!entry) continue
  const history = [...(entry.earlier ?? []), ...entry.attempts]
  calls += history.reduce((sum, a) => sum + 1 + (a.check ? 1 : 0), 0)
  seconds += history.reduce((sum, a) => sum + a.seconds, 0)
  tokens += history.reduce((sum, a) => sum + a.tokens, 0)
  const verdict = entry.accepted ? 'przyjęty' : 'BRAK – wszystkie próby odrzucone'
  console.log(`  ${job.id.padEnd(30)} prób: ${history.length} · ${verdict}`)
}
console.log(`Przyjęte (ten przebieg): ${runnable.filter((job) => acceptedIds.has(job.id)).length}/${runnable.length} · wywołań Codexa (ten stan): ${calls} · czas modeli: ${Math.round(seconds)} s · tokeny: ${tokens}`)
console.log(`Zapisano: ${path.relative(REPO_ROOT, sheet)}; próby i oceny: ${statePath}`)
