// Testy na sztucznym Graph API (lokalny serwer HTTP): node --test scripts/posty-meta/test/
import assert from 'node:assert/strict'
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { after, before, beforeEach, describe, test } from 'node:test'
import { loadConfig, parseEnv } from '../lib/config.mjs'
import { redact } from '../lib/graph.mjs'
import { plural, rawMessage } from '../lib/mail.mjs'
import { normalizeFbPost } from '../lib/sources.mjs'
import { runOnce } from '../lib/run.mjs'
import { exchangeToken } from '../lib/token.mjs'

const TOKEN = 'EAAPAGETOKEN1234567890abcdef'
const PAGE = '518148711375873'
const NOW = new Date('2026-11-15T12:00:00Z')

let server
let base
let api // stan sztucznego API, zmieniany w testach
const calls = []

function iso(d) {
  return new Date(d).toISOString().replace(/\.\d{3}Z$/, '+0000')
}

function defaultApi() {
  return {
    tokenError: false,
    failMedia: new Set(),
    posts: [
      {
        id: `${PAGE}_1001`,
        message: 'Pierścionek z szafirem, nowy model',
        created_time: iso('2026-11-14T17:00:00Z'),
        permalink_url: `https://www.facebook.com/${PAGE}/posts/1001`,
        attachments: {
          data: [
            {
              media_type: 'album',
              subattachments: {
                data: [
                  { type: 'photo', target: { id: 'ph1' }, media: { image: { src: `${base}/media/ph1-small.jpg` } } },
                  { type: 'photo', target: { id: 'ph2' }, media: { image: { src: `${base}/media/ph2-small.jpg` } } },
                ],
              },
            },
          ],
        },
      },
      {
        id: `${PAGE}_1002`,
        message: 'Rolka z pracowni',
        created_time: iso('2026-11-13T10:00:00Z'),
        permalink_url: `https://www.facebook.com/reel/vid1`,
        attachments: { data: [{ media_type: 'video', target: { id: 'vid1' }, media: { source: `${base}/media/vid1.mp4`, image: { src: `${base}/media/vid1.jpg` } } }] },
      },
      {
        id: `${PAGE}_0900`,
        message: 'Stary post sprzed okna pierwszego uruchomienia',
        created_time: iso('2026-10-01T10:00:00Z'),
        full_picture: `${base}/media/old.jpg`,
      },
    ],
    reels: [
      { id: 'vid1', description: 'Rolka z pracowni', created_time: iso('2026-11-13T10:00:00Z'), permalink_url: '/reel/vid1/', source: `${base}/media/vid1.mp4` },
      { id: 'vid2', description: 'Rolka tylko w video_reels', created_time: iso('2026-11-12T09:00:00Z'), permalink_url: '/reel/vid2/', source: `${base}/media/vid2.mp4` },
    ],
    debug: { is_valid: true, expires_at: 0, data_access_expires_at: Math.floor(NOW.getTime() / 1000) + 80 * 86400, type: 'PAGE' },
  }
}

function pageOf(rows, u) {
  const since = Number(u.searchParams.get('since') || 0)
  const after = Number(u.searchParams.get('after') || 0)
  const limit = 1 // małe strony, żeby sprawdzić paging
  const sorted = rows
    .filter((r) => !since || new Date(r.created_time.replace('+0000', 'Z')) >= new Date(since * 1000))
    .sort((a, b) => b.created_time.localeCompare(a.created_time))
  const chunk = sorted.slice(after, after + limit)
  const next = after + limit < sorted.length ? new URL(u) : null
  if (next) next.searchParams.set('after', String(after + limit))
  return { data: chunk, paging: next ? { next: next.toString() } : {} }
}

before(async () => {
  server = http.createServer((req, res) => {
    const u = new URL(req.url, base)
    calls.push(u.pathname + u.search)
    const json = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    if (u.pathname.startsWith('/media/')) {
      const name = u.pathname.slice(7)
      if (api.failMedia.has(name)) {
        res.writeHead(403, { 'content-type': 'text/plain' })
        return res.end('URL signature expired')
      }
      res.writeHead(200, { 'content-type': name.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg' })
      return res.end(Buffer.from(`PLIK:${name}`))
    }
    if (api.tokenError && u.pathname !== '/v27.0/oauth/access_token') {
      return json(400, { error: { message: 'Error validating access token: Session has expired', type: 'OAuthException', code: 190, error_subcode: 463 } })
    }
    const p = u.pathname.replace(/^\/v27\.0\//, '')
    if (p === `${PAGE}/posts`) return json(200, pageOf(api.posts, u))
    if (p === `${PAGE}/video_reels`) return json(200, pageOf(api.reels, u))
    if (p === 'debug_token') return json(200, { data: api.debug })
    if (p === 'ph1' || p === 'ph2') {
      return json(200, { images: [{ width: 720, source: `${base}/media/${p}-small.jpg` }, { width: 2048, source: `${base}/media/${p}-full.jpg` }] })
    }
    if (p === `${PAGE}_1001`) return json(200, api.posts[0])
    if (p === 'oauth/access_token') return json(200, { access_token: 'LONGUSERTOKEN1234567890', token_type: 'bearer' })
    if (p === PAGE) return json(200, { id: PAGE, name: 'Michał Nowak Pracownia Złotnicza', access_token: 'NEVEREXPIRINGPAGETOKEN1234567890' })
    json(404, { error: { message: `nieznana ścieżka ${p}`, code: 803 } })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

let dir
let cfg
let mails
let now
const quiet = () => {}
const deps = () => ({ now: () => now, log: quiet, print: quiet, transport: async (m) => mails.push(m), retryDelayMs: 1 })

beforeEach(async () => {
  api = defaultApi()
  calls.length = 0
  mails = []
  now = new Date(NOW)
  dir = await mkdtemp(path.join(os.tmpdir(), 'posty-test-'))
  const conf = path.join(dir, 'posty.env')
  await writeFile(
    conf,
    [
      `META_PAGE_TOKEN=${TOKEN}`,
      'META_APP_ID=123',
      'META_APP_SECRET=appsecret123456',
      `GRAPH_BASE_URL=${base}`,
      'DATA_DIR=dane',
      'NOTIFY_TO=marcin@example.com',
      'MAIL_METHOD=smtp',
      'SMTP_HOST=smtp.example.com',
      'SMTP_USER=kontakt@example.com',
      'SMTP_PASS=haslo123456',
      'SMTP_FROM="Formularz <kontakt@example.com>"',
    ].join('\n'),
    { mode: 0o600 },
  )
  const r = loadConfig(conf, { env: {} })
  assert.deepEqual(r.problems, [])
  cfg = r.cfg
})

describe('konfiguracja', () => {
  test('parser .env: komentarze, cudzysłowy, export', () => {
    const e = parseEnv('# k\nA=1\nexport B="x # y"\nC=\'z\'\nD=abc # komentarz\nE="a\\"b"\n')
    assert.deepEqual(e, { A: '1', B: 'x # y', C: 'z', D: 'abc', E: 'a"b' })
  })
  test('złe wartości są zgłaszane po nazwie, bez wartości sekretów', async () => {
    const f = path.join(dir, 'zly.env')
    await writeFile(f, 'SOURCES=posts,tiktok\nINTERVAL_HOURS=abc\nMAIL_METHOD=gołąb\nMETA_PAGE_TOKEN=tajne1234567', { mode: 0o600 })
    const { problems } = loadConfig(f, { env: {} })
    assert.equal(problems.length, 3)
    assert.ok(problems.every((p) => !p.includes('tajne')))
  })
  test('ostrzega o prawach pliku i czyta SMTP z pliku strony', async () => {
    const site = path.join(dir, 'site.env')
    await writeFile(site, 'SMTP_HOST=mail0.mydevil.net\nSMTP_USER=a@b.pl\nSMTP_PASS=x y\nSMTP_FROM=a@b.pl\nDATABASE_URL=nie-czytaj')
    const f = path.join(dir, 'p.env')
    await writeFile(f, `NOTIFY_TO=a@b.pl\nSMTP_ENV_FILE=site.env\n`, { mode: 0o644 })
    const { cfg: c, warnings } = loadConfig(f, { env: {} })
    assert.equal(c.smtp.host, 'mail0.mydevil.net')
    assert.equal(c.smtp.pass, 'x y')
    assert.equal(c.mailFrom, 'Posty pznowak <a@b.pl>')
    assert.ok(warnings.some((w) => w.includes('chmod 600')))
  })
})

describe('pomocnicze', () => {
  test('redact usuwa tokeny z adresów i tekstu', () => {
    const s = redact(`https://graph.facebook.com/x?access_token=${TOKEN}&a=1 oraz ${TOKEN}`, [TOKEN])
    assert.ok(!s.includes(TOKEN))
  })
  test('polska odmiana', () => {
    assert.deepEqual([1, 2, 5, 12, 22, 25].map((n) => plural(n, 'post', 'posty', 'postów')), ['post', 'posty', 'postów', 'postów', 'posty', 'postów'])
  })
  test('mail dla sendmail ma zakodowany temat', () => {
    const m = rawMessage({ from: 'Posty pznowak <a@b.pl>', to: ['x@y.pl'], subject: '2 nowe posty – zażółć', text: 'treść' })
    assert.match(m, /Subject: =\?UTF-8\?B\?/)
    assert.match(m, /To: x@y\.pl/)
  })
  test('post bez załączników bierze full_picture', () => {
    const it = normalizeFbPost({ id: '1_2', created_time: '2026-11-01T10:00:00+0000', full_picture: 'https://x/a.jpg' })
    assert.equal(it.media.length, 1)
    assert.equal(it.createdTime, '2026-11-01T10:00:00.000Z')
  })
})

describe('uruchomienie', () => {
  test('pierwsze uruchomienie: zapisuje posty z ostatnich 7 dni, pliki i jeden mail', async () => {
    const r = await runOnce(cfg, {}, deps())
    assert.equal(r.exitCode, 0)
    assert.equal(r.newItems.length, 3) // 2 posty + rolka vid2 (vid1 to ta sama rolka co post 1002)
    const posty = (await readdir(path.join(cfg.dataDir, 'posty'))).sort()
    assert.deepEqual(posty, [`2026-11-12_rolka_vid2`, `2026-11-13_${PAGE}_1002`, `2026-11-14_${PAGE}_1001`])
    const album = path.join(cfg.dataDir, 'posty', `2026-11-14_${PAGE}_1001`)
    assert.deepEqual((await readdir(album)).sort(), ['01.jpg', '02.jpg', 'post.json', 'tresc.txt'])
    assert.equal(await readFile(path.join(album, '01.jpg'), 'utf8'), 'PLIK:ph1-full.jpg') // pełna rozdzielczość
    const meta = JSON.parse(await readFile(path.join(album, 'post.json'), 'utf8'))
    assert.equal(meta.text, 'Pierścionek z szafirem, nowy model')
    assert.equal(mails.length, 1)
    assert.match(mails[0].subject, /\[Posty pznowak\] 3 nowe posty/)
    assert.match(mails[0].text, /Pierścionek z szafirem/)
    assert.ok(!mails[0].text.includes(TOKEN))
    const state = JSON.parse(await readFile(path.join(cfg.dataDir, 'stan.json'), 'utf8'))
    assert.equal(state.items['fb-reel:vid1'].status, 'duplicate')
    const index = JSON.parse(await readFile(path.join(cfg.dataDir, 'indeks.json'), 'utf8'))
    assert.equal(index.posts.length, 3)
    assert.ok(calls.some((c) => c.includes('after=')), 'paging')
  })

  test('kolejne uruchomienie przed INTERVAL_HOURS jest pomijane; po czasie bez nowości nie ma maila', async () => {
    await runOnce(cfg, {}, deps())
    mails = []
    now = new Date(NOW.getTime() + 3600e3)
    const r1 = await runOnce(cfg, {}, deps())
    assert.equal(r1.skipped, true)
    now = new Date(NOW.getTime() + 6 * 3600e3)
    const r2 = await runOnce(cfg, {}, deps())
    assert.ok(!r2.skipped)
    assert.equal(r2.newItems.length, 0)
    assert.equal(mails.length, 0)
  })

  test('nowy post przy kolejnym sprawdzeniu', async () => {
    await runOnce(cfg, {}, deps())
    mails = []
    api.posts.unshift({ id: `${PAGE}_1003`, message: 'Obrączki', created_time: iso('2026-11-15T15:00:00Z'), full_picture: `${base}/media/obr.jpg` })
    now = new Date(NOW.getTime() + 7 * 3600e3)
    const r = await runOnce(cfg, {}, deps())
    assert.equal(r.newItems.length, 1)
    assert.match(mails[0].subject, /1 nowy post/)
  })

  test('nieudane pobranie: post czeka i dociąga się przy następnym uruchomieniu (bez drugiego maila o nowości)', async () => {
    api.failMedia.add('ph2-full.jpg')
    const r1 = await runOnce(cfg, {}, deps())
    assert.equal(r1.exitCode, 0)
    let state = JSON.parse(await readFile(path.join(cfg.dataDir, 'stan.json'), 'utf8'))
    assert.equal(state.items[`fb:${PAGE}_1001`].status, 'pending')
    assert.match(mails[0].text, /nie wszystkie pliki się pobrały/)
    api.failMedia.clear()
    mails = []
    now = new Date(NOW.getTime() + 6 * 3600e3)
    await runOnce(cfg, {}, deps())
    state = JSON.parse(await readFile(path.join(cfg.dataDir, 'stan.json'), 'utf8'))
    assert.equal(state.items[`fb:${PAGE}_1001`].status, 'ok')
    assert.equal(mails.length, 0)
  })

  test('po MAX_RETRIES nieudanych próbach: status failed i mail o problemie', async () => {
    cfg.maxRetries = 2
    api.failMedia.add('vid2.mp4')
    await runOnce(cfg, {}, deps())
    mails = []
    now = new Date(NOW.getTime() + 6 * 3600e3)
    const r = await runOnce(cfg, {}, deps())
    assert.equal(r.exitCode, 1)
    assert.equal(mails.length, 1)
    assert.match(mails[0].subject, /Problem: pliki/)
  })

  test('wygasły token: mail od razu, potem nie częściej niż ERROR_REPEAT_HOURS, a po naprawie mail „znowu działa”', async () => {
    api.tokenError = true
    const r1 = await runOnce(cfg, {}, deps())
    assert.equal(r1.exitCode, 1)
    assert.equal(mails.length, 1)
    assert.match(mails[0].subject, /token/)
    assert.match(mails[0].text, /README/)
    assert.ok(!mails[0].text.includes(TOKEN))
    now = new Date(NOW.getTime() + 6 * 3600e3)
    await runOnce(cfg, {}, deps())
    assert.equal(mails.length, 1)
    api.tokenError = false
    now = new Date(NOW.getTime() + 12 * 3600e3)
    await runOnce(cfg, {}, deps())
    assert.equal(mails.length, 2)
    assert.match(mails[1].subject, /znowu działa/)
  })

  test('brak sieci zgłaszany dopiero po ERROR_MAIL_AFTER uruchomieniach z rzędu', async () => {
    cfg.graphBase = 'http://127.0.0.1:1' // nic tu nie słucha
    for (let i = 0; i < 3; i++) {
      now = new Date(NOW.getTime() + i * 6 * 3600e3)
      await runOnce(cfg, {}, deps())
      assert.equal(mails.length, i < 2 ? 0 : 1)
    }
    assert.match(mails[0].subject, /brak połączenia/)
  })

  test('token wkrótce wygasa: ostrzeżenie mailem', async () => {
    api.debug = { ...api.debug, data_access_expires_at: Math.floor(NOW.getTime() / 1000) + 3 * 86400 }
    const r = await runOnce(cfg, {}, deps())
    assert.equal(r.exitCode, 0)
    assert.match(mails[0].subject, /nowe posty \+ problem/)
    assert.match(mails[0].text, /dostęp aplikacji do danych wygasa/)
  })

  test('na sucho nic nie zapisuje', async () => {
    const r = await runOnce(cfg, { dryRun: true }, deps())
    assert.equal(r.newItems.length, 3)
    assert.deepEqual(await readdir(cfg.dataDir), [])
    assert.equal(mails.length, 0)
  })

  test('--od dociąga starsze posty', async () => {
    await runOnce(cfg, {}, deps())
    mails = []
    now = new Date(NOW.getTime() + 3600e3)
    const r = await runOnce(cfg, { force: true, since: new Date('2026-09-01T00:00:00Z') }, deps())
    assert.equal(r.newItems.length, 1)
    assert.equal(r.newItems[0].item.id, `${PAGE}_0900`)
  })

  test('blokada: drugi proces w tym samym czasie jest pomijany', async () => {
    const { acquireLock, LockedError } = await import('../lib/store.mjs')
    await runOnce(cfg, { dryRun: true }, deps()) // tworzy katalog
    const release = await acquireLock(cfg.dataDir)
    await assert.rejects(runOnce(cfg, { force: true }, deps()), LockedError)
    await release()
  })
})

describe('wymiana tokena', () => {
  test('zapisuje token strony w pliku konfiguracji z prawami 600', async () => {
    const r = await exchangeToken(cfg, 'SHORTUSERTOKEN1234567890', { retryDelayMs: 1 })
    assert.equal(r.pageName, 'Michał Nowak Pracownia Złotnicza')
    const text = await readFile(cfg.configPath, 'utf8')
    assert.match(text, /^META_PAGE_TOKEN=NEVEREXPIRINGPAGETOKEN1234567890$/m)
    assert.equal(text.match(/META_PAGE_TOKEN=/g).length, 1)
    assert.equal((await stat(cfg.configPath)).mode & 0o777, 0o600)
    const exch = calls.find((c) => c.includes('oauth/access_token'))
    assert.ok(exch.includes('fb_exchange_token=SHORTUSERTOKEN'))
  })
})

after(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
})
