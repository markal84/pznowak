// Mały klient Graph API (Facebook/Instagram) bez zależności: fetch z Node, ponowienia przy błędach sieci i 5xx,
// appsecret_proof, gdy podano sekret aplikacji. Token nigdy nie trafia do komunikatów błędów (redact).
import { createHmac } from 'node:crypto'

const SECRET_PARAMS = /([?&](?:access_token|appsecret_proof|client_secret|fb_exchange_token|input_token)=)[^&\s"']+/gi

/** Usuwa tokeny i sekrety z tekstu (adresy URL, komunikaty błędów). */
export function redact(text, secrets = []) {
  let out = String(text ?? '').replace(SECRET_PARAMS, '$1***')
  for (const s of secrets) if (s && s.length >= 6) out = out.split(s).join('***')
  return out
}

export class GraphError extends Error {
  constructor(message, { status = 0, code = 0, subcode = 0, type = '', kind = '' } = {}) {
    super(message)
    this.name = 'GraphError'
    this.status = status
    this.code = code
    this.subcode = subcode
    this.type = type
    this.kind = kind || classifyCode(code, status)
  }
}

/** Rodzaj błędu: token | permission | limit | network | other. */
function classifyCode(code, status) {
  if (code === 190 || code === 102 || code === 463 || code === 467) return 'token'
  if (code === 10 || (code >= 200 && code <= 299)) return 'permission'
  if ([4, 17, 32, 613, 80001, 80002, 80004, 80006].includes(code)) return 'limit'
  if (status >= 500) return 'network'
  return 'other'
}

export function classify(err) {
  if (err instanceof GraphError) return err.kind
  if (err?.kind) return err.kind
  return 'other'
}

/** Błędy, przy których mail idzie od razu (bez czekania na kilka nieudanych uruchomień z rzędu). */
export const SEVERE_KINDS = new Set(['token', 'permission', 'config', 'failed-item', 'token-warning', 'backup-warning'])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function createGraph({
  base = 'https://graph.facebook.com',
  version = 'v27.0',
  token,
  appSecret = '',
  timeoutMs = 60_000,
  fetchImpl = globalThis.fetch,
  retryDelayMs = 2000,
  secrets = [],
}) {
  const proof = appSecret && token ? createHmac('sha256', appSecret).update(token).digest('hex') : ''
  const hide = (t) => redact(t, [token, appSecret, ...secrets])

  function url(pathOrUrl, params = {}, { auth = true } = {}) {
    const u = /^https?:\/\//.test(pathOrUrl)
      ? new URL(pathOrUrl)
      : new URL(`${base.replace(/\/+$/, '')}/${version}/${String(pathOrUrl).replace(/^\/+/, '')}`)
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v))
    if (auth && token && !u.searchParams.has('access_token')) u.searchParams.set('access_token', token)
    if (auth && proof && !u.searchParams.has('appsecret_proof')) u.searchParams.set('appsecret_proof', proof)
    return u
  }

  async function request(u) {
    let last
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await sleep(retryDelayMs * attempt)
      let res
      let body = null
      try {
        res = await fetchImpl(u, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json' } })
        const text = await res.text()
        try {
          body = JSON.parse(text)
        } catch {
          body = null
        }
      } catch (e) {
        last = new GraphError(`brak połączenia z Graph API (${hide(e.cause?.code || e.message)})`, { kind: 'network' })
        continue
      }
      if (body?.error) {
        const e = body.error
        const err = new GraphError(hide(`Graph API: ${e.message || 'błąd'} (kod ${e.code ?? '?'}${e.error_subcode ? `/${e.error_subcode}` : ''})`), {
          status: res.status,
          code: Number(e.code) || 0,
          subcode: Number(e.error_subcode) || 0,
          type: e.type || '',
        })
        last = err
        if (res.status >= 500 || (e.is_transient && err.kind !== 'limit')) continue
        throw err
      }
      if (!res.ok || !body) {
        last = new GraphError(`Graph API: HTTP ${res.status}${body ? '' : ' (odpowiedź nie jest JSON-em)'}`, { status: res.status })
        if (res.status >= 500 || res.status === 0) continue
        throw last
      }
      return body
    }
    throw last
  }

  return {
    url,
    hide,
    /** GET ścieżki Graph API, np. get('518…/posts', { fields: '…' }). */
    get: (p, params, opts) => request(url(p, params, opts)),
    /** Strony wyników po kolei (paging.next), najwyżej maxPages; onPage zwraca false, gdy dość. */
    async paginate(p, params, { maxPages = 10, onPage }) {
      let body = await request(url(p, params))
      let pages = 1
      while (true) {
        const more = await onPage(body.data || [])
        if (more === false || !body.paging?.next) return { pages, capped: false }
        if (pages >= maxPages) return { pages, capped: true }
        body = await request(url(body.paging.next))
        pages++
      }
    },
  }
}
