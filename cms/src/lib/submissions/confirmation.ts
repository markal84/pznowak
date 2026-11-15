import { SITE } from '../site'
import { mailErrorCode, type MailTransport, type StudioMail } from './notify'
import {
  MAIL_COLORS,
  MAIL_SANS,
  MAIL_SERIF,
  clientConfirmationEnabled,
  escapeHtml,
  parseSummaryRows,
} from './mail-html'
import { NEXT_STEPS, effectiveMeeting } from './next-steps'
import {
  CONTACT_PREFERENCES,
  MEETING_MODES,
  type ContactPreferenceId,
  type ContactTopicId,
  type MeetingModeId,
} from './options'
import { EMAIL } from './validation'

/**
 * Potwierdzenie dla klienta po wysłaniu formularza kontaktowego (Marcin 15.11: klient bez maila „odbija się”).
 *
 * - Tylko formularz kontaktowy i tylko, gdy klient podał e-mail; nie w kwarantannie (Turnstile niedostępny),
 *   żeby strony nie dało się użyć do wysyłania maili na cudze adresy bez weryfikacji.
 * - W treści **nie ma** wolnego tekstu wiadomości klienta: tylko imię i wiersze podsumowania (wybory z listy
 *   i krótkie pola bez linków – walidacja), więc mail nie nadaje się do rozsyłania spamu przez formularz.
 * - Każda wartość w HTML jest escapowana; układ tabelkowy z kolorami strony (globals.css), czcionki z zapasem
 *   Georgia / Arial, bo programy pocztowe nie wczytują fontów strony.
 * - Wyłącznik bez przebudowy: `SUBMISSIONS_CLIENT_CONFIRMATION=0` (domyślnie włączone; bez SMTP i tak pomijane).
 */

export type ConfirmedSubmission = {
  id: number
  kind: 'creator' | 'contact'
  name: string
  email?: string | null
  /** Wiersze „Klucz: wartość” – to samo podsumowanie, które dostaje pracownia. */
  summary?: string | null
  topic?: ContactTopicId | null
  verification?: 'verified' | 'quarantine' | null
  details?: unknown
}

export type ConfirmationStatus = 'sent' | 'skipped' | 'failed'

export const CONFIRMATION_FROM_NAME = `${SITE.name} · ${SITE.tagline}`

const COLORS = MAIL_COLORS
const SERIF = MAIL_SERIF
const SANS = MAIL_SANS

export { clientConfirmationEnabled, escapeHtml }

/** Wiersze tylko dla pracowni, pomijane w potwierdzeniu dla klienta. */
const STUDIO_ONLY_ROWS = new Set(['Skąd o nas wie'])

/** Wiersze podsumowania z tekstu „Klucz: wartość” (podział na pierwszym „: ”). */
export function summaryRows(summary: string | null | undefined): [string, string][] {
  return parseSummaryRows(summary).filter(([key]) => !STUDIO_ONLY_ROWS.has(key))
}

const FIRST_STEP: Record<ContactPreferenceId, string> = {
  telefon: 'Oddzwaniamy i ustalamy termin rozmowy.',
  sms: 'Piszemy SMS-em i ustalamy termin rozmowy.',
  email: 'Odpisujemy e-mailem i ustalamy termin rozmowy.',
}

type Plan = { meeting: MeetingModeId; preference: ContactPreferenceId }

function planOf(submission: ConfirmedSubmission): Plan {
  const details = (submission.details ?? {}) as { meeting?: unknown; contactPreference?: unknown }
  const meeting = MEETING_MODES.some((m) => m.id === details.meeting)
    ? (details.meeting as MeetingModeId)
    : MEETING_MODES[0].id
  const preference = CONTACT_PREFERENCES.some((p) => p.id === details.contactPreference)
    ? (details.contactPreference as ContactPreferenceId)
    : 'telefon'
  return {
    meeting: submission.topic ? effectiveMeeting(submission.topic, meeting) : meeting,
    preference,
  }
}

/** Kroki „Co dalej” jak na stronie kontaktu; pierwszy dopasowany do wybranej formy kontaktu. */
export function confirmationSteps(submission: ConfirmedSubmission): string[] {
  const plan = planOf(submission)
  const [, ...rest] = NEXT_STEPS[plan.meeting]
  return [FIRST_STEP[plan.preference], ...rest]
}

function replyLead(submission: ConfirmedSubmission): string {
  const preference = CONTACT_PREFERENCES.find((p) => p.id === planOf(submission).preference)
  return `Odezwiemy się ${preference?.sent ?? 'telefonicznie'} – zwykle tego samego dnia roboczego.`
}

const hoursText = () => SITE.hours.map((h) => `${h.days} ${h.time}`).join(' · ')

/** Czy ten klient dostaje potwierdzenie (adres podany, poprawny; formularz kontaktowy; bez kwarantanny). */
export function confirmationRecipient(submission: ConfirmedSubmission): string | null {
  if (submission.kind !== 'contact' || submission.verification === 'quarantine') return null
  const email = submission.email?.trim()
  return email && EMAIL.test(email) ? email : null
}

export function buildClientConfirmation(
  submission: ConfirmedSubmission,
  options: { to: string; origin: string },
): StudioMail {
  const firstName = submission.name.trim().split(/\s+/)[0] || submission.name.trim()
  const rows = summaryRows(submission.summary)
  const steps = confirmationSteps(submission)
  const lead = replyLead(submission)
  const origin = options.origin.replace(/\/+$/, '')
  const withMap = planOf(submission).meeting === 'pracownia'
  const subject = `Dziękujemy za wiadomość – ${SITE.tagline} ${SITE.name} (nr ${submission.id})`

  const text = [
    `Dzień dobry ${firstName},`,
    '',
    `dziękujemy – Twoja wiadomość dotarła do pracowni. ${lead}`,
    '',
    `Podsumowanie zgłoszenia nr ${submission.id}:`,
    ...rows.map(([k, v]) => `– ${k}: ${v}`),
    '',
    'Co dalej:',
    ...steps.map((step, i) => `${i + 1}. ${step}`),
    '',
    'Chcesz coś dodać albo przesłać zdjęcia? Po prostu odpowiedz na tę wiadomość.',
    '',
    `${SITE.tagline} ${SITE.name}, od ${SITE.since}`,
    `${SITE.street}, ${SITE.city}`,
    `${SITE.phone} · ${SITE.email}`,
    hoursText(),
    origin,
    '',
    'Ten adres został podany w formularzu na stronie pznowak.pl. Jeśli to nie Ty, zignoruj tę wiadomość.',
  ].join('\n')

  const e = escapeHtml
  const rowHtml = rows
    .map(
      ([k, v], i) => `<tr>
<td style="padding:10px 0;${i ? `border-top:1px solid ${COLORS.lineSoft};` : ''}font-family:${SANS};font-size:13px;line-height:1.4;color:${COLORS.muted};width:38%;vertical-align:top;">${e(k)}</td>
<td style="padding:10px 0;${i ? `border-top:1px solid ${COLORS.lineSoft};` : ''}font-family:${SANS};font-size:15px;line-height:1.45;color:${COLORS.graphite};vertical-align:top;">${e(v)}</td>
</tr>`,
    )
    .join('\n')
  const stepHtml = steps
    .map(
      (step, i) => `<tr>
<td style="width:34px;padding:0 0 12px;vertical-align:top;font-family:${SERIF};font-size:20px;line-height:1.2;color:${COLORS.patina};">${i + 1}.</td>
<td style="padding:2px 0 12px;vertical-align:top;font-family:${SANS};font-size:15px;line-height:1.55;color:${COLORS.graphite2};">${e(step)}</td>
</tr>`,
    )
    .join('\n')
  const mapButton = withMap
    ? `<tr><td style="padding:8px 40px 4px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:${COLORS.velvet};border-radius:999px;">
<a href="${e(`${origin}/kontakt#dojazd`)}" style="display:inline-block;padding:13px 24px;font-family:${SANS};font-size:14px;font-weight:600;color:${COLORS.onVelvet};text-decoration:none;">Jak dojechać do pracowni</a>
</td></tr></table>
</td></tr>`
    : ''

  const html = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${e(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.silver};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Twoja wiadomość dotarła do pracowni. ${e(lead)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.silver};">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${COLORS.paper};border-radius:6px;overflow:hidden;">
<tr><td style="padding:32px 40px 20px;border-bottom:1px solid ${COLORS.gold};">
<a href="${e(origin)}" style="text-decoration:none;"><img src="${e(`${origin}/logo.png`)}" width="118" height="62" alt="${e(`${SITE.name} – ${SITE.tagline}`)}" style="display:block;border:0;width:118px;height:62px;font-family:${SERIF};font-size:18px;color:${COLORS.graphite};"></a>
<p style="margin:14px 0 0;font-family:${SANS};font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.muted};">${e(SITE.tagline)} · Busko-Zdrój, od ${SITE.since}</p>
</td></tr>
<tr><td style="padding:32px 40px 8px;">
<h1 style="margin:0 0 14px;font-family:${SERIF};font-weight:400;font-size:32px;line-height:1.15;color:${COLORS.graphite};">Dziękujemy, ${e(firstName)}.</h1>
<p style="margin:0;font-family:${SANS};font-size:16px;line-height:1.6;color:${COLORS.graphite2};">Twoja wiadomość dotarła do pracowni. ${e(lead)}</p>
</td></tr>
<tr><td style="padding:24px 40px 8px;">
<h2 style="margin:0 0 6px;font-family:${SERIF};font-weight:400;font-size:22px;line-height:1.2;color:${COLORS.graphite};">Podsumowanie zgłoszenia</h2>
<p style="margin:0 0 8px;font-family:${SANS};font-size:13px;color:${COLORS.muted};">Numer ${submission.id}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${rowHtml}
</table>
</td></tr>
<tr><td style="padding:24px 40px 4px;">
<h2 style="margin:0 0 14px;font-family:${SERIF};font-weight:400;font-size:22px;line-height:1.2;color:${COLORS.graphite};">Co dalej</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${stepHtml}
</table>
</td></tr>
${mapButton}
<tr><td style="padding:20px 40px 32px;">
<p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.6;color:${COLORS.graphite2};">Chcesz coś dodać albo przesłać zdjęcia? Po prostu odpowiedz na tę wiadomość.</p>
</td></tr>
<tr><td style="background:${COLORS.velvet};padding:26px 40px;">
<p style="margin:0 0 6px;font-family:${SERIF};font-size:20px;line-height:1.2;color:${COLORS.onVelvet};">${e(SITE.tagline)} ${e(SITE.name)}</p>
<p style="margin:0;font-family:${SANS};font-size:14px;line-height:1.7;color:${COLORS.onVelvet2};">${e(SITE.street)}, ${e(SITE.city)}<br>
<a href="${e(SITE.phoneHref)}" style="color:${COLORS.onVelvet};text-decoration:none;">${e(SITE.phone)}</a> · <a href="mailto:${e(SITE.email)}" style="color:${COLORS.onVelvet};text-decoration:none;">${e(SITE.email)}</a><br>
${e(hoursText())}</p>
</td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;font-family:${SANS};font-size:12px;line-height:1.5;color:${COLORS.muted};">Ten adres został podany w formularzu na stronie pznowak.pl. Jeśli to nie Ty, zignoruj tę wiadomość.</p>
</td></tr>
</table>
</body>
</html>`

  return {
    to: options.to,
    subject,
    text,
    html,
    replyTo: SITE.email,
    fromName: CONFIRMATION_FROM_NAME,
  }
}

export async function confirmToClient(
  submission: ConfirmedSubmission,
  options: {
    transport: MailTransport | null
    origin: string
    enabled?: boolean
    log?: (message: string) => void
  },
): Promise<ConfirmationStatus> {
  const log = options.log ?? ((message: string) => console.warn(`[zgloszenia] ${message}`))
  const to = confirmationRecipient(submission)
  if (!to || options.enabled === false) return 'skipped'
  if (!options.transport || options.transport.name === 'console') return 'skipped'
  try {
    await options.transport.send(
      buildClientConfirmation(submission, { to, origin: options.origin }),
    )
    return 'sent'
  } catch (error) {
    log(
      `potwierdzenie dla klienta (zgłoszenie ${submission.id}) nie wyszło (błąd dostawcy poczty: ${mailErrorCode(error)})`,
    )
    return 'failed'
  }
}
