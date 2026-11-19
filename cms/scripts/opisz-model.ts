/**
 * Model pisze krótki opis, opis i parametry nowych szkiców (`npm run opisz:szkice -- --model`). Wywołuje lokalny
 * Claude Code w trybie bez okna (`claude -p`, logowanie z Maca, bez klucza Anthropic w repo):
 *  - zdjęcia karty (do 6, z filmu klatki przez ffmpeg) idą jako obrazy w wiadomości – model nie ma ŻADNYCH narzędzi
 *    (`--tools ""`), nie czyta plików, nie wchodzi do sieci i nie ma serwerów MCP (`--strict-mcp-config`);
 *  - odpowiedź w schemacie JSON (`--json-schema`), potem zapora `checkModelOutput` (schemat AC, liczby tylko z posta);
 *  - limity: koszt jednego wywołania (`--max-budget-usd`), koszt całego przebiegu, liczba kart, czas jednego wywołania;
 *  - odpowiedź zapamiętana w data/facebook/opisy-model/<id>.json: te same posty i zdjęcia nie kosztują drugi raz.
 * Do bazy nic stąd nie idzie: wynik to pozycje w formacie `opisy-szkice.json`, które zapisuje `opisz-szkice.ts`.
 */
import { execFile, spawn } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import sharp from 'sharp'

import {
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
  OUTPUT_SCHEMA,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
  buildPrompt,
  checkModelOutput,
  inputHash,
  loadExamples,
} from './opisz-model-logic'
import type { DraftCard, OpisSzkicu } from './opisz-szkice-logic'

const run = promisify(execFile)

export type ModelOptions = {
  model: string
  effort: string
  /** Twardy limit jednego wywołania (claude --max-budget-usd). */
  maxCallUsd: number
  /** Limit całego przebiegu: po jego przekroczeniu kolejne karty czekają na następny przebieg. */
  maxRunUsd: number
  maxCards: number
  timeoutMs: number
  cacheDir: string
  site: string
  log: (line: string) => void
}

export const defaultModelOptions = (cacheDir: string, site: string): ModelOptions => ({
  model: process.env.PZNOWAK_OPISY_MODEL || DEFAULT_MODEL,
  effort: process.env.PZNOWAK_OPISY_EFFORT || DEFAULT_EFFORT,
  maxCallUsd: Number(process.env.PZNOWAK_OPISY_LIMIT_WYWOLANIA_USD) || 1.5,
  maxRunUsd: Number(process.env.PZNOWAK_OPISY_LIMIT_USD) || 6,
  maxCards: Number(process.env.PZNOWAK_OPISY_MAX_KART) || 10,
  timeoutMs: (Number(process.env.PZNOWAK_OPISY_LIMIT_MINUT) || 6) * 60_000,
  cacheDir,
  site,
  log: (line) => console.log(line),
})

/** Plik `claude`: zmienna PZNOWAK_CLAUDE_BIN, PATH, potem typowe miejsca instalacji na Macu. */
export function findClaude(): string {
  const home = os.homedir()
  const candidates = [
    process.env.PZNOWAK_CLAUDE_BIN,
    ...(process.env.PATH ?? '').split(path.delimiter).map((dir) => path.join(dir, 'claude')),
    path.join(home, '.local/bin/claude'),
    path.join(home, '.claude/local/claude'),
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
  ].filter((p): p is string => Boolean(p))
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // następny
    }
  }
  return ''
}

type Image = { data: string; mediaType: 'image/jpeg' }
type Asset = { id?: number; url?: string | null; mimeType?: string | null }

const MAX_PHOTOS = 6
const LONG_EDGE = 1568

const absolute = (url: string, site: string) => (/^https?:/.test(url) ? url : `${site}${url}`)

async function toJpeg(input: Buffer): Promise<Image> {
  const data = await sharp(input)
    .rotate()
    .resize(LONG_EDGE, LONG_EDGE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer()
  return { data: data.toString('base64'), mediaType: 'image/jpeg' }
}

/** Zdjęcia karty dla modelu: najpierw główne, potem reszta; z filmu (gdy zdjęć mało) dwie klatki przez ffmpeg. */
export async function collectImages(
  card: DraftCard,
  site: string,
): Promise<{ images: Image[]; mediaIds: Array<number | string>; notes: string[] }> {
  const notes: string[] = []
  const entries = [...(card.media ?? [])].sort(
    (a, b) => Number(Boolean(b.isPrimary)) - Number(Boolean(a.isPrimary)),
  )
  const assets = entries
    .map((entry) => entry.asset)
    .filter(
      (asset): asset is Asset => typeof asset === 'object' && asset !== null && Boolean(asset.url),
    )
  const photos = assets.filter((a) => a.mimeType?.startsWith('image/')).slice(0, MAX_PHOTOS)
  const videos = assets.filter((a) => a.mimeType?.startsWith('video/'))
  const images: Image[] = []
  const mediaIds: Array<number | string> = []
  for (const photo of photos) {
    try {
      const response = await fetch(absolute(photo.url as string, site))
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      images.push(await toJpeg(Buffer.from(await response.arrayBuffer())))
      mediaIds.push(photo.id ?? (photo.url as string))
    } catch (error) {
      notes.push(
        `zdjęcie ${photo.url} nie pobrało się (${error instanceof Error ? error.message : error})`,
      )
    }
  }
  if (images.length < 2 && videos.length) {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'opisz-klatki-'))
    try {
      const video = videos[0]
      for (const [i, at] of ['1', '3'].entries()) {
        const out = path.join(dir, `k${i}.jpg`)
        try {
          await run(
            'ffmpeg',
            [
              '-v',
              'error',
              '-ss',
              at,
              '-i',
              absolute(video.url as string, site),
              '-frames:v',
              '1',
              '-y',
              out,
            ],
            {
              timeout: 90_000,
            },
          )
          images.push(await toJpeg(await readFile(out)))
        } catch {
          // za krótki film albo brak ffmpeg
        }
      }
      mediaIds.push(`film:${video.id ?? video.url}`)
      if (!images.length) notes.push('z filmu nie dało się wyciąć klatek (ffmpeg?)')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  }
  return { images, mediaIds, notes }
}

type CallResult = { output?: unknown; costUsd: number; error?: string }

/** Jedno wywołanie `claude -p`: bez narzędzi, z obrazami w wiadomości, odpowiedź w schemacie JSON. */
export function askClaude(
  bin: string,
  prompt: string,
  images: Image[],
  opts: Pick<ModelOptions, 'model' | 'effort' | 'maxCallUsd' | 'timeoutMs'>,
  cwd: string,
): Promise<CallResult> {
  const args = [
    '-p',
    '--input-format',
    'stream-json',
    '--output-format',
    'stream-json',
    '--verbose',
    '--model',
    opts.model,
    '--effort',
    opts.effort,
    '--tools',
    '',
    '--strict-mcp-config',
    '--no-session-persistence',
    '--max-budget-usd',
    String(opts.maxCallUsd),
    '--system-prompt',
    SYSTEM_PROMPT,
    '--json-schema',
    JSON.stringify(OUTPUT_SCHEMA),
  ]
  const message = {
    type: 'user',
    message: {
      role: 'user',
      content: [
        ...images.map((image) => ({
          type: 'image',
          source: { type: 'base64', media_type: image.mediaType, data: image.data },
        })),
        { type: 'text', text: prompt },
      ],
    },
  }
  return new Promise((resolve) => {
    const child = spawn(bin, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (result: CallResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 5000).unref()
      finish({
        costUsd: 0,
        error: `przekroczony limit czasu (${Math.round(opts.timeoutMs / 60_000)} min)`,
      })
    }, opts.timeoutMs)
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', (error) =>
      finish({ costUsd: 0, error: `nie uruchomiłam claude: ${error.message}` }),
    )
    child.on('close', (code) => {
      let result: Record<string, unknown> | undefined
      for (const line of stdout.split('\n')) {
        try {
          const parsed = JSON.parse(line) as Record<string, unknown>
          if (parsed.type === 'result') result = parsed
        } catch {
          // linia bez JSON-a
        }
      }
      const costUsd = Number(result?.total_cost_usd) || 0
      if (!result) {
        const detail = (stderr || stdout).trim().split('\n').slice(-3).join(' ').slice(0, 300)
        finish({
          costUsd,
          error: `claude zakończył się bez wyniku (kod ${code}): ${detail || 'brak komunikatu'}`,
        })
        return
      }
      if (result.is_error || result.subtype !== 'success') {
        const why =
          String(result.subtype ?? '') === 'error_max_budget_usd'
            ? `przekroczony limit kosztu wywołania (${opts.maxCallUsd} USD)`
            : String(result.result ?? result.subtype ?? 'błąd').slice(0, 300)
        finish({ costUsd, error: why })
        return
      }
      let output = result.structured_output
      if (output === undefined && typeof result.result === 'string') {
        try {
          output = JSON.parse(result.result)
        } catch {
          // zostaje undefined
        }
      }
      finish(
        output === undefined
          ? { costUsd, error: 'brak danych JSON w odpowiedzi' }
          : { costUsd, output },
      )
    })
    child.stdin.on('error', () => {
      // proces zamknął wejście (np. zły argument) – błąd wyjdzie w „close”
    })
    child.stdin.end(`${JSON.stringify(message)}\n`)
  })
}

type Cached = {
  version: string
  hash: string
  model: string
  at: string
  costUsd: number
  spec: OpisSzkicu
  problems: string[]
}

export type ModelReport = {
  id: number
  status: 'nowe' | 'z pamięci' | 'pominięte' | 'błąd'
  note: string
  costUsd: number
}

const cachePath = (dir: string, id: number) => path.join(dir, `${id}.json`)

/** Wszystkie zapamiętane pozycje modelu (do planu przy kolejnych przebiegach bez `--model`). */
export async function loadModelSpecs(dir: string): Promise<OpisSzkicu[]> {
  const { readdir } = await import('node:fs/promises')
  const files = await readdir(dir).catch(() => [] as string[])
  const specs: OpisSzkicu[] = []
  for (const file of files.filter((f) => /^\d+\.json$/.test(f))) {
    try {
      const cached = JSON.parse(await readFile(path.join(dir, file), 'utf8')) as Cached
      if (cached.version === PROMPT_VERSION && cached.spec) specs.push(cached.spec)
    } catch {
      // uszkodzony plik pamięci – pomijam
    }
  }
  return specs
}

/**
 * Pisze teksty dla kart (z imieniem, które karta dostanie). Karta bez zdjęć, po przekroczeniu limitu kosztu albo
 * liczby kart, jest pomijana z komunikatem. Zwraca pozycje w formacie pliku opisów.
 */
export async function describeWithModel(
  items: Array<{ card: DraftCard; name: string }>,
  opts: ModelOptions,
): Promise<{ specs: OpisSzkicu[]; report: ModelReport[]; costUsd: number }> {
  const bin = findClaude()
  const report: ModelReport[] = []
  const specs: OpisSzkicu[] = []
  if (!bin) {
    for (const { card } of items)
      report.push({
        id: card.id,
        status: 'błąd',
        note: 'nie znalazłam programu claude (Claude Code) na tym komputerze',
        costUsd: 0,
      })
    return { specs, report, costUsd: 0 }
  }
  await mkdir(opts.cacheDir, { recursive: true })
  const examples = loadExamples()
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'opisz-model-'))
  let spent = 0
  let called = 0
  try {
    for (const { card, name } of items) {
      const { images, mediaIds, notes } = await collectImages(card, opts.site)
      const hash = inputHash(card, mediaIds, opts.model)
      const cached = await readFile(cachePath(opts.cacheDir, card.id), 'utf8')
        .then((text) => JSON.parse(text) as Cached)
        .catch(() => undefined)
      if (cached?.hash === hash && cached.version === PROMPT_VERSION) {
        specs.push(cached.spec)
        report.push({
          id: card.id,
          status: 'z pamięci',
          note: 'te same posty i zdjęcia – bez nowego wywołania',
          costUsd: 0,
        })
        continue
      }
      if (!images.length) {
        report.push({
          id: card.id,
          status: 'pominięte',
          note: `brak zdjęć dla modelu${notes.length ? ` (${notes.join('; ')})` : ''}`,
          costUsd: 0,
        })
        continue
      }
      if (called >= opts.maxCards) {
        report.push({
          id: card.id,
          status: 'pominięte',
          note: `limit ${opts.maxCards} kart na przebieg – reszta w następnym`,
          costUsd: 0,
        })
        continue
      }
      if (spent >= opts.maxRunUsd) {
        report.push({
          id: card.id,
          status: 'pominięte',
          note: `limit kosztu przebiegu (${opts.maxRunUsd} USD) wyczerpany`,
          costUsd: 0,
        })
        continue
      }
      called += 1
      opts.log(`  model: #${card.id} (${images.length} zdj.) …`)
      let cost = 0
      let checked: ReturnType<typeof checkModelOutput> | undefined
      let error = ''
      let problems: string[] | undefined
      // Najwyżej dwie próby: druga dostaje listę błędów pierwszej.
      for (let attempt = 1; attempt <= 2; attempt++) {
        if (spent + cost >= opts.maxRunUsd) break
        const prompt = buildPrompt(card, examples, { photos: images.length, problems })
        const result = await askClaude(bin, prompt, images, opts, cwd)
        cost += result.costUsd
        if (result.error) {
          error = result.error
          break
        }
        checked = checkModelOutput(result.output, card, name)
        if (!checked.problems.length) break
        problems = checked.problems
        opts.log(`  model: #${card.id} próba ${attempt}: ${checked.problems.join('; ')}`)
      }
      spent += cost
      if (!checked) {
        report.push({
          id: card.id,
          status: 'błąd',
          note: error || 'brak odpowiedzi',
          costUsd: cost,
        })
        continue
      }
      const spec = { ...checked.spec, uwagi: [...(checked.spec.uwagi ?? []), ...notes] }
      if (checked.problems.length) {
        // Tekst po dwóch próbach dalej łamie zasady: nie wpisujemy go, zostają tylko pewne parametry.
        delete spec.lead
        delete spec.description
        spec.uwagi = [
          ...(spec.uwagi ?? []),
          `model nie napisał tekstu zgodnego ze schematem: ${checked.problems.join('; ')}`,
        ]
      }
      await writeFile(
        cachePath(opts.cacheDir, card.id),
        `${JSON.stringify({ version: PROMPT_VERSION, hash, model: opts.model, at: new Date().toISOString(), costUsd: cost, spec, problems: checked.problems } satisfies Cached, null, 1)}\n`,
      )
      specs.push(spec)
      report.push({
        id: card.id,
        status: 'nowe',
        note: checked.problems.length ? 'tylko parametry (tekst odrzucony)' : 'tekst i parametry',
        costUsd: cost,
      })
    }
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
  return { specs, report, costUsd: spent }
}
