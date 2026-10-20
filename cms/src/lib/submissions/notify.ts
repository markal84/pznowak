import type { Payload } from 'payload'

import type { NotificationStatus } from './statuses'

/**
 * Powiadomienie pracowni o nowym zgłoszeniu. Wiadomość idzie wyłącznie na adres pracowni
 * (`SUBMISSIONS_NOTIFY_TO`); do klienta nic nie jest wysyłane automatycznie.
 *
 * Transport to adapter poczty Payloada (`payload.sendEmail`). Projekt nie ma dziś dostawcy poczty:
 * Payload używa wtedy adaptera „console”, a my pomijamy wysyłkę (status `skipped`), żeby dane klienta
 * nie lądowały w logach. Po dodaniu adaptera (np. SMTP skrzynki pracowni albo Resend) w `payload.config.ts`
 * i ustawieniu `SUBMISSIONS_NOTIFY_TO` powiadomienia zaczną wychodzić bez zmian w tym pliku.
 */

export type StudioMail = { to: string; subject: string; text: string }

export interface MailTransport {
  /** Nazwa adaptera; „console” oznacza brak prawdziwego dostawcy. */
  readonly name: string
  send(mail: StudioMail): Promise<void>
}

export type NotifiedSubmission = {
  id: number
  kind: 'creator' | 'contact'
  name: string
  phone: string
  email?: string | null
  summary?: string | null
  message?: string | null
  createdAt: string
}

export function payloadMailTransport(payload: Payload): MailTransport {
  return {
    name: payload.email?.name ?? 'console',
    send: async (mail) => {
      await payload.sendEmail({ to: mail.to, subject: mail.subject, text: mail.text })
    },
  }
}

const KIND_LABEL = {
  creator: 'z kreatora pierścionka',
  contact: 'z formularza kontaktowego',
} as const

const warsawTime = new Intl.DateTimeFormat('pl-PL', {
  timeZone: 'Europe/Warsaw',
  dateStyle: 'long',
  timeStyle: 'short',
})

/** Temat bez danych osobowych (adapter „console” loguje temat). */
export function buildStudioMail(
  submission: NotifiedSubmission,
  options: { to: string; adminUrl: string },
): StudioMail {
  const lines = [
    `Nowe zgłoszenie ${KIND_LABEL[submission.kind]} (nr ${submission.id}), ${warsawTime.format(new Date(submission.createdAt))}.`,
    '',
    `Imię: ${submission.name}`,
    `Telefon: ${submission.phone}`,
    ...(submission.email ? [`E-mail: ${submission.email}`] : []),
    ...(submission.summary ? ['', submission.summary] : []),
    ...(submission.message ? ['', 'Wiadomość:', submission.message] : []),
    '',
    `Zgłoszenie w panelu: ${options.adminUrl}`,
    '',
    'Zgłoszenie jest zapisane jako szkic. Do klienta nic nie zostało wysłane automatycznie.',
  ]
  return {
    to: options.to,
    subject: `Nowe zgłoszenie ${KIND_LABEL[submission.kind]} (nr ${submission.id})`,
    text: lines.join('\n'),
  }
}

export async function notifyStudio(
  submission: NotifiedSubmission,
  options: {
    transport: MailTransport | null
    to: string | undefined
    adminUrl: string
    log?: (message: string) => void
  },
): Promise<NotificationStatus> {
  const log = options.log ?? ((message: string) => console.warn(`[zgloszenia] ${message}`))
  if (!options.to) {
    log(`powiadomienie o zgłoszeniu ${submission.id} pominięte: brak SUBMISSIONS_NOTIFY_TO`)
    return 'skipped'
  }
  if (!options.transport || options.transport.name === 'console') {
    log(`powiadomienie o zgłoszeniu ${submission.id} pominięte: brak dostawcy poczty`)
    return 'skipped'
  }
  try {
    await options.transport.send(
      buildStudioMail(submission, { to: options.to, adminUrl: options.adminUrl }),
    )
    return 'sent'
  } catch {
    log(`powiadomienie o zgłoszeniu ${submission.id} nie wyszło (błąd dostawcy poczty)`)
    return 'failed'
  }
}
