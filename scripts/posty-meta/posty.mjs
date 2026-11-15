#!/usr/bin/env node
// Cykliczne pobieranie postów strony FB pracowni (posty + rolki, opcjonalnie Instagram) przez Graph API.
// Instrukcja: scripts/posty-meta/README.md. Konfiguracja: plik z posty.env.example (domyślnie ~/pznowak-posty/posty.env).
//
//   node posty.mjs                 zwykłe uruchomienie z crona (pomija, jeśli od ostatniego minęło < INTERVAL_HOURS)
//   node posty.mjs --teraz         sprawdź od razu, bez względu na INTERVAL_HOURS
//   node posty.mjs --na-sucho      pokaż, co jest nowego, bez pobierania, zapisu i maili
//   node posty.mjs --od 2026-11-01 jednorazowo dociągnij posty od tej daty
//   node posty.mjs --sprawdz       sprawdź konfigurację, token, uprawnienia i ostatnie posty (nic nie zapisuje)
//   node posty.mjs --test-maila    wyślij próbny mail na NOTIFY_TO
//   node posty.mjs --wymien-token  wymień krótki token z Graph API Explorer na token strony i zapisz w konfiguracji
//   node posty.mjs --ustaw KLUCZ   wpisz do konfiguracji wartość podaną na wejściu, np. ze schowka Maca:
//                                  pbpaste | ssh login@serwer 'node24 …/posty.mjs --ustaw META_APP_SECRET'
//   --config ŚCIEŻKA               inny plik konfiguracji (albo zmienna POSTY_CONFIG)
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline'
import { DEFAULT_CONFIG_PATH, DEFAULTS, SECRET_KEYS, expandHome, loadConfig, runProblems } from './lib/config.mjs'
import { classify, redact } from './lib/graph.mjs'
import { excerpt, formatDateTime, sendMail } from './lib/mail.mjs'
import { debugToken, makeClients, makeLogger, runOnce, tokenFindings } from './lib/run.mjs'
import { discoverIgUserId, listSource } from './lib/sources.mjs'
import { LockedError } from './lib/store.mjs'
import { exchangeToken, writeConfigValue } from './lib/token.mjs'

const USAGE = `Użycie: node posty.mjs [--config PLIK] [--teraz | --na-sucho | --od RRRR-MM-DD | --sprawdz | --test-maila | --wymien-token | --ustaw KLUCZ]`

function parseArgs(argv) {
  const o = { config: process.env.POSTY_CONFIG || DEFAULT_CONFIG_PATH, mode: 'run' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const val = () => {
      const v = argv[++i]
      if (!v) throw new Error(`${a} wymaga wartości`)
      return v
    }
    if (a === '--config' || a === '-c') o.config = val()
    else if (a === '--teraz' || a === '--force') o.force = true
    else if (a === '--na-sucho' || a === '--dry-run') o.dryRun = true
    else if (a === '--od' || a === '--since') {
      const v = val()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(new Date(`${v}T00:00:00Z`).getTime())) throw new Error(`${a}: data w postaci RRRR-MM-DD`)
      o.since = new Date(`${v}T00:00:00Z`)
      o.force = true
    } else if (a === '--sprawdz' || a === '--check') o.mode = 'check'
    else if (a === '--test-maila' || a === '--test-mail') o.mode = 'test-mail'
    else if (a === '--wymien-token' || a === '--exchange-token') o.mode = 'token'
    else if (a === '--ustaw' || a === '--set') {
      o.mode = 'set'
      o.key = val()
    } else if (a === '--pomoc' || a === '--help' || a === '-h') o.mode = 'help'
    else throw new Error(`nieznana opcja ${a}`)
  }
  return o
}

async function readSecret(prompt) {
  if (!process.stdin.isTTY) {
    let data = ''
    for await (const chunk of process.stdin) data += chunk
    return data.trim()
  }
  process.stdout.write(prompt)
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  rl._writeToOutput = () => {} // nie pokazuj wklejanego tokena
  const answer = await new Promise((resolve) => rl.question('', resolve))
  rl.close()
  process.stdout.write('\n')
  return answer.trim()
}

const fmtTs = (ts, tz) => (!ts ? 'nigdy' : formatDateTime(new Date(ts * 1000).toISOString(), tz))

async function check(cfg, log) {
  let bad = 0
  const say = (s) => console.log(s)
  say(`Konfiguracja: ${cfg.configPath}`)
  say(`  strona: ${cfg.pageId}, API ${cfg.apiVersion}, źródła: ${cfg.sources.join(', ')}`)
  say(`  dane: ${cfg.dataDir}`)
  say(`  co ${cfg.intervalHours} h, okno ${cfg.lookbackDays} dni, pierwsze uruchomienie: ${cfg.firstRunDays ? `${cfg.firstRunDays} dni wstecz` : 'cała historia'}`)
  say(`  pobieranie: zdjęcia ${cfg.downloadPhotos ? 'tak' : 'nie'}, filmy ${cfg.downloadVideos ? 'tak' : 'nie'}, limit ${Math.round(cfg.maxFileBytes / 1048576)} MB`)
  say(`  token strony: ${cfg.pageToken ? `ustawiony (${cfg.pageToken.length} znaków)` : 'BRAK'}; sekret aplikacji: ${cfg.appSecret ? 'ustawiony' : 'brak'}`)
  say(`  mail: ${cfg.notifyTo.length ? `${cfg.mailMethod} → ${cfg.notifyTo.join(', ')}` : 'wyłączony (puste NOTIFY_TO)'}`)
  const problems = runProblems(cfg)
  for (const p of problems) {
    say(`  PROBLEM: ${p}`)
    bad++
  }
  if (problems.length) return bad
  const { fb, ig } = makeClients(cfg, globalThis.fetch)
  try {
    const page = await fb.get(cfg.pageId, { fields: 'name' })
    say(`\nStrona: ${page.name} — token działa`)
  } catch (e) {
    say(`\nStrona: BŁĄD (${classify(e)}): ${e.message}`)
    return bad + 1
  }
  try {
    const info = await debugToken(cfg, globalThis.fetch, cfg.pageToken)
    say(`Token: typ ${info.type || '?'}, wygasa: ${fmtTs(info.expires_at, cfg.timezone)}, dostęp do danych do: ${fmtTs(info.data_access_expires_at, cfg.timezone)}`)
    if (info.scopes) say(`  uprawnienia: ${info.scopes.join(', ')}`)
    for (const f of tokenFindings(info, new Date(), cfg.tokenWarnDays, cfg.timezone)) {
      say(`  UWAGA: ${f.message}`)
      if (f.isError) bad++
    }
  } catch (e) {
    say(`Token: nie udało się sprawdzić szczegółów (${e.message}); ustaw META_APP_ID i META_APP_SECRET, żeby to działało`)
  }
  const since = new Date(Date.now() - 60 * 864e5)
  for (const source of cfg.sources) {
    try {
      let igUserId
      if (source === 'instagram') {
        igUserId = cfg.igUserId || (await discoverIgUserId(ig, cfg.pageId))
        say(`\nInstagram: konto ${igUserId || 'NIE ZNALEZIONE (ustaw IG_USER_ID)'}`)
        if (!igUserId) {
          bad++
          continue
        }
      }
      const { items } = await listSource(source, { fb, ig, cfg: { ...cfg, maxPages: 1 }, igUserId }, since)
      say(`\n${source}: ${items.length} z ostatnich 60 dni (pierwsza strona wyników)`)
      for (const it of items.slice(0, 3)) {
        const v = it.media.filter((m) => m.type === 'video').length
        say(`  ${formatDateTime(it.createdTime, cfg.timezone)}  ${it.media.length - v} zdj., ${v} film.  ${excerpt(it.text, 70) || '(bez tekstu)'}`)
        const noUrl = it.media.filter((m) => !m.url).length
        if (noUrl) say(`    uwaga: ${noUrl} plików bez adresu w odpowiedzi (skrypt spróbuje dociągnąć osobno)`)
      }
    } catch (e) {
      say(`\n${source}: BŁĄD (${classify(e)}): ${e.message}`)
      bad++
    }
  }
  say(bad ? `\nWynik: ${bad} problem(y) do poprawienia.` : '\nWynik: wszystko gotowe.')
  return bad
}

async function main() {
  let opts
  try {
    opts = parseArgs(process.argv.slice(2))
  } catch (e) {
    console.error(`${e.message}\n${USAGE}`)
    return 2
  }
  if (opts.mode === 'help') {
    console.log(USAGE)
    return 0
  }
  if (opts.mode === 'set') return setValue(opts)
  const { cfg, problems, warnings } = loadConfig(opts.config)
  const log = makeLogger(cfg.timezone)
  for (const w of warnings) log(`uwaga: ${w}`)
  if (problems.length) {
    for (const p of problems) log(`BŁĄD konfiguracji: ${p}`)
    return 2
  }

  if (opts.mode === 'check') return (await check(cfg, log)) ? 1 : 0

  if (opts.mode === 'test-mail') {
    if (!cfg.notifyTo.length) {
      log('NOTIFY_TO jest puste, nie ma do kogo wysłać')
      return 2
    }
    try {
      await sendMail(cfg, { subject: 'Próbny mail', text: `Próbny mail ze skryptu postów pracowni.\nKonfiguracja: ${cfg.configPath}\nDane: ${cfg.dataDir}` }, { log })
      log(`wysłano próbny mail do ${cfg.notifyTo.join(', ')} (${cfg.mailMethod})`)
      return 0
    } catch (e) {
      log(`BŁĄD wysyłki: ${e.message}`)
      return 1
    }
  }

  if (opts.mode === 'token') {
    const short = await readSecret('Wklej token użytkownika z Graph API Explorer i naciśnij Enter (nie będzie widoczny): ')
    try {
      const r = await exchangeToken(cfg, short)
      console.log(`Zapisano token strony „${r.pageName}” w ${cfg.configPath} (META_PAGE_TOKEN).`)
      console.log(`  typ: ${r.type || '?'}, wygasa: ${fmtTs(r.expiresAt, cfg.timezone)}, dostęp do danych do: ${fmtTs(r.dataAccessExpiresAt, cfg.timezone)}`)
      if (r.scopes) console.log(`  uprawnienia: ${r.scopes.join(', ')}`)
      console.log('Teraz: node posty.mjs --sprawdz')
      return 0
    } catch (e) {
      console.error(`Nie udało się: ${e.message}`)
      return 1
    }
  }

  try {
    const r = await runOnce(cfg, { force: opts.force, dryRun: opts.dryRun, since: opts.since }, { log })
    return r.exitCode
  } catch (e) {
    if (e instanceof LockedError) {
      log(e.message)
      return 0
    }
    const msg = redact(e.stack || e.message, cfg.secrets)
    log(`BŁĄD: ${msg}`)
    await crashMail(cfg, msg, log)
    return 1
  }
}

/** --ustaw KLUCZ: wartość ze standardowego wejścia (np. pbpaste | ssh …) albo wklejona w terminalu. */
async function setValue(opts) {
  const key = String(opts.key).trim().toUpperCase()
  if (!(key in DEFAULTS)) {
    console.error(`nieznany klucz ${key}; dozwolone: ${Object.keys(DEFAULTS).join(', ')}`)
    return 2
  }
  const secret = SECRET_KEYS.includes(key)
  const value = await readSecret(`Wklej wartość ${key} i naciśnij Enter${secret ? ' (nie będzie widoczna)' : ''}: `)
  if (!value || /[\r\n]/.test(value)) {
    console.error('pusta albo wielowierszowa wartość; nic nie zmieniam')
    return 2
  }
  const file = path.resolve(expandHome(opts.config))
  try {
    await writeConfigValue(file, key, value)
  } catch (e) {
    console.error(e.code === 'ENOENT' ? `brak pliku ${file} (najpierw krok 4 instrukcji)` : `nie udało się zapisać: ${e.message}`)
    return 1
  }
  console.log(`Ustawiono ${key} w ${file}: ${secret ? `${value.length} znaków (wartość ukryta)` : value}`)
  return 0
}

/** Nieoczekiwany błąd (np. pełny dysk): mail najwyżej raz na ERROR_REPEAT_HOURS. */
async function crashMail(cfg, msg, log) {
  if (!cfg.notifyErrors || !cfg.notifyTo.length) return
  const mark = path.join(cfg.dataDir, '.ostatni-blad-krytyczny')
  const last = Number(await readFile(mark, 'utf8').catch(() => 0))
  if (Date.now() - last < cfg.errorRepeatHours * 3600e3) return
  try {
    await sendMail(cfg, { subject: 'Skrypt przerwany błędem', text: `Skrypt postów zatrzymał się z błędem:\n\n${msg}\n\nKonfiguracja: ${cfg.configPath}` }, { log })
    await writeFile(mark, String(Date.now())).catch(() => {})
  } catch (e) {
    log(`BŁĄD wysyłki maila: ${redact(e.message, cfg.secrets)}`)
  }
}

process.exitCode = await main()
