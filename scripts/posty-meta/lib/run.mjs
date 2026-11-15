// Jedno uruchomienie: sprawdź źródła, zapisz nowe posty z plikami, wyślij mail o nowościach i problemach.
import path from 'node:path'
import { runProblems } from './config.mjs'
import { classify, createGraph, SEVERE_KINDS } from './graph.mjs'
import { excerpt, formatDateTime, plural, sendMail } from './mail.mjs'
import { bestPhotoUrl, discoverIgUserId, fetchOne, listSource, videoSourceUrl } from './sources.mjs'
import {
  INDEX_FILE,
  POSTS_DIR,
  acquireLock,
  copyKnown,
  downloadFile,
  ensureDir,
  findExisting,
  folderName,
  loadState,
  saveState,
  writeFile,
  writeJsonAtomic,
} from './store.mjs'

const DAY = 864e5
const SOURCE_LABEL = { posts: 'posty FB', video_reels: 'rolki FB', instagram: 'Instagram' }
const KIND_LABEL = {
  token: 'token nieważny, wygasł albo został cofnięty',
  permission: 'brak uprawnień',
  limit: 'limit zapytań Meta',
  network: 'brak połączenia',
  config: 'konfiguracja',
  'failed-item': 'nie udało się pobrać plików',
  'token-warning': 'token wkrótce wygaśnie',
  other: 'błąd',
}
const ORDER = { 'facebook:post': 0, 'facebook:reel': 1, 'instagram:post': 2 }

export function makeLogger(timeZone, write = (s) => process.stdout.write(s)) {
  const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone, dateStyle: 'short', timeStyle: 'medium' })
  return (msg) => write(`${fmt.format(new Date())} ${msg}\n`)
}

export function makeClients(cfg, fetchImpl, retryDelayMs) {
  const common = { base: cfg.graphBase, version: cfg.apiVersion, timeoutMs: cfg.timeoutMs, fetchImpl, retryDelayMs, secrets: cfg.secrets }
  const fb = createGraph({ ...common, token: cfg.pageToken, appSecret: cfg.appSecret })
  const ig = cfg.igToken ? createGraph({ ...common, token: cfg.igToken, appSecret: cfg.igAppSecret }) : fb
  return { fb, ig }
}

/** Dane tokena z debug_token (najlepiej tokenem aplikacji: META_APP_ID + META_APP_SECRET). */
export async function debugToken(cfg, fetchImpl, token, retryDelayMs) {
  const appToken = cfg.appId && cfg.appSecret ? `${cfg.appId}|${cfg.appSecret}` : token
  const g = createGraph({
    base: cfg.graphBase,
    version: cfg.apiVersion,
    token: appToken,
    timeoutMs: cfg.timeoutMs,
    fetchImpl,
    retryDelayMs,
    secrets: [...cfg.secrets, token, appToken],
  })
  const body = await g.get('debug_token', { input_token: token })
  return body.data || {}
}

/** Ostrzeżenia o wygasaniu tokena; pusta lista, gdy wszystko w porządku. */
export function tokenFindings(info, now, warnDays, timeZone) {
  const out = []
  if (info.is_valid === false) {
    out.push({ scope: 'token', kind: 'token', message: `token jest nieważny${info.error?.message ? ` (${info.error.message})` : ''}`, isError: true })
    return out
  }
  const limit = now.getTime() + warnDays * DAY
  const check = (ts, what) => {
    if (ts && ts * 1000 < limit) out.push({ scope: 'token', kind: 'token-warning', message: `${what} ${formatDateTime(new Date(ts * 1000).toISOString(), timeZone)}` })
  }
  check(info.expires_at, 'token strony wygasa')
  check(info.data_access_expires_at, 'dostęp aplikacji do danych wygasa')
  return out
}

async function saveItem(item, prev, ctx) {
  const { cfg, state, fb, fetchImpl, log } = ctx
  const folder = prev?.folder || folderName(item, cfg.timezone)
  const dir = path.join(cfg.dataDir, POSTS_DIR, folder)
  await ensureDir(dir)
  const files = []
  let missing = 0
  let lastError = ''
  for (const [i, m] of item.media.entries()) {
    const base = String(i + 1).padStart(2, '0')
    const entry = { type: m.type, id: m.id || null }
    if ((m.type === 'video' && !cfg.downloadVideos) || (m.type !== 'video' && !cfg.downloadPhotos)) {
      files.push({ ...entry, skipped: 'pobieranie wyłączone w konfiguracji' })
      continue
    }
    try {
      let got = await findExisting(dir, base)
      if (!got && m.id && state.media[m.id]) got = await copyKnown(cfg.dataDir, state.media[m.id], dir, base)
      if (!got) {
        let url = m.url
        if (item.platform === 'facebook' && m.type === 'photo' && m.id && cfg.photoFullRes) {
          url = (await bestPhotoUrl(fb, m.id).catch(() => null)) || url
        }
        if (item.platform === 'facebook' && m.type === 'video' && !url && m.id) url = await videoSourceUrl(fb, m.id).catch(() => null)
        if (!url) throw new Error('API nie podało adresu pliku')
        got = await downloadFile(url, dir, base, { type: m.type, maxBytes: cfg.maxFileBytes, timeoutMs: cfg.timeoutMs, fetchImpl })
      }
      files.push({ ...entry, name: got.name, bytes: got.bytes })
      if (m.id && !state.media[m.id]) state.media[m.id] = path.join(POSTS_DIR, folder, got.name)
    } catch (e) {
      missing++
      lastError = fb.hide(e.message)
      files.push({ ...entry, error: lastError })
      log(`  ${folder}: plik ${base} (${m.type}) nie pobrany: ${lastError}`)
    }
  }
  const meta = {
    platform: item.platform,
    kind: item.kind,
    id: item.id,
    created_time: item.createdTime,
    created_local: formatDateTime(item.createdTime, cfg.timezone),
    title: item.title || undefined,
    text: item.text,
    permalink: item.permalink,
    files,
    fetched_at: new Date().toISOString(),
    api: item.raw,
  }
  await writeJsonAtomic(path.join(dir, 'post.json'), meta)
  await writeFile(path.join(dir, 'tresc.txt'), `${[item.title, item.text].filter(Boolean).join('\n\n')}\n\n${item.permalink || ''}\n`)
  return { folder, files, missing, lastError }
}

function sinceFor(state, cfg, started, firstRun, opts) {
  const watchFrom = new Date(state.watchFrom)
  if (opts.since) return opts.since
  if (firstRun) return watchFrom
  let base = started.getTime() - cfg.lookbackDays * DAY
  if (state.lastSuccessAt) base = Math.min(base, new Date(state.lastSuccessAt).getTime() - DAY)
  return new Date(Math.max(watchFrom.getTime(), base))
}

function describeItem(n, item, rec, cfg) {
  const photos = item.media.filter((m) => m.type !== 'video').length
  const videos = item.media.length - photos
  const what = [photos && `${photos} ${plural(photos, 'zdjęcie', 'zdjęcia', 'zdjęć')}`, videos && `${videos} ${plural(videos, 'film', 'filmy', 'filmów')}`]
    .filter(Boolean)
    .join(', ')
  const where = item.platform === 'instagram' ? 'Instagram' : item.kind === 'reel' ? 'Facebook, rolka' : 'Facebook, post'
  const lines = [`${n}. ${where}, ${formatDateTime(item.createdTime, cfg.timezone)}`]
  const t = excerpt([item.title, item.text].filter(Boolean).join(' – '))
  lines.push(`   Treść: ${t ? `„${t}”` : '(bez tekstu)'}`)
  if (item.permalink) lines.push(`   Link: ${item.permalink}`)
  if (rec) {
    lines.push(`   Pliki: ${what || 'brak'} → ${path.join(cfg.dataDir, POSTS_DIR, rec.folder)}`)
    if (rec.status === 'pending') lines.push(`   Uwaga: nie wszystkie pliki się pobrały, spróbuję ponownie przy następnym sprawdzeniu.`)
  } else lines.push(`   Pliki: ${what || 'brak'}`)
  return lines.join('\n')
}

export async function writeIndex(cfg, state) {
  const rows = Object.entries(state.items)
    .filter(([, r]) => r.status !== 'duplicate')
    .map(([key, r]) => ({
      key,
      created_time: r.createdTime,
      platform: r.platform,
      kind: r.kind,
      status: r.status,
      folder: r.folder ? path.join(POSTS_DIR, r.folder) : null,
      files: r.files,
      permalink: r.permalink,
      excerpt: r.excerpt,
    }))
    .sort((a, b) => String(b.created_time).localeCompare(String(a.created_time)))
  await writeJsonAtomic(path.join(cfg.dataDir, INDEX_FILE), { updated_at: new Date().toISOString(), posts: rows })
}

/**
 * opts: { force, dryRun, since: Date }
 * deps: { fetchImpl, now, log, transport (mail w testach), retryDelayMs }
 * Zwraca { exitCode, skipped?, newItems, errors, notices, mailed }.
 */
export async function runOnce(cfg, opts = {}, deps = {}) {
  const log = deps.log ?? makeLogger(cfg.timezone)
  await ensureDir(cfg.dataDir)
  const release = await acquireLock(cfg.dataDir)
  try {
    return await runLocked(cfg, opts, { ...deps, log })
  } finally {
    await release()
  }
}

async function runLocked(cfg, opts, deps) {
  const { log } = deps
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch
  const started = deps.now ? deps.now() : new Date()
  const state = await loadState(cfg.dataDir)

  if (!opts.force && !opts.dryRun && state.lastRunAt && cfg.intervalHours > 0) {
    const elapsed = started - new Date(state.lastRunAt)
    // 10 minut zapasu: cron co godzinę nie powinien przesuwać sprawdzania o całą godzinę.
    if (elapsed < cfg.intervalHours * 3600e3 - 10 * 60e3) return { exitCode: 0, skipped: true, newItems: [], errors: [], notices: [] }
  }

  const errors = []
  const notices = []
  const problems = runProblems(cfg)
  if (problems.length) {
    errors.push(...problems.map((message) => ({ scope: 'konfiguracja', kind: 'config', message })))
  }

  const firstRun = !state.watchFrom
  if (firstRun) {
    state.watchFrom = cfg.firstRunDays > 0 ? new Date(started.getTime() - cfg.firstRunDays * DAY).toISOString() : new Date(0).toISOString()
  }
  if (opts.since && opts.since < new Date(state.watchFrom)) state.watchFrom = opts.since.toISOString()
  const watchFrom = new Date(state.watchFrom)
  const since = sinceFor(state, cfg, started, firstRun, opts)
  log(`start${opts.dryRun ? ' (na sucho)' : ''}${firstRun ? ' (pierwsze uruchomienie)' : ''}: sprawdzam ${cfg.sources.map((s) => SOURCE_LABEL[s]).join(', ')} od ${formatDateTime(since.toISOString(), cfg.timezone)}`)

  const { fb, ig } = makeClients(cfg, fetchImpl, deps.retryDelayMs)
  const candidates = []
  const failedSources = new Set()
  if (!problems.length) {
    for (const source of cfg.sources) {
      try {
        let igUserId
        if (source === 'instagram') {
          igUserId = cfg.igUserId || state.igUserId || (await discoverIgUserId(ig, cfg.pageId))
          if (!igUserId) {
            throw Object.assign(new Error('strona nie ma podpiętego firmowego konta Instagram albo token nie ma uprawnienia instagram_basic; ustaw IG_USER_ID'), {
              kind: 'config',
            })
          }
          if (!cfg.igUserId) state.igUserId = igUserId
        }
        const { items, capped } = await listSource(source, { fb, ig, cfg, igUserId }, since)
        if (capped) log(`${SOURCE_LABEL[source]}: osiągnięto MAX_PAGES=${cfg.maxPages}, starsze posty zostaną na następne uruchomienie`)
        log(`${SOURCE_LABEL[source]}: ${items.length} ${plural(items.length, 'element', 'elementy', 'elementów')} w oknie czasu`)
        candidates.push(...items)
      } catch (e) {
        failedSources.add(source)
        const message = fb.hide(e.message)
        errors.push({ scope: SOURCE_LABEL[source], kind: classify(e), message, source: true })
        log(`${SOURCE_LABEL[source]}: BŁĄD ${message}`)
      }
    }
  }

  // Ponowienia: posty z niepobranymi plikami, których nie ma już w oknie czasu.
  const seen = new Set(candidates.map((c) => c.key))
  for (const [key, rec] of Object.entries(state.items)) {
    if (rec.status !== 'pending' || seen.has(key) || problems.length) continue
    const src = key.startsWith('ig:') ? 'instagram' : key.startsWith('fb-reel:') ? 'video_reels' : 'posts'
    if (failedSources.has(src)) continue
    try {
      candidates.push(await fetchOne({ key, id: rec.id }, { fb, ig }))
    } catch (e) {
      const kind = classify(e)
      if (['token', 'network', 'limit'].includes(kind)) continue
      rec.attempts = (rec.attempts || 0) + 1
      rec.lastError = fb.hide(e.message)
      if (rec.attempts >= cfg.maxRetries) {
        rec.status = 'failed'
        errors.push({ scope: 'pliki', kind: 'failed-item', alertKey: `item:${key}`, message: `${rec.folder}: post niedostępny w API po ${rec.attempts} próbach (${rec.lastError})` })
      }
    }
  }

  candidates.sort((a, b) => (ORDER[`${a.platform}:${a.kind}`] ?? 9) - (ORDER[`${b.platform}:${b.kind}`] ?? 9) || String(a.createdTime).localeCompare(String(b.createdTime)))

  const ctx = { cfg, state, fb, fetchImpl, log }
  const newItems = []
  const handled = new Set()
  const owners = opts.dryRun ? { ...state.mediaOwners } : state.mediaOwners
  for (const item of candidates) {
    if (handled.has(item.key)) continue
    handled.add(item.key)
    const prev = state.items[item.key]
    if (prev && prev.status !== 'pending') continue
    if (!prev && (!item.createdTime || new Date(item.createdTime) < watchFrom)) continue
    if (!prev) {
      const owner = item.media.map((m) => m.id && owners[m.id]).find((k) => k && k !== item.key)
      if (owner && item.kind === 'reel') {
        if (!opts.dryRun) state.items[item.key] = { status: 'duplicate', of: owner, id: item.id, platform: item.platform, kind: item.kind, createdTime: item.createdTime }
        log(`${item.key}: ta sama rolka co ${owner}, pomijam`)
        continue
      }
    }
    if (opts.dryRun) {
      for (const m of item.media) if (m.id && !owners[m.id]) owners[m.id] = item.key
      newItems.push({ item, rec: null })
      continue
    }
    const res = await saveItem(item, prev, ctx)
    const attempts = (prev?.attempts || 0) + (res.missing ? 1 : 0)
    const rec = {
      id: item.id,
      platform: item.platform,
      kind: item.kind,
      status: res.missing ? (attempts >= cfg.maxRetries ? 'failed' : 'pending') : 'ok',
      folder: res.folder,
      attempts,
      files: res.files.filter((f) => f.name).length,
      createdTime: item.createdTime,
      permalink: item.permalink,
      excerpt: excerpt(item.text, 140),
      firstSeenAt: prev?.firstSeenAt || started.toISOString(),
      lastError: res.missing ? res.lastError : undefined,
    }
    if (rec.status === 'failed') {
      errors.push({
        scope: 'pliki',
        kind: 'failed-item',
        alertKey: `item:${item.key}`,
        message: `${res.folder}: ${res.missing} ${plural(res.missing, 'plik', 'pliki', 'plików')} nie ${res.missing === 1 ? 'pobrał' : 'pobrały'} się po ${attempts} próbach (${res.lastError})`,
      })
    }
    for (const m of item.media) if (m.id && !owners[m.id]) owners[m.id] = item.key
    state.items[item.key] = rec
    if (!prev) newItems.push({ item, rec })
    else if (rec.status === 'ok') log(`${res.folder}: uzupełniono brakujące pliki`)
    log(`${res.folder}: ${prev ? 'ponowienie' : 'nowy'}, ${rec.files}/${item.media.length} ${plural(item.media.length, 'plik', 'pliki', 'plików')}${rec.status !== 'ok' ? ` (${rec.status})` : ''}`)
    await saveState(cfg.dataDir, state)
  }

  if (opts.dryRun) {
    log(`na sucho: ${newItems.length} ${plural(newItems.length, 'nowy element', 'nowe elementy', 'nowych elementów')} (nic nie zapisuję, nie wysyłam maili)`)
    newItems.forEach(({ item }, i) => (deps.print ?? console.log)(`\n${describeItem(i + 1, item, null, cfg)}`))
    for (const e of errors) log(`problem: ${e.scope}: ${e.message}`)
    return { exitCode: errors.length ? 1 : 0, newItems, errors, notices }
  }

  // Ważność tokena: raz na dobę.
  if (cfg.pageToken && !problems.length && !failedSources.size) {
    const last = state.tokenCheckedAt ? new Date(state.tokenCheckedAt) : null
    if (!last || started - last > 20 * 3600e3) {
      try {
        const info = await debugToken(cfg, fetchImpl, cfg.pageToken, deps.retryDelayMs)
        for (const f of tokenFindings(info, started, cfg.tokenWarnDays, cfg.timezone)) (f.isError ? errors : notices).push(f)
      } catch (e) {
        log(`nie udało się sprawdzić ważności tokena (to nie blokuje pobierania): ${fb.hide(e.message)}`)
      }
      state.tokenCheckedAt = started.toISOString()
    }
  }

  // Maile.
  const hadErrors = errors.length > 0
  state.failStreak = hadErrors ? (state.failStreak || 0) + 1 : 0
  const repeatMs = cfg.errorRepeatHours * 3600e3
  const alertKey = (e) => e.alertKey || `${e.scope}:${e.kind}`
  const dueAlerts = [...errors, ...notices].filter((e) => {
    if (!SEVERE_KINDS.has(e.kind) && state.failStreak < cfg.errorMailAfter) return false
    const last = state.alerts[alertKey(e)]
    return !last || started - new Date(last) >= repeatMs
  })
  const recovery = !hadErrors && state.alerted
  const mailNew = cfg.notifyNew && newItems.length > 0
  const mailAlerts = cfg.notifyErrors && dueAlerts.length > 0
  const mailRecovery = cfg.notifyErrors && recovery

  let mailed = false
  let exitCode = hadErrors ? 1 : 0
  if (mailNew || mailAlerts || mailRecovery) {
    const parts = []
    let subject
    if (mailNew) {
      const n = newItems.length
      subject = `${n} ${plural(n, 'nowy post', 'nowe posty', 'nowych postów')}`
      const shown = newItems.slice(0, cfg.mailMaxItems)
      parts.push(`Nowe posty pracowni (sprawdzone ${formatDateTime(started.toISOString(), cfg.timezone)}):`)
      parts.push(shown.map(({ item, rec }, i) => describeItem(i + 1, item, rec, cfg)).join('\n\n'))
      if (n > shown.length) parts.push(`…i jeszcze ${n - shown.length}; pełna lista: ${path.join(cfg.dataDir, INDEX_FILE)}`)
    }
    if (mailAlerts) {
      if (!subject) subject = `Problem: ${dueAlerts[0].scope} – ${KIND_LABEL[dueAlerts[0].kind] || 'błąd'}`
      else subject += ' + problem'
      parts.push(['Problemy:', ...dueAlerts.map((e) => `- ${e.scope}: ${KIND_LABEL[e.kind] || 'błąd'}. ${e.message}`)].join('\n'))
      if (dueAlerts.some((e) => e.kind === 'token' || e.kind === 'token-warning')) {
        parts.push('Co zrobić z tokenem: README skryptu (scripts/posty-meta/README.md), sekcja „Token”.')
      }
      if (dueAlerts.some((e) => !SEVERE_KINDS.has(e.kind))) parts.push(`Ten sam problem powtórzył się ${state.failStreak} razy z rzędu.`)
    } else if (mailRecovery) {
      subject = subject ? `${subject} (skrypt znowu działa)` : 'Skrypt znowu działa'
      parts.push('Sprawdzanie postów znowu działa bez błędów.')
    }
    parts.push(`Log: ${path.join(path.dirname(cfg.configPath), 'posty.log')} · konfiguracja: ${cfg.configPath}`)
    try {
      const r = await sendMail(cfg, { subject, text: parts.join('\n\n') }, { log, transport: deps.transport })
      mailed = r.sent
      if (r.sent) log(`mail wysłany: ${subject}`)
      if (r.sent || cfg.mailMethod === 'none' || !cfg.notifyTo.length) {
        if (mailAlerts) {
          for (const e of dueAlerts) state.alerts[alertKey(e)] = started.toISOString()
          if (dueAlerts.some((e) => e.kind !== 'token-warning')) state.alerted = true
        }
        if (mailRecovery) state.alerted = false
      }
    } catch (e) {
      exitCode = 1
      log(`BŁĄD wysyłki maila: ${fb.hide(e.message)}`)
    }
  } else if (recovery && !cfg.notifyErrors) state.alerted = false

  state.lastRunAt = started.toISOString()
  if (!failedSources.size && !problems.length) state.lastSuccessAt = started.toISOString()
  await saveState(cfg.dataDir, state)
  await writeIndex(cfg, state)
  log(`koniec: ${newItems.length} ${plural(newItems.length, 'nowy', 'nowe', 'nowych')}, ${errors.length} ${plural(errors.length, 'problem', 'problemy', 'problemów')}`)
  return { exitCode, newItems, errors, notices, mailed }
}
