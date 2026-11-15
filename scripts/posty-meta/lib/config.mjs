// Konfiguracja skryptu postów: plik KEY=WARTOŚĆ (jak .env), bez sekretów w repo.
// Kolejność (późniejsze wygrywa): wartości domyślne → zmienne SMTP_* z SMTP_ENV_FILE → plik konfiguracyjny →
// zmienne środowiskowe o tych samych nazwach (przydatne do jednorazowej zmiany, np. INTERVAL_HOURS=0).
import { readFileSync, statSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const DEFAULT_CONFIG_PATH = '~/pznowak-posty/posty.env'

// Każdy klucz, który skrypt rozumie, z wartością domyślną. Opis każdego jest w posty.env.example.
export const DEFAULTS = {
  META_PAGE_ID: '518148711375873',
  META_PAGE_TOKEN: '',
  META_API_VERSION: 'v27.0',
  META_APP_ID: '',
  META_APP_SECRET: '',
  SOURCES: 'posts,video_reels',
  INTERVAL_HOURS: '6',
  LOOKBACK_DAYS: '14',
  FIRST_RUN_DAYS: '7',
  MAX_PAGES: '20',
  DATA_DIR: '~/pznowak-posty/dane',
  DOWNLOAD_PHOTOS: '1',
  DOWNLOAD_VIDEOS: '1',
  PHOTO_FULL_RES: '1',
  MAX_FILE_MB: '500',
  MAX_RETRIES: '5',
  IG_USER_ID: '',
  IG_TOKEN: '',
  IG_APP_SECRET: '',
  NOTIFY_TO: '',
  NOTIFY_NEW_POSTS: '1',
  NOTIFY_ERRORS: '1',
  ERROR_MAIL_AFTER: '3',
  ERROR_REPEAT_HOURS: '24',
  TOKEN_WARN_DAYS: '14',
  MAIL_METHOD: 'smtp',
  MAIL_FROM: '',
  MAIL_SUBJECT_PREFIX: '[Posty pznowak]',
  MAIL_MAX_ITEMS: '20',
  SMTP_ENV_FILE: '',
  SMTP_HOST: '',
  SMTP_PORT: '465',
  SMTP_USER: '',
  SMTP_PASS: '',
  SMTP_FROM: '',
  SENDMAIL_PATH: '/usr/sbin/sendmail',
  TIMEZONE: 'Europe/Warsaw',
  REQUEST_TIMEOUT_S: '60',
  GRAPH_BASE_URL: 'https://graph.facebook.com',
}

export const KNOWN_SOURCES = ['posts', 'video_reels', 'instagram']
const SECRET_KEYS = ['META_PAGE_TOKEN', 'META_APP_SECRET', 'IG_TOKEN', 'IG_APP_SECRET', 'SMTP_PASS']

export function expandHome(p, home = os.homedir()) {
  if (!p) return p
  if (p === '~') return home
  if (p.startsWith('~/')) return path.join(home, p.slice(2))
  return p.replace(/^\$HOME(?=\/|$)/, home)
}

/** Parser plików .env: komentarze #, `export `, wartości w "…" lub '…', komentarz po spacji w wartości bez cudzysłowu. */
export function parseEnv(text) {
  const out = {}
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (!m) continue
    let value = m[2]
    if (value.startsWith('"')) {
      let end = 1
      let res = ''
      for (; end < value.length; end++) {
        const ch = value[end]
        if (ch === '\\' && end + 1 < value.length) {
          const next = value[++end]
          res += next === 'n' ? '\n' : next
        } else if (ch === '"') break
        else res += ch
      }
      value = res
    } else if (value.startsWith("'")) {
      const end = value.indexOf("'", 1)
      value = end > 0 ? value.slice(1, end) : value.slice(1)
    } else {
      value = value.replace(/\s+#.*$/, '').trim()
    }
    out[m[1]] = value
  }
  return out
}

const bool = (v) => /^(1|true|tak|yes|on)$/i.test(String(v).trim())
function num(raw, name, problems, { min = 0, float = false } = {}) {
  const str = String(raw).trim().replace(',', '.')
  const n = Number(str)
  if (!(float ? /^\d+(\.\d+)?$/ : /^\d+$/).test(str) || n < min) {
    problems.push(`niepoprawna wartość ${name} (oczekuję liczby${min ? ` ≥ ${min}` : ''})`)
    return Number(DEFAULTS[name])
  }
  return n
}

/** Adres z „Nazwa <adres>” albo sam adres. */
export function addressOf(from) {
  const m = /<([^<>]+)>\s*$/.exec(String(from || ''))
  return (m ? m[1] : String(from || '')).trim()
}

/**
 * Wczytuje konfigurację. Zwraca { cfg, problems, warnings }. W problemach są tylko nazwy zmiennych,
 * nigdy wartości (żeby żaden sekret nie trafił do logu albo maila).
 */
export function loadConfig(configPath = DEFAULT_CONFIG_PATH, { env = process.env, home = os.homedir() } = {}) {
  const problems = []
  const warnings = []
  const file = path.resolve(expandHome(configPath, home))
  let fromFile = {}
  try {
    fromFile = parseEnv(readFileSync(file, 'utf8'))
    const mode = statSync(file).mode & 0o777
    if (mode & 0o077) warnings.push(`plik ${file} mogą czytać inni użytkownicy (prawa ${mode.toString(8)}); zrób: chmod 600 ${file}`)
  } catch (e) {
    problems.push(e.code === 'ENOENT' ? `brak pliku konfiguracji ${file}` : `nie mogę odczytać ${file}: ${e.message}`)
  }

  const fromEnv = {}
  for (const k of Object.keys(DEFAULTS)) if (env[k] !== undefined) fromEnv[k] = env[k]

  const smtpFileRaw = fromEnv.SMTP_ENV_FILE ?? fromFile.SMTP_ENV_FILE ?? DEFAULTS.SMTP_ENV_FILE
  const fromSmtpFile = {}
  if (smtpFileRaw) {
    const smtpFile = path.resolve(path.dirname(file), expandHome(smtpFileRaw, home))
    try {
      const all = parseEnv(readFileSync(smtpFile, 'utf8'))
      for (const [k, v] of Object.entries(all)) if (k.startsWith('SMTP_') && k !== 'SMTP_ENV_FILE') fromSmtpFile[k] = v
    } catch (e) {
      warnings.push(`nie mogę odczytać SMTP_ENV_FILE (${smtpFile}): ${e.code || e.message}; maile mogą nie wychodzić`)
    }
  }

  const raw = { ...DEFAULTS, ...fromSmtpFile, ...fromFile, ...fromEnv }
  const s = (k) => String(raw[k] ?? '').trim()

  const sources = s('SOURCES')
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((x) => x.toLowerCase())
  for (const src of sources) if (!KNOWN_SOURCES.includes(src)) problems.push(`nieznane źródło w SOURCES: ${src} (dozwolone: ${KNOWN_SOURCES.join(', ')})`)
  if (!sources.length) problems.push('SOURCES jest puste')

  const mailMethod = s('MAIL_METHOD').toLowerCase()
  if (!['smtp', 'sendmail', 'none'].includes(mailMethod)) problems.push('MAIL_METHOD musi być smtp, sendmail albo none')

  const smtp = {
    host: s('SMTP_HOST'),
    port: num(s('SMTP_PORT') || '465', 'SMTP_PORT', problems, { min: 1 }),
    user: s('SMTP_USER'),
    pass: String(raw.SMTP_PASS ?? ''), // hasło bez przycinania
    from: s('SMTP_FROM'),
  }
  const notifyTo = s('NOTIFY_TO')
    .split(/[\s,;]+/)
    .filter(Boolean)
  const smtpAddress = addressOf(smtp.from) || smtp.user
  const mailFrom = s('MAIL_FROM') || (smtpAddress ? `Posty pznowak <${smtpAddress}>` : '')
  if (notifyTo.length && mailMethod === 'smtp') {
    for (const k of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']) if (!s(k)) warnings.push(`MAIL_METHOD=smtp, ale brak ${k} (ustaw go albo SMTP_ENV_FILE); maile nie wyjdą`)
  }
  if (notifyTo.length && mailMethod !== 'none' && !mailFrom) warnings.push('brak nadawcy: ustaw MAIL_FROM albo SMTP_FROM; maile nie wyjdą')

  const cfg = {
    configPath: file,
    pageId: s('META_PAGE_ID'),
    pageToken: s('META_PAGE_TOKEN'),
    apiVersion: s('META_API_VERSION'),
    appId: s('META_APP_ID'),
    appSecret: s('META_APP_SECRET'),
    graphBase: s('GRAPH_BASE_URL').replace(/\/+$/, ''),
    sources,
    intervalHours: num(s('INTERVAL_HOURS'), 'INTERVAL_HOURS', problems, { float: true }),
    lookbackDays: num(s('LOOKBACK_DAYS'), 'LOOKBACK_DAYS', problems, { min: 1 }),
    firstRunDays: num(s('FIRST_RUN_DAYS'), 'FIRST_RUN_DAYS', problems),
    maxPages: num(s('MAX_PAGES'), 'MAX_PAGES', problems, { min: 1 }),
    dataDir: path.resolve(path.dirname(file), expandHome(s('DATA_DIR'), home)),
    downloadPhotos: bool(s('DOWNLOAD_PHOTOS')),
    downloadVideos: bool(s('DOWNLOAD_VIDEOS')),
    photoFullRes: bool(s('PHOTO_FULL_RES')),
    maxFileBytes: num(s('MAX_FILE_MB'), 'MAX_FILE_MB', problems, { min: 1, float: true }) * 1024 * 1024,
    maxRetries: num(s('MAX_RETRIES'), 'MAX_RETRIES', problems, { min: 1 }),
    igUserId: s('IG_USER_ID'),
    igToken: s('IG_TOKEN'),
    igAppSecret: s('IG_APP_SECRET'),
    notifyTo,
    notifyNew: bool(s('NOTIFY_NEW_POSTS')),
    notifyErrors: bool(s('NOTIFY_ERRORS')),
    errorMailAfter: num(s('ERROR_MAIL_AFTER'), 'ERROR_MAIL_AFTER', problems, { min: 1 }),
    errorRepeatHours: num(s('ERROR_REPEAT_HOURS'), 'ERROR_REPEAT_HOURS', problems, { float: true }),
    tokenWarnDays: num(s('TOKEN_WARN_DAYS'), 'TOKEN_WARN_DAYS', problems),
    mailMethod,
    mailFrom,
    subjectPrefix: s('MAIL_SUBJECT_PREFIX'),
    mailMaxItems: num(s('MAIL_MAX_ITEMS'), 'MAIL_MAX_ITEMS', problems, { min: 1 }),
    smtp,
    sendmailPath: s('SENDMAIL_PATH'),
    timezone: s('TIMEZONE') || 'Europe/Warsaw',
    timeoutMs: num(s('REQUEST_TIMEOUT_S'), 'REQUEST_TIMEOUT_S', problems, { min: 1, float: true }) * 1000,
    secrets: SECRET_KEYS.map((k) => String(raw[k] ?? '')).filter((v) => v.length >= 6),
  }

  if (!/^v\d+\.\d+$/.test(cfg.apiVersion)) problems.push('META_API_VERSION ma postać vNN.N, np. v27.0')
  if (!/^\d+$/.test(cfg.pageId)) problems.push('META_PAGE_ID to sam numer strony')
  try {
    new Intl.DateTimeFormat('pl-PL', { timeZone: cfg.timezone })
  } catch {
    warnings.push(`nieznana strefa TIMEZONE=${cfg.timezone}; używam UTC`)
    cfg.timezone = 'UTC'
  }
  return { cfg, problems, warnings }
}

/** Problemy, przez które nie da się pobierać postów (brak tokena itp.). */
export function runProblems(cfg) {
  const p = []
  if (!cfg.pageToken && cfg.sources.some((x) => x !== 'instagram')) p.push('brak META_PAGE_TOKEN (instrukcja: README, sekcja „Token”)')
  if (cfg.sources.includes('instagram') && !cfg.igToken && !cfg.pageToken) p.push('brak IG_TOKEN ani META_PAGE_TOKEN dla Instagrama')
  return p
}
