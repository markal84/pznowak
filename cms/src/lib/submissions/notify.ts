import type { Payload } from 'payload'

import { photosLabel } from '../attachments/rules'
import type { SubmissionAttachmentsState } from '../attachments/store'
import { CONTACT_TOPICS, labelOf, type ContactTopicId } from './options'
import type { NotificationStatus } from './statuses'
import { EMAIL } from './validation'

/**
 * Powiadomienie pracowni o nowym zgłoszeniu. Wiadomość idzie wyłącznie na adres pracowni
 * (`SUBMISSIONS_NOTIFY_TO`); do klienta nic nie jest wysyłane automatycznie.
 *
 * Transport to adapter poczty Payloada (`payload.sendEmail`): SMTP skrzynki pracowni ze zmiennych `SMTP_*`
 * (`src/lib/email.ts`). Bez nich Payload używa adaptera „console”, a my pomijamy wysyłkę (status `skipped`),
 * żeby dane klienta nie lądowały w logach. Treść to zwykły tekst (bez HTML), więc dane z formularza nie mogą
 * niczego wstrzyknąć do wiadomości. `Reply-To` = e-mail klienta, jeśli go podał: „Odpowiedz” trafia do klienta.
 */

export type StudioMail = { to: string; subject: string; text: string; replyTo?: string }

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
  /** Temat formularza kontaktowego (rodzaj sprawy w temacie maila). */
  topic?: ContactTopicId | null
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
      await payload.sendEmail({
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
      })
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

/** Rodzaj sprawy do tematu maila: temat formularza kontaktowego albo kreator. */
export function kindOfMatter(submission: Pick<NotifiedSubmission, 'kind' | 'topic'>): string {
  if (submission.kind === 'creator') return 'Kreator pierścionka'
  return submission.topic ? labelOf(CONTACT_TOPICS, submission.topic) : 'Formularz kontaktowy'
}

/**
 * Temat: rodzaj sprawy i imię klienta, np. „Obrączki ślubne – Anna (nr 17)”, żeby pracownia od razu widziała,
 * o co chodzi. Imię jest sprawdzone przez walidację (litery, bez znaków nowej linii), więc nie doda nagłówków;
 * adapter „console” (który loguje temat) nie dostaje tej wiadomości, bo wysyłka jest wtedy pomijana.
 */
export function buildStudioMail(
  submission: NotifiedSubmission,
  options: { to: string; adminUrl: string },
): StudioMail {
  const quarantine = submission.verification === 'quarantine'
  // Adres klienta przeszedł walidację przy zgłoszeniu; tu jeszcze raz ta sama reguła (jeden adres, bez spacji,
  // przecinków i nawiasów), bo trafia do nagłówka wiadomości.
  const replyTo = submission.email && EMAIL.test(submission.email) ? submission.email : undefined
  const lines = [
    `Nowe zgłoszenie ${KIND_LABEL[submission.kind]} (nr ${submission.id}), ${warsawTime.format(new Date(submission.createdAt))}.`,
    ...(quarantine
      ? [
          '',
          'UWAGA: KWARANTANNA. Zgłoszenie przyszło, gdy weryfikacja Cloudflare Turnstile była niedostępna,',
          'więc nie wiadomo, czy wysłał je człowiek. Sprawdź, czy to nie spam.' +
            (submission.kind === 'creator'
              ? ' Wizualizacja ruszy tylko po ręcznym zatwierdzeniu.'
              : ''),
        ]
      : []),
    '',
    `Imię: ${submission.name}`,
    `Telefon: ${submission.phone}`,
    ...(submission.email ? [`E-mail: ${submission.email}`] : []),
    ...(replyTo ? ['(„Odpowiedz” na tę wiadomość trafi do klienta na ten adres.)'] : []),
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
    subject: `${kindOfMatter(submission)} – ${submission.name} (nr ${submission.id})${quarantine ? ' – kwarantanna' : ''}`,
    text: lines.join('\n'),
    ...(replyTo ? { replyTo } : {}),
  }
}

/** Kod błędu nodemailera i kod odpowiedzi SMTP, bez treści komunikatu. */
export function mailErrorCode(error: unknown): string {
  const { code, responseCode } = (error ?? {}) as { code?: unknown; responseCode?: unknown }
  const parts = [
    typeof code === 'string' && /^[A-Z_]{2,30}$/.test(code) ? code : null,
    typeof responseCode === 'number' ? String(responseCode) : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' ') : 'nieznany'
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
  } catch (error) {
    // Sam kod błędu (np. EAUTH, ECONNECTION, 535): komunikat serwera poczty może zawierać adresy.
    log(
      `powiadomienie o zgłoszeniu ${submission.id} nie wyszło (błąd dostawcy poczty: ${mailErrorCode(error)})`,
    )
    return 'failed'
  }
}
