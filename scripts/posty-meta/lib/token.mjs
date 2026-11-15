// Wymiana krótkiego tokena użytkownika (Graph API Explorer) na token strony bez daty wygaśnięcia
// i zapis do pliku konfiguracji. Token nie jest wypisywany na ekran ani do logu.
import { open, readFile, rename, stat } from 'node:fs/promises'
import { createGraph } from './graph.mjs'
import { debugToken } from './run.mjs'

/** Ustawia KEY=wartość w pliku .env (zastępuje istniejący wiersz albo dopisuje), prawa 600. */
export async function writeConfigValue(file, key, value) {
  const text = await readFile(file, 'utf8')
  const line = `${key}=${value}`
  const re = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, 'm')
  const next = re.test(text) ? text.replace(re, () => line) : `${text.replace(/\n?$/, '\n')}${line}\n`
  const mode = ((await stat(file)).mode & 0o777) & ~0o077
  const tmp = `${file}.tmp-${process.pid}`
  const fh = await open(tmp, 'w', mode || 0o600)
  await fh.writeFile(next)
  await fh.close()
  await rename(tmp, file)
}

export async function exchangeToken(cfg, shortToken, { fetchImpl = globalThis.fetch, retryDelayMs } = {}) {
  if (!cfg.appId || !cfg.appSecret) {
    throw new Error('ustaw META_APP_ID i META_APP_SECRET w pliku konfiguracji (panel aplikacji Meta → Ustawienia aplikacji → Podstawowe)')
  }
  if (!/^[A-Za-z0-9]{20,}$/.test(shortToken)) throw new Error('to nie wygląda na token (oczekuję samego ciągu znaków, bez spacji i cudzysłowów)')
  const common = { base: cfg.graphBase, version: cfg.apiVersion, timeoutMs: cfg.timeoutMs, fetchImpl, retryDelayMs }
  const secrets = [shortToken, cfg.appSecret, ...cfg.secrets]

  const plain = createGraph({ ...common, token: '', secrets })
  const r1 = await plain.get(
    'oauth/access_token',
    { grant_type: 'fb_exchange_token', client_id: cfg.appId, client_secret: cfg.appSecret, fb_exchange_token: shortToken },
    { auth: false },
  )
  const longUser = r1.access_token
  if (!longUser) throw new Error('Meta nie zwróciła długiego tokena użytkownika')

  const user = createGraph({ ...common, token: longUser, appSecret: cfg.appSecret, secrets: [...secrets, longUser] })
  let page = null
  try {
    const r = await user.get(cfg.pageId, { fields: 'name,access_token' })
    if (r.access_token) page = r
  } catch (e) {
    if (e.kind === 'token') throw e
  }
  if (!page) {
    try {
      await user.paginate('me/accounts', { fields: 'id,name,access_token', limit: 100 }, {
        maxPages: 10,
        onPage: (rows) => {
          page = rows.find((r) => String(r.id) === cfg.pageId && r.access_token) || null
          return !page
        },
      })
    } catch (e) {
      if (e.kind === 'token') throw e
    }
  }
  if (!page) {
    // Wklejono token strony (a nie użytkownika): po wymianie to długi token tej samej strony.
    const info = await debugToken(cfg, fetchImpl, longUser, retryDelayMs).catch(() => ({}))
    if (info.type === 'PAGE' && String(info.profile_id) === cfg.pageId) {
      const r = await user.get(cfg.pageId, { fields: 'name' }).catch(() => ({}))
      page = { name: r.name || cfg.pageId, access_token: longUser }
    }
  }
  if (!page) {
    throw new Error(`token użytkownika nie daje dostępu do strony ${cfg.pageId}; przy generowaniu tokena w Graph API Explorer zaznacz tę stronę`)
  }

  let info = {}
  try {
    info = await debugToken(cfg, fetchImpl, page.access_token, retryDelayMs)
  } catch {}
  await writeConfigValue(cfg.configPath, 'META_PAGE_TOKEN', page.access_token)
  return { pageName: page.name, expiresAt: info.expires_at, dataAccessExpiresAt: info.data_access_expires_at, scopes: info.scopes, type: info.type }
}
