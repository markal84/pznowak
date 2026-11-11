/**
 * Wizualizacje kamieni przez Codex headless (zlecenie W): zdjęcie karty → ten sam pierścionek z innym kamieniem.
 *
 *   npm run warianty:wizualizacje                         plan: co powstanie i ile wywołań (nic nie woła)
 *   npm run warianty:wizualizacje -- --apply              generuje, ocenia i zapisuje wynik
 *   npm run warianty:wizualizacje -- --apply --tylko cyane,daphne-rubin   tylko wybrane fasony / warianty
 *   opcje: --proby N (najwyżej 3 na obraz), --rownolegle N (domyślnie 3), --dane <katalog data/> (domyślnie data/ w repo),
 *          --ponow (warianty bez przyjętego obrazu dostają nową serię prób; stare zostają w historii),
 *          --pomin <obraz,…> (Y.2: pojedyncze obrazy wyłączone z --tylko, np. już przyjęte nową techniką),
 *          --od-nowa (Y.2: także przyjęte obrazy z --tylko dostają nową serię; stary obraz zostaje, dopóki nowy nie przejdzie)
 *          --poprawka (bez generowania: dwie najlepsze odrzucone próby wycinka dostają lokalną poprawkę koloru przy
 *          krawędzi kamienia – łagodną i mocniejszą – i ponowną ocenę Terry; stare próby idą do historii jak przy --ponow)
 *
 * Na obraz: (1) opis zdjęcia źródłowego, raz na fason (Terra medium, tylko do odczytu) – z niego prompt nazywa szlif
 * i oprawę; (2) generowanie: Terra low przekazuje prompt narzędziu do obrazów, wejście = zdjęcie karty + 2 wzorce koloru;
 * (3) szybki filtr kadru (dHash) – inny kadr odpada bez wywołania modelu; (4) ocena Terrą medium (oryginał, wynik,
 * wzorce), przy odrzuceniu wskazówka trafia do kolejnej próby. Po pierwszym przyjętym wariancie fason dostaje „maskę
 * fasonu” (ten sam kamień na tym samym zdjęciu) – kolejne warianty wycinają co najmniej ten obszar, więc przy małej
 * różnicy koloru (niebieski → granatowy/biały) na krawędzi kamienia nie zostaje stary kolor. Program: CODEX_BIN, konto ChatGPT (bez klucza API).
 *
 * Zlecenie Y: fason może mieć kolejne zdjęcia galerii (`zdjecia`), a kamienie z `cala_galeria` powstają na każdym z nich
 * (`<slug>-<kamien>-<n>.webp`); opis zdjęcia, maska fasonu i proporcje są osobne dla każdego zdjęcia (`--tylko <slug>-<kamien>`
 * bierze wszystkie zdjęcia wariantu). Do `warianty-w.json` trafia tylko wariant z kompletem przyjętych zdjęć.
 *
 * Zlecenie Y.2 – technika wycinka (fason z `kamien_oryginalu`): maska kamienia z ORYGINAŁU (odcień kamienia oryginału
 * w obszarze maski fasonu albo ręcznej podpowiedzi), generator dostaje tylko kwadratowy wycinek wokół kamienia, do zdjęcia
 * wraca tylko maska. Przed oceną Terry kontrola automatyczna (`verifyCutout`): poza maską bez zmian, oprawa wokół na
 * miejscu, w masce kolor kamienia (biel: jasny, bezbarwny, z ogniem). Maski i wycinki: `data/warianty-w/wycinek/`.
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
import { makeCutout, maskPreview, MASK_WIDTH, originalMask, pasteCutout } from './wizualizacje-wycinek-obraz'
import { type Box, type CutoutVerdict, cutoutHint, type StoneFixStats, stoneFixOptions } from './wizualizacje-wycinek-logic'
import {
  CHECK_MODEL,
  CHECK_SCHEMA,
  checkPrompt,
  cutoutCheckPrompt,
  cutoutPrompt,
  designPhotos,
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
  type SheetRow,
  variantName,
} from './wizualizacje-w-logic'

const arg = (name: string) => {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const applyChanges = process.argv.includes('--apply')
const redoAccepted = process.argv.includes('--od-nowa')
/** Poprawka lokalna najlepszych odrzuconych prób wycinka zamiast generowania (najwyżej 2 próby na obraz). */
const fixMode = process.argv.includes('--poprawka')
/** `--od-nowa` i `--poprawka` obejmują też `--ponow`: każdy obraz z --tylko dostaje nową serię prób. */
const retryRejected = process.argv.includes('--ponow') || redoAccepted || fixMode
const only = (arg('--tylko') ?? '').split(',').filter(Boolean)
const maxAttempts = Math.min(fixMode ? 2 : MAX_ATTEMPTS, Number(arg('--proby') ?? MAX_ATTEMPTS))
const parallel = Math.max(1, Number(arg('--rownolegle') ?? 3))
const dataDir = path.resolve(arg('--dane') ?? path.join(REPO_ROOT, 'data'))
const workDir = path.join(dataDir, 'warianty-w')
const CODEX_BIN = process.env.CODEX_BIN ?? '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex'
const CODEX_HOME = process.env.CODEX_HOME ?? path.join(homedir(), '.codex')
const TIMEOUT_MS = 10 * 60 * 1000
const today = new Date().toISOString().slice(0, 10)

// ---------- plan ----------

const config = loadConfig()
const skip = new Set((arg('--pomin') ?? '').split(',').filter(Boolean))
const todo = allJobs(config, only).filter((job) => !skip.has(job.id))
if (!todo.length) throw new Error(`Brak wariantów dla --tylko ${only.join(',')}`)

const sources = new Map<string, string>()
const refs = new Map<string, { slug: string; file: string; pomocniczy: boolean }[]>()
const missing: string[] = []
for (const job of todo) {
  const source = firstExisting(dataDir, job.zrodlo)
  if (source) sources.set(job.photoKey, source)
  else missing.push(`${job.photoKey}: brak zdjęcia źródłowego (${job.zrodlo.join(' | ')})`)
  const found = job.stone.wzorce.flatMap((w) => {
    const file = firstExisting(dataDir, w.pliki)
    return file ? [{ slug: w.slug, file, pomocniczy: Boolean(w.pomocniczy) }] : []
  })
  if (found.length) refs.set(job.stone.key, found)
  else missing.push(`${job.stone.key}: brak wzorca koloru – nie zgaduję, wariant pominięty`)
}
const runnable = todo.filter((job) => sources.has(job.photoKey) && refs.has(job.stone.key))

type Attempt = {
  n: number
  file: string
  thread: string
  seconds: number
  tokens: number
  hashDistance: number | null
  placement?: { area: number; alignment: { scale: number; dx: number; dy: number; cost: number }; designMask?: boolean } | null
  /** Y.2: technika wycinka i wynik kontroli automatycznej; `poprawka` = lokalna obróbka wcześniejszej próby, bez generowania. */
  technique?: 'wycinek' | 'poprawka'
  cutout?: CutoutVerdict
  /** Poprawka: próba źródłowa (surowy plik generatora i jej ocena) oraz siła i statystyki poprawki. */
  source?: { file: string; n: number; score: number; reason: string }
  fix?: { strength: 1 | 2; stats: StoneFixStats | null }
  at?: string
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

/** Y.2 `--od-nowa`: przyjęte obrazy z --tylko też dostają nową serię (stary zostaje, dopóki nowy nie przejdzie). */
const redo = new Set<string>()
if ((retryRejected || redoAccepted) && applyChanges) {
  for (const job of runnable) {
    const entry = state.jobs[job.id]
    if (!entry || (entry.accepted && !redoAccepted)) continue
    if (entry.accepted) redo.add(job.id)
    if (entry.attempts.length) {
      entry.earlier = [...(entry.earlier ?? []), ...entry.attempts]
      entry.attempts = []
    }
  }
}
/**
 * Kandydaci do poprawki: wcześniejsze próby wycinka (nie poprawki) odrzucone przez Terrę po udanej kontroli
 * automatycznej, z zachowanym surowym obrazem generatora; najlepsza ocena pierwsza.
 */
const rawOf = (attempt: Attempt) => attempt.file.replace(/-kompozycja\.png$/, '.png')
function fixCandidates(job: Job) {
  const entry = state.jobs[job.id]
  if (!entry || !job.hint) return []
  return [...(entry.earlier ?? []), ...entry.attempts]
    .filter((a) => a.technique === 'wycinek' && a.check?.verdict === 'odrzuc' && a.cutout?.ok && existsSync(path.join(workDir, rawOf(a))))
    .sort((a, b) => b.check!.score - a.check!.score)
    .slice(0, 2)
}
const designs = [...new Set(runnable.map((job) => job.design.slug))]
/** Zdjęcia fasonów (zdjęcie 1 = `<slug>`, kolejne `<slug>-<n>`): opis, proporcje i maska są osobno dla każdego. */
const photoKeys = [...new Set(runnable.map((job) => job.photoKey))]
const pending = runnable.filter((job) => {
  const entry = state.jobs[job.id]
  if (redoAccepted && entry?.accepted) return applyChanges ? redo.has(job.id) : true
  if (fixMode) return !entry?.accepted && fixCandidates(job).length > 0
  return !entry?.accepted && (retryRejected || (entry?.attempts.length ?? 0) < maxAttempts)
})
console.log(`Fasony: ${designs.join(', ')} · wariantów: ${runnable.length} (do zrobienia ${pending.length})`)
for (const job of runnable) {
  const done = state.jobs[job.id]?.accepted ? (redoAccepted ? ' – przyjęty, od nowa' : ' – już przyjęty') : ''
  const candidates = fixMode ? fixCandidates(job) : []
  const how = fixMode
    ? candidates.length
      ? ` · poprawka z: ${candidates.map((a) => `${path.basename(rawOf(a))} (score ${a.check!.score})`).join(', ')}`
      : ' · poprawka: brak kandydatów'
    : job.hint
      ? ' · wycinek'
      : ''
  const refList = refs.get(job.stone.key)!.map((r) => r.slug).join(', ')
  console.log(`  ${job.id.padEnd(34)} ${path.basename(sources.get(job.photoKey)!)} · wzorce: ${refList}${how}${done}`)
}
for (const problem of missing) console.log(`  ! ${problem}`)
const describeCalls = photoKeys.filter((key) => !state.descriptions[key]).length
if (fixMode) {
  const checks = pending.reduce((sum, job) => sum + Math.min(maxAttempts, fixCandidates(job).length), 0)
  console.log(`Wywołania Codexa (poprawka, bez generowania): opis ${describeCalls} + najwyżej ${checks} ocen (${CHECK_MODEL.id} ${CHECK_MODEL.effort})`)
} else console.log(
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

async function generate(job: Job, prompt: string, n: number | string, input = sources.get(job.photoKey)!) {
  const args = [...modelArgs(GEN_MODEL), '-s', 'read-only', '-i', input]
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

for (const key of photoKeys) {
  if (state.descriptions[key]) continue
  console.log(`opis zdjęcia: ${key}…`)
  const { result, run } = await structured<Description>(CHECK_MODEL, DESCRIBE_SCHEMA, [sources.get(key)!], describePrompt(), `opis-${key}`)
  state.descriptions[key] = { ...result, seconds: run.seconds, tokens: run.tokens }
  saveState()
  console.log(`  ${key}: ${result.centre_stone_en} | inne: ${result.other_stones_en}`)
}

const aspects = new Map<string, number>()
for (const key of photoKeys) {
  const meta = await sharp(sources.get(key)!).metadata()
  aspects.set(key, meta.width! / meta.height!)
}

/**
 * Maska fasonu: z pierwszego przyjętego wariantu tego samego zdjęcia (kolejność z konfiguracji), zapisana
 * w data/warianty-w/maski/<zdjęcie>.png. Każde zdjęcie galerii ma własną – kamień leży w innym miejscu kadru.
 */
const designMasks = new Map<string, Uint8Array>()
async function designMask(job: Job) {
  const key = job.photoKey
  if (designMasks.has(key)) return designMasks.get(key)!
  const file = path.join(workDir, 'maski', `${key}.png`)
  if (existsSync(file)) {
    const mask = new Uint8Array(await sharp(file).extractChannel(0).raw().toBuffer())
    designMasks.set(key, mask)
    return mask
  }
  for (const other of allJobs(config, [job.design.slug]).filter((j) => j.photoKey === key)) {
    const accepted = state.jobs[other.id]?.attempts.find((a) => a.accepted)
    const raw = accepted && path.join(workDir, accepted.file.replace(/-kompozycja\.png$/, '.png'))
    if (!raw || !existsSync(raw)) continue
    const placed = await composite(sources.get(key)!, raw, path.join(tmpdir(), `maska-${key}-${process.pid}.png`), null, other.maska)
    if (!placed) continue
    mkdirSync(path.dirname(file), { recursive: true })
    const height = placed.mask.length / 600
    await sharp(Buffer.from(placed.mask), { raw: { width: 600, height, channels: 1 } }).png().toFile(file)
    designMasks.set(key, placed.mask)
    console.log(`maska fasonu ${key}: z wariantu ${other.id}`)
    return placed.mask
  }
  return null
}

/**
 * Y.2: maska kamienia z oryginału i wycinek dla generatora, raz na zdjęcie fasonu (`data/warianty-w/wycinek/`).
 * Obszar podpowiedzi: ręczny `obszar` z konfiguracji albo maska fasonu z W/Y (`maski/<zdjęcie>.png`).
 */
type Cutout = { mask: Uint8Array; box: Box; file: string }
const cutouts = new Map<string, Promise<Cutout>>()
function cutoutFor(job: Job): Promise<Cutout> {
  const key = job.photoKey
  if (!cutouts.has(key)) {
    cutouts.set(
      key,
      (async () => {
        const dir = path.join(workDir, 'wycinek')
        mkdirSync(dir, { recursive: true })
        const priorFile = path.join(workDir, 'maski', `${key}.png`)
        const prior = existsSync(priorFile) ? new Uint8Array(await sharp(priorFile).extractChannel(0).raw().toBuffer()) : null
        const found = await originalMask(sources.get(key)!, job.hint!, prior, job.maska)
        if (!found) throw new Error(`${key}: nie znalazłem kamienia oryginału (odcień ${job.hint!.odcien.join('–')}) – dodaj „obszar” w kamien_oryginalu`)
        const file = path.join(dir, `${key}.png`)
        const box = await makeCutout(sources.get(key)!, found.mask, MASK_WIDTH, file)
        await sharp(Buffer.from(found.mask), { raw: { width: MASK_WIDTH, height: found.height, channels: 1 } }).png().toFile(path.join(dir, `${key}-maska.png`))
        await maskPreview(sources.get(key)!, found.mask, MASK_WIDTH, box, path.join(dir, `${key}-podglad.jpg`))
        console.log(`wycinek ${key}: maska ${(found.area * 100).toFixed(2)} % kadru, kwadrat ${box.width} px (${prior ? 'obszar z maski fasonu' : job.hint!.obszar ? 'obszar ręczny' : 'cały kadr'})`)
        return { mask: found.mask, box, file }
      })(),
    )
  }
  return cutouts.get(key)!
}

/** Jedna próba techniką wycinka; zwraca uzupełnioną próbę i wskazówkę do następnej. */
async function cutoutAttempt(job: Job, n: number, hint: string | undefined): Promise<{ attempt: Attempt; hint: string | undefined }> {
  const cut = await cutoutFor(job)
  const prompt = cutoutPrompt(job, state.descriptions[job.photoKey], genRefs(job).length, hint)
  const { run, file } = await generate(job, prompt, `w${n}`, cut.file)
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
    technique: 'wycinek',
    at: new Date().toISOString(),
  }
  if (!file) {
    // Kod ≠ 0 = awaria Codexa (zerwane połączenie, limit konta) – to nie jest próba odrzucona, nie wlicza się do limitu prób.
    if (run.code !== 0) throw new Error(`awaria Codexa (limit konta albo zerwane połączenie), kod ${run.code}: ${run.tail.slice(-160)}`)
    attempt.reason = `brak obrazu (kod ${run.code}): ${run.tail.slice(-160)}`
    return { attempt, hint }
  }
  attempt.hashDistance = hamming(await dHash(cut.file), await dHash(file))
  if (attempt.hashDistance > MAX_HASH_DISTANCE) {
    attempt.reason = `inny kadr wycinka (dHash ${attempt.hashDistance} > ${MAX_HASH_DISTANCE}) – bez oceny modelu`
    return { attempt, hint: 'Keep the exact square crop of IMAGE 1 – no zoom, no shift; only recolour the stone.' }
  }
  const merged = file.replace(/\.png$/, '-kompozycja.png')
  const closeOriginal = path.join(workDir, 'wycinek', `${job.photoKey}-zblizenie.png`)
  const closeResult = file.replace(/\.png$/, '-zblizenie.png')
  const pasted = await pasteCutout(
    { source: sources.get(job.photoKey)!, generated: file, box: cut.box, mask: cut.mask, maskWidth: MASK_WIDTH, output: merged, closeOriginal, closeResult },
    job.hint!.odcien,
    job.stone.kontrola,
  )
  attempt.cutout = pasted.verdict
  attempt.placement = { area: cut.mask.reduce((s, v) => s + (v ? 1 : 0), 0) / cut.mask.length, alignment: pasted.alignment }
  attempt.file = path.relative(workDir, merged)
  if (!pasted.verdict.ok) {
    attempt.reason = `kontrola automatyczna: ${pasted.verdict.reasons_pl.join('; ')} – bez oceny modelu`
    return { attempt, hint: cutoutHint(pasted.verdict, job.stone.kontrola) || hint }
  }
  const images = [closeOriginal, closeResult, ...refs.get(job.stone.key)!.map((r) => r.file)]
  const { result, run: checkRun } = await structured<Check>(
    CHECK_MODEL,
    CHECK_SCHEMA,
    images,
    cutoutCheckPrompt(job, refs.get(job.stone.key)!.length),
    `ocena-${job.id}-${n}`,
  )
  attempt.check = result
  attempt.seconds += checkRun.seconds
  attempt.tokens += checkRun.tokens
  attempt.accepted = isAccepted(result)
  attempt.reason = result.reason_pl
  return { attempt, hint: result.fix_hint_en || hint }
}

/** Poprawka: wcześniejsza próba (surowy plik generatora) wklejona ponownie z lokalną poprawką i oceniona przez Terrę. */
async function fixAttempt(job: Job, n: number, fileN: number, source: Attempt, strength: 1 | 2): Promise<Attempt> {
  const cut = await cutoutFor(job)
  const raw = path.join(workDir, rawOf(source))
  const base = raw.replace(/\.png$/, `-p${fileN}`)
  const merged = `${base}-kompozycja.png`
  const closeOriginal = path.join(workDir, 'wycinek', `${job.photoKey}-zblizenie.png`)
  const closeResult = `${base}-zblizenie.png`
  const options = stoneFixOptions(job.stone.key, job.hint!.odcien, strength)
  const pasted = await pasteCutout(
    { source: sources.get(job.photoKey)!, generated: raw, box: cut.box, mask: cut.mask, maskWidth: MASK_WIDTH, output: merged, closeOriginal, closeResult },
    job.hint!.odcien,
    job.stone.kontrola,
    options,
  )
  const attempt: Attempt = {
    n,
    file: path.relative(workDir, merged),
    thread: '',
    seconds: 0,
    tokens: 0,
    hashDistance: source.hashDistance,
    check: null,
    accepted: false,
    reason: '',
    technique: 'poprawka',
    source: { file: rawOf(source), n: source.n, score: source.check!.score, reason: source.reason },
    fix: { strength, stats: pasted.fixStats },
    cutout: pasted.verdict,
    placement: { area: cut.mask.reduce((s, v) => s + (v ? 1 : 0), 0) / cut.mask.length, alignment: pasted.alignment },
    at: new Date().toISOString(),
  }
  if (!pasted.verdict.ok) {
    attempt.reason = `kontrola automatyczna: ${pasted.verdict.reasons_pl.join('; ')} – bez oceny modelu`
    return attempt
  }
  const images = [closeOriginal, closeResult, ...refs.get(job.stone.key)!.map((r) => r.file)]
  const { result, run } = await structured<Check>(
    CHECK_MODEL,
    CHECK_SCHEMA,
    images,
    cutoutCheckPrompt(job, refs.get(job.stone.key)!.length),
    `ocena-${job.id}-p${fileN}`,
  )
  attempt.thread = run.thread
  attempt.check = result
  attempt.seconds = run.seconds
  attempt.tokens = run.tokens
  attempt.accepted = isAccepted(result)
  attempt.reason = result.reason_pl
  return attempt
}

async function fixJob(job: Job) {
  const entry = (state.jobs[job.id] ??= { attempts: [], accepted: null })
  if (entry.accepted) return
  const candidates = fixCandidates(job)
  for (const [i, source] of candidates.slice(0, maxAttempts).entries()) {
    const strength = (i + 1) as 1 | 2
    const fileN = (entry.earlier?.length ?? 0) + entry.attempts.length + 1
    const attempt = await fixAttempt(job, entry.attempts.length + 1, fileN, source, strength)
    entry.attempts.push(attempt)
    const stats = attempt.fix?.stats
    const detail = stats ? ` [z ${path.basename(attempt.source!.file)}, siła ${strength}, stary kolor ${stats.spillPx} px${stats.lift ? `, L ${stats.lift[0]}→${stats.lift[1]}` : ''}]` : ''
    console.log(`${job.id} poprawka ${attempt.n}: ${attempt.accepted ? 'PRZYJĘTA' : 'odrzucona'} (score ${attempt.check?.score ?? '–'})${detail} – ${attempt.reason}`)
    if (attempt.accepted) {
      const out = path.join(IMAGES_DIR, job.file)
      const webp = await toWebp(path.join(workDir, attempt.file), aspects.get(job.photoKey)!, out)
      entry.accepted = attempt.file
      console.log(`  → ${path.relative(REPO_ROOT, out)} (${Math.round(webp.bytes / 1024)} KB, q${webp.quality})`)
    }
    saveState()
    if (attempt.accepted) return
  }
}

async function runJob(job: Job) {
  if (fixMode) return fixJob(job)
  const entry = (state.jobs[job.id] ??= { attempts: [], accepted: null })
  if (entry.accepted && !redo.has(job.id)) return
  const original = await dHash(sources.get(job.photoKey)!)
  const refCount = genRefs(job).length
  const checkRefCount = refs.get(job.stone.key)!.length
  let hint: string | undefined = [...entry.attempts].reverse().find((a) => a.check?.fix_hint_en)?.check?.fix_hint_en
  while (entry.attempts.length < maxAttempts) {
    const n = entry.attempts.length + 1
    if (job.hint) {
      // numer pliku próby po całej historii, żeby nowa seria nie nadpisała plików starszych prób
      const fileN = (entry.earlier?.length ?? 0) + n
      const result = await cutoutAttempt(job, fileN, hint)
      result.attempt.n = n
      hint = result.hint
      entry.attempts.push(result.attempt)
      console.log(`${job.id} próba ${n} (wycinek): ${result.attempt.accepted ? 'PRZYJĘTA' : 'odrzucona'} – ${result.attempt.reason}`)
      if (result.attempt.accepted) {
        const out = path.join(IMAGES_DIR, job.file)
        const webp = await toWebp(path.join(workDir, result.attempt.file), aspects.get(job.photoKey)!, out)
        entry.accepted = result.attempt.file
        redo.delete(job.id)
        console.log(`  → ${path.relative(REPO_ROOT, out)} (${Math.round(webp.bytes / 1024)} KB, q${webp.quality})`)
      }
      saveState()
      if (result.attempt.accepted) return
      continue
    }
    const prompt = generationPrompt(job, state.descriptions[job.photoKey], refCount, hint)
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
      if (run.code !== 0) throw new Error(`awaria Codexa (limit konta albo zerwane połączenie), kod ${run.code}: ${run.tail.slice(-160)}`)
      attempt.reason = `brak obrazu (kod ${run.code}): ${run.tail.slice(-160)}`
    } else {
      attempt.hashDistance = hamming(original, await dHash(file))
      const merged = file.replace(/\.png$/, '-kompozycja.png')
      const prior = await designMask(job)
      const placed =
        attempt.hashDistance > MAX_HASH_DISTANCE ? null : await composite(sources.get(job.photoKey)!, file, merged, prior, job.maska)
      attempt.placement = placed && { area: placed.area, alignment: placed.alignment, designMask: Boolean(prior) }
      if (attempt.hashDistance > MAX_HASH_DISTANCE) {
        attempt.reason = `inny kadr/kompozycja (dHash ${attempt.hashDistance} > ${MAX_HASH_DISTANCE}) – bez oceny modelu`
        hint = 'Keep the exact composition, crop and camera angle of IMAGE 1; only recolour the centre stone.'
      } else if (placed === null) {
        attempt.reason = 'zmiana nie układa się w jeden kamień (maska różnicy za mała, za duża albo rozbita) – bez oceny modelu'
        hint = 'Change only the colour of the centre stone; leave every other pixel of IMAGE 1 as it is.'
      } else {
        attempt.file = path.relative(workDir, merged)
        const images = [sources.get(job.photoKey)!, merged, ...refs.get(job.stone.key)!.map((r) => r.file)]
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
      const webp = await toWebp(path.join(workDir, attempt.file), aspects.get(job.photoKey)!, out)
      entry.accepted = attempt.file
      console.log(`  → ${path.relative(REPO_ROOT, out)} (${Math.round(webp.bytes / 1024)} KB, q${webp.quality})`)
    }
    saveState()
    if (attempt.accepted) return
  }
}

const queue = [...pending]
/** Poprawka: awaria Codexa (limit, zerwane połączenie) zatrzymuje cały przebieg – nie liczy się jako odrzucenie. */
let stopped: string | null = null
await Promise.all(
  Array.from({ length: Math.min(parallel, queue.length) }, async () => {
    for (let job = queue.shift(); job && !stopped; job = queue.shift()) {
      try {
        await runJob(job)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.log(`${job.id}: błąd – ${message}`)
        if (fixMode) stopped = `${job.id}: ${message}`
      }
    }
  }),
)
if (stopped) console.log(`\nZATRZYMANO (awaria Codexa): ${stopped}`)

// ---------- wynik ----------

// Wynik zawsze ze wszystkich przyjętych wariantów (także spoza --tylko), żeby częściowy przebieg nie gubił reszty.
const acceptedIds = new Set(allJobs(config).filter((job) => state.jobs[job.id]?.accepted).map((job) => job.id))
// warianty-w.json = warianty z kompletem przyjętych zdjęć, których jeszcze nie ma w warianty.json z tymi samymi plikami.
const published = new Set(loadSpecs().flatMap((spec) => spec.variants.flatMap((variant) => variant.files)))
const waiting = proposals(config, acceptedIds)
  .map((entry) => ({ ...entry, variants: entry.variants.filter((variant) => !variant.files.every((file) => published.has(file))) }))
  .filter((entry) => entry.variants.length > 0)
if (waiting.length) writeFileSync(PROPOSALS_PATH, `${JSON.stringify(waiting, null, 2)}\n`)
else rmSync(PROPOSALS_PATH, { force: true })
console.log(`Czeka na przeniesienie do warianty.json (warianty-w.json): ${waiting.reduce((sum, entry) => sum + entry.variants.length, 0)}`)

const previewDir = path.join(WARIANTY_DIR, 'podglad')
mkdirSync(previewDir, { recursive: true })
const rows: SheetRow[] = []
for (const design of config.fasony) {
  const designJobs = allJobs(config, [design.slug]).filter((job) => acceptedIds.has(job.id))
  if (!designJobs.length) continue
  const stoneKeys = design.kamienie.filter((key) => designJobs.some((job) => job.stone.key === key))
  const photos = []
  for (const { photo, photoKey, zrodlo } of designPhotos(design)) {
    const source = firstExisting(dataDir, zrodlo)
    if (!source) continue
    const original = `podglad/${photoKey}-oryginal.webp`
    const meta = await sharp(source).metadata()
    await toWebp(source, meta.width! / meta.height!, path.join(WARIANTY_DIR, original))
    const files: Record<string, string | null> = {}
    for (const key of stoneKeys) files[key] = designJobs.find((job) => job.stone.key === key && job.photo === photo)?.file ?? null
    photos.push({ photo, original, files })
  }
  const stones = stoneKeys.map((key) => {
    const job = designJobs.find((j) => j.stone.key === key)!
    return { key, name: variantName(job), swatch: job.stone.swatch }
  })
  rows.push({ design, stones, photos })
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
  calls += history.reduce((sum, a) => sum + (a.technique === 'poprawka' ? 0 : 1) + (a.check ? 1 : 0), 0)
  seconds += history.reduce((sum, a) => sum + a.seconds, 0)
  tokens += history.reduce((sum, a) => sum + a.tokens, 0)
  const verdict = entry.accepted ? 'przyjęty' : 'BRAK – wszystkie próby odrzucone'
  console.log(`  ${job.id.padEnd(34)} prób: ${history.length} · ${verdict}`)
}
console.log(`Przyjęte (ten przebieg): ${runnable.filter((job) => acceptedIds.has(job.id)).length}/${runnable.length} · wywołań Codexa (ten stan): ${calls} · czas modeli: ${Math.round(seconds)} s · tokeny: ${tokens}`)
console.log(`Zapisano: ${path.relative(REPO_ROOT, sheet)}; próby i oceny: ${statePath}`)
