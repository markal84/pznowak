import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import type SMTPConnection from 'nodemailer/lib/smtp-connection'

/**
 * Poczta wychodząca (powiadomienia o zgłoszeniach) przez SMTP skrzynki pracowni. Konfiguracja wyłącznie ze
 * zmiennych środowiskowych, bez kluczy w repo; ten sam kod działa na Vercelu i na MyDevil:
 *
 * - `SMTP_HOST` – serwer poczty wychodzącej (na MyDevil nazwa serwera z panelu, np. `mail0.mydevil.net`:
 *   certyfikat TLS jest wystawiony na tę nazwę, a nie na `mail.pznowak.pl`),
 * - `SMTP_PORT` – `465` (TLS od początku, domyślnie) albo `587` (STARTTLS, wymagany),
 * - `SMTP_USER`, `SMTP_PASS` – login i hasło skrzynki,
 * - `SMTP_FROM` – nadawca, np. `Formularz pznowak.pl <kontakt@pznowak.pl>`; adres musi należeć do skrzynki
 *   z `SMTP_USER` (SPF/DKIM domeny), inaczej poczta trafi do spamu albo serwer ją odrzuci.
 *
 * Bez kompletu zmiennych Payload zostaje przy adapterze „console”, a powiadomienia mają status „pominięte”
 * (nic nie wychodzi i nic nie trafia do logów). Adres odbiorcy powiadomień: `SUBMISSIONS_NOTIFY_TO`
 * (`src/lib/submissions/config.ts`).
 *
 * Hasło i dane klientów idą zawsze szyfrowanym połączeniem: port 465 to TLS, każdy inny port wymaga STARTTLS
 * (`requireTLS`); bez szyfrowania tylko serwer testowy na tym samym komputerze (np. Mailpit na `localhost`).
 */

type Env = Record<string, string | undefined>

export type SmtpSettings = {
  host: string
  port: number
  user: string
  pass: string
  fromAddress: string
  fromName: string
}

/** Nazwa nadawcy, gdy `SMTP_FROM` to sam adres: w skrzynce pracowni od razu widać, skąd przyszła wiadomość. */
export const DEFAULT_FROM_NAME = 'Formularz pznowak.pl'

const REQUIRED = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'] as const
const ADDRESS = /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]{2,}$/
const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1'])

const clean = (value: string | undefined) => value?.trim() || undefined

/** `Nazwa <adres>` albo sam adres; `null`, gdy adres jest niepoprawny. */
export function parseFrom(raw: string): { address: string; name: string } | null {
  const match = /^(.*?)\s*<([^<>]+)>$/.exec(raw.trim())
  const address = (match ? match[2] : raw).trim()
  const name = (match ? match[1] : '')
    .trim()
    .replace(/^"(.*)"$/, '$1')
    .trim()
  if (!ADDRESS.test(address) || /[\r\n]/.test(name)) return null
  return { address, name: name || DEFAULT_FROM_NAME }
}

export type SmtpConfigResult =
  | { status: 'off' }
  | { status: 'incomplete'; problems: string[] }
  | { status: 'ok'; settings: SmtpSettings }

/** Odczyt zmiennych SMTP; w problemach są tylko nazwy zmiennych, nigdy ich wartości. */
export function smtpConfigFromEnv(env: Env = process.env): SmtpConfigResult {
  const present = REQUIRED.filter((name) => clean(env[name]))
  if (present.length === 0 && !clean(env.SMTP_PORT)) return { status: 'off' }
  const problems: string[] = REQUIRED.filter((name) => !clean(env[name])).map(
    (name) => `brak ${name}`,
  )
  const portRaw = clean(env.SMTP_PORT) ?? '465'
  const port = Number(portRaw)
  if (!/^\d{1,5}$/.test(portRaw) || port < 1 || port > 65535) problems.push('niepoprawny SMTP_PORT')
  const from = clean(env.SMTP_FROM) ? parseFrom(env.SMTP_FROM!) : null
  if (clean(env.SMTP_FROM) && !from) problems.push('niepoprawny SMTP_FROM')
  if (problems.length || !from) return { status: 'incomplete', problems }
  return {
    status: 'ok',
    settings: {
      host: clean(env.SMTP_HOST)!,
      port,
      user: clean(env.SMTP_USER)!,
      // Hasło bez przycinania: spacja może być jego częścią.
      pass: env.SMTP_PASS!,
      fromAddress: from.address,
      fromName: from.name,
    },
  }
}

/** Opcje połączenia: zawsze szyfrowane (poza serwerem testowym na tym samym komputerze), krótkie limity czasu. */
export function smtpTransportOptions(settings: SmtpSettings): SMTPConnection.Options {
  const implicitTls = settings.port === 465
  const local = LOOPBACK.has(settings.host.toLowerCase())
  return {
    host: settings.host,
    port: settings.port,
    secure: implicitTls,
    requireTLS: !implicitTls && !local,
    auth: { user: settings.user, pass: settings.pass },
    // Wysyłka idzie po odpowiedzi dla klienta, ale w granicach czasu funkcji (`maxDuration`), więc bez minutowych
    // domyślnych limitów nodemailera.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  }
}

let warned = false

/**
 * Adapter poczty dla `payload.config.ts`: SMTP, gdy komplet zmiennych, a w przeciwnym razie `undefined`
 * (Payload używa wtedy adaptera „console”, a powiadomienia są pomijane). Niekompletna konfiguracja daje jedno
 * ostrzeżenie w logu z nazwami brakujących zmiennych.
 */
export function emailAdapterFromEnv(env: Env = process.env) {
  const config = smtpConfigFromEnv(env)
  if (config.status === 'incomplete') {
    if (!warned) console.warn(`[poczta] SMTP wyłączone: ${config.problems.join(', ')}`)
    warned = true
    return undefined
  }
  if (config.status === 'off') return undefined
  return nodemailerAdapter({
    defaultFromAddress: config.settings.fromAddress,
    defaultFromName: config.settings.fromName,
    transportOptions: smtpTransportOptions(config.settings),
    // Bez połączenia przy każdym starcie serwera; błąd wysyłki trafia do statusu powiadomienia i logu.
    skipVerify: true,
  })
}
