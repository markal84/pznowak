// Zapis na dysku: stan (stan.json), blokada przed równoległym uruchomieniem, pobieranie plików, katalogi postów.
import { createWriteStream } from 'node:fs'
import { copyFile, mkdir, open, readdir, readFile, rename, rm, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

export const STATE_FILE = 'stan.json'
export const INDEX_FILE = 'indeks.json'
export const POSTS_DIR = 'posty'
const LOCK_FILE = '.posty.lock'

export function emptyState() {
  return {
    version: 1,
    watchFrom: null, // posty starsze niż ta data są pomijane (ustawiane przy pierwszym uruchomieniu)
    lastRunAt: null,
    lastSuccessAt: null,
    items: {}, // klucz → { status: ok|pending|failed|duplicate, folder, attempts, createdTime, permalink, excerpt, … }
    media: {}, // id zdjęcia/filmu → ścieżka pliku względem DATA_DIR (żeby nie pobierać drugi raz tego samego filmu)
    mediaOwners: {}, // id zdjęcia/filmu → klucz posta, w którym pojawił się pierwszy raz (rolka = ten sam film co post)
    failStreak: 0,
    alerts: {}, // rodzaj alertu → kiedy ostatnio wysłany mail
    alerted: false,
    tokenCheckedAt: null,
    igUserId: null,
  }
}

export async function loadState(dataDir) {
  try {
    return { ...emptyState(), ...JSON.parse(await readFile(path.join(dataDir, STATE_FILE), 'utf8')) }
  } catch (e) {
    if (e.code === 'ENOENT') return emptyState()
    throw new Error(`nie mogę odczytać ${STATE_FILE}: ${e.message} (napraw albo przenieś plik; nie kasuj katalogu posty/)`)
  }
}

/** Zapis atomowy: najpierw plik tymczasowy, potem rename (przerwany zapis nie psuje stanu). */
export async function writeJsonAtomic(file, data) {
  const tmp = `${file}.tmp-${process.pid}`
  await writeFile(tmp, `${JSON.stringify(data, null, 1)}\n`)
  await rename(tmp, file)
}

export const saveState = (dataDir, state) => writeJsonAtomic(path.join(dataDir, STATE_FILE), state)

export class LockedError extends Error {}

/** Blokada: plik z numerem procesu; nieaktualny (proces już nie żyje) jest przejmowany. */
export async function acquireLock(dataDir) {
  const file = path.join(dataDir, LOCK_FILE)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fh = await open(file, 'wx')
      await fh.writeFile(String(process.pid))
      await fh.close()
      return async () => unlink(file).catch(() => {})
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      const pid = Number((await readFile(file, 'utf8').catch(() => '')).trim())
      let alive = false
      if (pid > 0) {
        try {
          process.kill(pid, 0)
          alive = true
        } catch (err) {
          alive = err.code === 'EPERM'
        }
      }
      if (alive) throw new LockedError(`skrypt już działa (proces ${pid}); pomijam to uruchomienie`)
      await unlink(file).catch(() => {})
    }
  }
  throw new LockedError('nie udało się założyć blokady')
}

const CT_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
}

export function extensionFor(contentType, url, type) {
  const ct = String(contentType || '').split(';')[0].trim().toLowerCase()
  if (CT_EXT[ct]) return CT_EXT[ct]
  try {
    const m = /\.([a-z0-9]{2,5})$/i.exec(new URL(url).pathname)
    if (m) return m[1].toLowerCase()
  } catch {}
  return type === 'video' ? 'mp4' : 'jpg'
}

/** Pobiera plik pod dir/base.<ext>. Zwraca { name, bytes }. Plik pojawia się dopiero po pełnym pobraniu. */
export async function downloadFile(url, dir, base, { type, maxBytes, timeoutMs, fetchImpl = globalThis.fetch }) {
  let res
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(Math.max(timeoutMs, 10 * 60_000)) })
  } catch (e) {
    throw new Error(`pobieranie nie powiodło się (${e.cause?.code || e.name})`)
  }
  if (!res.ok || !res.body) throw new Error(`serwer plików odpowiedział HTTP ${res.status}${res.status === 403 ? ' (link mógł wygasnąć)' : ''}`)
  const ct = res.headers.get('content-type') || ''
  if (/^text\/html/i.test(ct)) throw new Error('zamiast pliku przyszła strona HTML (link mógł wygasnąć)')
  const declared = Number(res.headers.get('content-length') || 0)
  if (declared && declared > maxBytes) throw new Error(`plik większy niż MAX_FILE_MB (${Math.round(declared / 1048576)} MB)`)
  const name = `${base}.${extensionFor(ct, url, type)}`
  const final = path.join(dir, name)
  const part = `${final}.part`
  let bytes = 0
  const limiter = new Transform({
    transform(chunk, _enc, cb) {
      bytes += chunk.length
      if (bytes > maxBytes) cb(new Error(`plik większy niż MAX_FILE_MB`))
      else cb(null, chunk)
    },
  })
  try {
    await pipeline(Readable.fromWeb(res.body), limiter, createWriteStream(part))
  } catch (e) {
    await rm(part, { force: true })
    throw new Error(e.message.includes('MAX_FILE_MB') ? e.message : `przerwane pobieranie (${e.code || e.message})`)
  }
  if (!bytes) {
    await rm(part, { force: true })
    throw new Error('pusty plik')
  }
  await rename(part, final)
  return { name, bytes }
}

export async function findExisting(dir, base) {
  const files = await readdir(dir).catch(() => [])
  const hit = files.find((f) => f.startsWith(`${base}.`) && !f.endsWith('.part') && !f.includes('.tmp-'))
  if (!hit) return null
  return { name: hit, bytes: (await stat(path.join(dir, hit))).size }
}

export async function copyKnown(dataDir, rel, dir, base) {
  const src = path.join(dataDir, rel)
  const s = await stat(src).catch(() => null)
  if (!s) return null
  const name = `${base}${path.extname(src)}`
  await copyFile(src, path.join(dir, name))
  return { name, bytes: s.size }
}

/** YYYY-MM-DD w strefie TIMEZONE. */
export function localDate(iso, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

export function folderName(item, timeZone) {
  const prefix = item.platform === 'instagram' ? 'ig_' : item.kind === 'reel' ? 'rolka_' : ''
  return `${localDate(item.createdTime, timeZone)}_${prefix}${item.id.replace(/[^A-Za-z0-9_-]/g, '')}`
}

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true })
}

export { writeFile }
