import type { Payload } from 'payload'

import { photosLabel } from '../attachments/rules'
import type { SubmissionAttachmentsState } from '../attachments/store'
import {
  MAIL_COLORS as C,
  MAIL_SANS,
  clientConfirmationEnabled,
  escapeHtml as e,
  parseSummaryRows,
  telHref,
} from './mail-html'
import { CONTACT_TOPICS, labelOf, type ContactTopicId } from './options'
import type { NotificationStatus } from './statuses'
import { EMAIL } from './validation'

/**
 * Powiadomienie pracowni o nowym zgłoszeniu. Wiadomość idzie wyłącznie na adres pracowni
 * (`SUBMISSIONS_NOTIFY_TO`); potwierdzenie dla klienta to osobny mail (`confirmation.ts`).
 *
 * Transport to adapter poczty Payloada (`payload.sendEmail`): SMTP skrzynki pracowni ze zmiennych `SMTP_*`
 * (`src/lib/email.ts`). Bez nich Payload używa adaptera „console”, a my pomijamy wysyłkę (status `skipped`),
 * żeby dane klienta nie lądowały w logach. Wersja tekstowa plus prosta wersja HTML do szybkiego czytania
 * (każda wartość z formularza escapowana, więc nie może niczego wstrzyknąć). `Reply-To` = e-mail klienta, jeśli go
 * podał: „Odpowiedz” trafia do klienta.
 */

export type StudioMail = {
  to: string
  subject: string
  text: string
  replyTo?: string
  /** Wersja HTML (tylko potwierdzenie dla klienta, `confirmation.ts`); powiadomienie pracowni to sam tekst. */
  html?: string
  /** Nazwa nadawcy zamiast domyślnej z `SMTP_FROM`; adres zostaje ten sam (skrzynka z `SMTP_USER`). */
  fromName?: string
}

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
      const address = payload.email?.defaultFromAddress
      await payload.sendEmail({
        to: mail.to,
        subject: mail.subject,
        text: mail.text,
        ...(mail.html ? { html: mail.html } : {}),
        ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
        ...(mail.fromName && address ? { from: { name: mail.fromName, address } } : {}),
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
    return [
      `Załączniki: klient zapowiedział ${photosLabel(declared)}, ale żadne nie dotarło (szczegóły w panelu).`,
    ]
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
    `Zgłoszenie jest zapisane jako szkic. ${clientNote(submission, replyTo)}`,
  ]
  return {
    to: options.to,
    subject: `${kindOfMatter(submission)} – ${submission.name} (nr ${submission.id})${quarantine ? ' – kwarantanna' : ''}`,
    text: lines.join('\n'),
    html: buildStudioHtml(submission, { adminUrl: options.adminUrl, replyTo }),
    ...(replyTo ? { replyTo } : {}),
  }
}

/** Czy klient dostał automatyczne potwierdzenie (te same warunki co `confirmationRecipient`). */
function clientNote(submission: NotifiedSubmission, replyTo: string | undefined): string {
  const confirmed =
    submission.kind === 'contact' &&
    Boolean(replyTo) &&
    submission.verification !== 'quarantine' &&
    clientConfirmationEnabled()
  return confirmed
    ? 'Klient dostał automatyczne potwierdzenie e-mailem (podsumowanie, bez treści wiadomości).'
    : 'Do klienta nic nie zostało wysłane automatycznie.'
}

/** Wiersze pokazane wyżej w nagłówku maila – w tabeli podsumowania ich nie powtarzamy. */
const HEADLINE_ROWS = new Set(['Temat', 'Preferowany kontakt'])

/**
 * Wersja HTML powiadomienia: najważniejsze na górze (rodzaj sprawy, imię, telefon, e-mail, forma kontaktu,
 * przycisk do panelu), niżej szczegóły, wiadomość i zdjęcia. Bez ozdobników – ma się czytać w 5 sekund.
 */
export function buildStudioHtml(
  submission: NotifiedSubmission,
  options: { adminUrl: string; replyTo?: string },
): string {
  const quarantine = submission.verification === 'quarantine'
  const rows = parseSummaryRows(submission.summary)
  const preference = rows.find(([key]) => key === 'Preferowany kontakt')?.[1]
  const details = rows.filter(([key]) => !HEADLINE_ROWS.has(key))
  const photos = attachmentLines(submission)
  const when = warsawTime.format(new Date(submission.createdAt))
  const font = `font-family:${MAIL_SANS};`
  const cell = (k: string, v: string, first: boolean) => `<tr>
<td style="${font}padding:7px 12px 7px 0;${first ? '' : `border-top:1px solid ${C.lineSoft};`}font-size:13px;color:${C.muted};width:34%;vertical-align:top;">${e(k)}</td>
<td style="${font}padding:7px 0;${first ? '' : `border-top:1px solid ${C.lineSoft};`}font-size:15px;color:${C.graphite};vertical-align:top;">${e(v)}</td>
</tr>`
  const section = (title: string, body: string) => `<tr><td style="padding:18px 24px 0;">
<p style="${font}margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${C.muted};">${title}</p>
${body}
</td></tr>`

  return `<!doctype html>
<html lang="pl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:${C.silver};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.silver};">
<tr><td align="center" style="padding:16px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;background:${C.paper};border-radius:6px;overflow:hidden;">
${
  quarantine
    ? `<tr><td style="${font}background:${C.errorBg};color:${C.error};padding:12px 24px;font-size:15px;font-weight:700;border-bottom:2px solid ${C.error};">KWARANTANNA – weryfikacja Cloudflare była niedostępna. Sprawdź, czy to nie spam.</td></tr>`
    : ''
}
<tr><td style="background:${C.velvet};padding:14px 24px;">
<p style="${font}margin:0;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${C.onVelvet2};">Nowe zgłoszenie nr ${submission.id} · ${e(when)}</p>
<p style="${font}margin:4px 0 0;font-size:20px;font-weight:700;color:${C.onVelvet};">${e(kindOfMatter(submission))}</p>
</td></tr>
<tr><td style="padding:18px 24px 0;">
<p style="${font}margin:0 0 6px;font-size:22px;font-weight:700;color:${C.graphite};">${e(submission.name)}</p>
<p style="${font}margin:0;font-size:20px;line-height:1.5;"><a href="${e(telHref(submission.phone))}" style="color:${C.velvet};font-weight:700;text-decoration:none;">${e(submission.phone)}</a></p>
${
  submission.email
    ? `<p style="${font}margin:0;font-size:16px;line-height:1.5;"><a href="mailto:${e(submission.email)}" style="color:${C.velvet};">${e(submission.email)}</a></p>`
    : ''
}
${
  preference
    ? `<p style="margin:10px 0 0;"><span style="${font}display:inline-block;background:${C.goldBg};border:1px solid ${C.gold};border-radius:999px;padding:4px 12px;font-size:14px;font-weight:700;color:${C.patina};">Kontakt: ${e(preference)}</span></p>`
    : ''
}
</td></tr>
<tr><td style="padding:16px 24px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${C.velvet};border-radius:999px;">
<a href="${e(options.adminUrl)}" style="${font}display:inline-block;padding:10px 20px;font-size:14px;font-weight:700;color:${C.onVelvet};text-decoration:none;">Otwórz w panelu</a>
</td></tr></table>
</td></tr>
${
  photos.length
    ? `<tr><td style="padding:18px 24px 0;"><p style="${font}margin:0;background:${C.goldBg};border-left:4px solid ${C.gold};padding:10px 12px;font-size:14px;line-height:1.5;color:${C.graphite};">${photos.map(e).join('<br>')}</p></td></tr>`
    : ''
}
${
  details.length
    ? section(
        'Szczegóły',
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${details.map(([k, v], i) => cell(k, v, i === 0)).join('')}</table>`,
      )
    : ''
}
${
  submission.message
    ? section(
        'Wiadomość',
        `<p style="${font}margin:0;white-space:pre-wrap;border-left:4px solid ${C.lineSoft};padding:4px 0 4px 12px;font-size:15px;line-height:1.55;color:${C.graphite};">${e(submission.message)}</p>`,
      )
    : ''
}
<tr><td style="${font}padding:20px 24px 20px;font-size:12px;line-height:1.5;color:${C.muted};">
Zgłoszenie zapisane jako szkic. ${e(clientNote(submission, options.replyTo))}${options.replyTo ? ' „Odpowiedz” na tę wiadomość trafi do klienta.' : ' Klient nie podał e-maila.'}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
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
