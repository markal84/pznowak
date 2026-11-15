// Powiadomienia mailem: SMTP (nodemailer z cms/node_modules, ta sama skrzynka co formularz strony),
// systemowy sendmail albo „none” (treść tylko do logu).
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))

export function plural(n, one, few, many) {
  if (n === 1) return one
  const d = n % 10
  const t = n % 100
  return d >= 2 && d <= 4 && !(t >= 12 && t <= 14) ? few : many
}

export function formatDateTime(iso, timeZone) {
  return new Intl.DateTimeFormat('pl-PL', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  )
}

export function excerpt(text, max = 200) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t
}

function encodeWord(s) {
  return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`
}

function encodeFrom(from) {
  const m = /^(.*?)\s*<([^<>]+)>$/.exec(from.trim())
  if (!m) return from.trim()
  const name = m[1].replace(/^"(.*)"$/, '$1').trim()
  return name ? `${encodeWord(name)} <${m[2]}>` : `<${m[2]}>`
}

/** Wiadomość dla sendmail -t (zwykły tekst, UTF-8). */
export function rawMessage({ from, to, subject, text }) {
  const body = Buffer.from(text.replace(/\r?\n/g, '\r\n'), 'utf8').toString('base64').replace(/.{76}/g, '$&\r\n')
  return [
    `From: ${encodeFrom(from)}`,
    `To: ${to.join(', ')}`,
    `Subject: ${encodeWord(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
    '',
  ].join('\r\n')
}

function loadNodemailer() {
  const tries = [path.join(here, '../../../cms/package.json'), path.join(process.cwd(), 'cms/package.json'), path.join(process.cwd(), 'package.json')]
  for (const p of tries) {
    try {
      return createRequire(p)('nodemailer')
    } catch {}
  }
  throw new Error('nie znalazłem pakietu nodemailer (cms/node_modules); zrób npm ci w katalogu cms albo ustaw MAIL_METHOD=sendmail')
}

/**
 * Wysyła mail. Zwraca { sent: boolean, info }. Przy MAIL_METHOD=none albo pustym NOTIFY_TO tylko loguje treść.
 * deps.transport (testy) zastępuje prawdziwą wysyłkę.
 */
export async function sendMail(cfg, { subject, text }, { log = console.log, transport } = {}) {
  const fullSubject = cfg.subjectPrefix ? `${cfg.subjectPrefix} ${subject}` : subject
  if (!cfg.notifyTo.length || cfg.mailMethod === 'none') {
    log(`mail (nie wysyłam: ${cfg.notifyTo.length ? 'MAIL_METHOD=none' : 'puste NOTIFY_TO'}): ${fullSubject}\n${text}`)
    return { sent: false }
  }
  const msg = { from: cfg.mailFrom, to: cfg.notifyTo, subject: fullSubject, text }
  if (transport) {
    await transport(msg)
    return { sent: true }
  }
  if (cfg.mailMethod === 'smtp') {
    const nodemailer = loadNodemailer()
    const implicitTls = cfg.smtp.port === 465
    const local = ['localhost', '127.0.0.1', '::1'].includes(cfg.smtp.host.toLowerCase())
    const t = nodemailer.createTransport({
      host: cfg.smtp.host,
      port: cfg.smtp.port,
      secure: implicitTls,
      requireTLS: !implicitTls && !local,
      auth: { user: cfg.smtp.user, pass: cfg.smtp.pass },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    })
    await t.sendMail({ ...msg, to: msg.to.join(', ') })
    return { sent: true }
  }
  // sendmail
  await new Promise((resolve, reject) => {
    const child = spawn(cfg.sendmailPath, ['-t', '-i'], { stdio: ['pipe', 'ignore', 'pipe'] })
    let err = ''
    child.stderr.on('data', (d) => (err += d))
    child.on('error', (e) => reject(new Error(`sendmail (${cfg.sendmailPath}): ${e.code || e.message}`)))
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`sendmail zakończył się kodem ${code}: ${err.trim().slice(0, 300)}`))))
    child.stdin.end(rawMessage(msg))
  })
  return { sent: true }
}
