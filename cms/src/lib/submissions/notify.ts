import type { Payload } from 'payload'

import { photosLabel } from '../attachments/rules'
import type { SubmissionAttachmentsState } from '../attachments/store'
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
  /** `quarantine`: przyszło, gdy Cloudflare Turnstile był niedostępny (bez weryfikacji). */
  verification?: 'verified' | 'quarantine' | null
  createdAt: string
  /** Zdjęcia od klienta: w mailu tylko liczba i link do panelu, nigdy same pliki. */
  attachmentsState?: SubmissionAttachmentsState | null
  attachmentsDeclared?: number | null
  attachmentsCount?: number | null
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

const REFUSED_REASON: Partial<Record<SubmissionAttachmentsState, string>> = {
  refused_quarantine: 'weryfikacja Cloudflare była niedostępna',
  refused_limit: 'dzienny limit zdjęć przez stronę został wyczerpany',
  refused_unavailable: 'przyjmowanie zdjęć było chwilowo niedostępne',
}

/** Linie o zdjęciach do maila; pusta lista, gdy klient nic nie dołączał. */
export function attachmentLines(submission: NotifiedSubmission): string[] {
  const state = submission.attachmentsState ?? 'none'
  const declared = submission.attachmentsDeclared ?? 0
  const stored = submission.attachmentsCount ?? 0
  if (state === 'none' || declared === 0) return []
  const refused = REFUSED_REASON[state]
  if (refused)
    return [
      `Załączniki: klient chciał dołączyć ${photosLabel(declared)}, ale ${refused}, więc zgłoszenie przyszło bez nich.`,
      'Klient zobaczył prośbę o przesłanie zdjęć e-mailem.',
    ]
  if (stored === 0)
    return [`Załączniki: klient zapowiedział ${photosLabel(declared)}, ale żadne nie dotarło (szczegóły w panelu).`]
  const files = `${photosLabel(stored)} do obejrzenia w panelu (zdjęć nie dołączamy do maila)`
  return [
    stored < declared
      ? `Załączniki: ${files}; dotarło ${stored} z ${declared}, szczegóły przy zgłoszeniu.`
      : `Załączniki: ${files}.`,
  ]
}

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
  const quarantine = submission.verification === 'quarantine'
  const lines = [
    `Nowe zgłoszenie ${KIND_LABEL[submission.kind]} (nr ${submission.id}), ${warsawTime.format(new Date(submission.createdAt))}.`,
    ...(quarantine
      ? [
          '',
          'UWAGA: KWARANTANNA. Zgłoszenie przyszło, gdy weryfikacja Cloudflare Turnstile była niedostępna,',
          'więc nie wiadomo, czy wysłał je człowiek. Sprawdź, czy to nie spam. Wizualizacja ruszy tylko po ręcznym zatwierdzeniu.',
        ]
      : []),
    '',
    `Imię: ${submission.name}`,
    `Telefon: ${submission.phone}`,
    ...(submission.email ? [`E-mail: ${submission.email}`] : []),
    ...(submission.summary ? ['', submission.summary] : []),
    ...(submission.message ? ['', 'Wiadomość:', submission.message] : []),
    ...(attachmentLines(submission).length ? ['', ...attachmentLines(submission)] : []),
    '',
    `Zgłoszenie w panelu: ${options.adminUrl}`,
    '',
    'Zgłoszenie jest zapisane jako szkic. Do klienta nic nie zostało wysłane automatycznie.',
  ]
  return {
    to: options.to,
    subject: `Nowe zgłoszenie ${KIND_LABEL[submission.kind]} (nr ${submission.id})${quarantine ? ' – kwarantanna' : ''}`,
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
