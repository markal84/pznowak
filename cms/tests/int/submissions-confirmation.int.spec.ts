import { describe, expect, it, vi } from 'vitest'

import {
  buildClientConfirmation,
  clientConfirmationEnabled,
  confirmToClient,
  confirmationSteps,
  escapeHtml,
  greetingName,
  summaryRows,
  type ConfirmedSubmission,
} from '@/lib/submissions/confirmation'
import { NEXT_STEPS } from '@/lib/submissions/next-steps'
import type { MailTransport, StudioMail } from '@/lib/submissions/notify'

const submission: ConfirmedSubmission = {
  id: 320,
  kind: 'contact',
  name: 'Anna Maria',
  email: 'anna@example.pl',
  topic: 'obraczki',
  verification: 'verified',
  summary:
    'Temat: Obrączki ślubne\nRozmowa: W pracowni w Busku-Zdroju\nPreferowany kontakt: E-mail\nData ślubu: 14.06.2027',
  details: { meeting: 'pracownia', contactPreference: 'email' },
}

function fakeTransport(name = 'smtp'): MailTransport & { sent: StudioMail[] } {
  const sent: StudioMail[] = []
  return { name, sent, send: vi.fn(async (mail: StudioMail) => void sent.push(mail)) }
}

const origin = 'https://pznowak.pl'

describe('potwierdzenie dla klienta', () => {
  it('wysyła jedną wiadomość na adres klienta; odpowiedź trafia do pracowni', async () => {
    const transport = fakeTransport()
    expect(await confirmToClient(submission, { transport, origin })).toBe('sent')
    expect(transport.sent).toHaveLength(1)
    const [mail] = transport.sent
    expect(mail.to).toBe('anna@example.pl')
    expect(mail.replyTo).toBe('kontakt@pznowak.pl')
    expect(mail.fromName).toBe('Michał Nowak · Pracownia złotnicza')
    expect(mail.subject).toBe('Dziękujemy za wiadomość – Pracownia złotnicza Michał Nowak (nr 320)')
  })

  it('pomija: bez e-maila, kreator, kwarantanna, wyłącznik, brak SMTP', async () => {
    const transport = fakeTransport()
    const skip = (
      s: Partial<ConfirmedSubmission>,
      extra: { enabled?: boolean; t?: MailTransport } = {},
    ) =>
      confirmToClient(
        { ...submission, ...s },
        { transport: extra.t ?? transport, origin, enabled: extra.enabled },
      )
    expect(await skip({ email: null })).toBe('skipped')
    expect(await skip({ email: 'nie-adres' })).toBe('skipped')
    expect(await skip({ kind: 'creator' })).toBe('skipped')
    expect(await skip({ verification: 'quarantine' })).toBe('skipped')
    expect(await skip({}, { enabled: false })).toBe('skipped')
    expect(await skip({}, { t: fakeTransport('console') })).toBe('skipped')
    expect(transport.sent).toHaveLength(0)
  })

  it('błąd poczty: status failed i w logu sam kod błędu, bez adresu', async () => {
    const log = vi.fn()
    const transport: MailTransport = {
      name: 'smtp',
      send: async () => {
        throw Object.assign(new Error('550 anna@example.pl rejected'), {
          code: 'EENVELOPE',
          responseCode: 550,
        })
      },
    }
    expect(await confirmToClient(submission, { transport, origin, log })).toBe('failed')
    expect(log.mock.calls[0][0]).toContain('EENVELOPE 550')
    expect(log.mock.calls[0][0]).not.toContain('anna@')
  })

  it('treść: imię, podsumowanie i kroki „Co dalej” z pierwszym krokiem wg formy kontaktu', () => {
    const mail = buildClientConfirmation(submission, { to: 'anna@example.pl', origin })
    expect(mail.text).toContain('Dzień dobry Anna,')
    expect(mail.text).toContain('Odezwiemy się e-mailem')
    expect(mail.text).toContain('– Data ślubu: 14.06.2027')
    expect(mail.text).toContain('1. Odpisujemy e-mailem i ustalamy termin rozmowy.')
    expect(mail.text).toContain('2. W pracowni oglądasz kamienie i projekty.')
    expect(mail.html).toContain('Dziękujemy, Anna.')
    expect(mail.html).toContain('https://pznowak.pl/logo.png')
    expect(mail.html).toContain('Jak dojechać do pracowni')
  })

  it('rozmowa zdalna: kroki zdalne, bez przycisku dojazdu; naprawa zawsze w pracowni', () => {
    const remote = {
      ...submission,
      topic: 'nowy' as const,
      details: { meeting: 'zdalnie', contactPreference: 'sms' },
    }
    expect(confirmationSteps(remote)).toEqual([
      'Piszemy SMS-em i ustalamy termin rozmowy.',
      ...NEXT_STEPS.zdalnie.slice(1),
    ])
    expect(buildClientConfirmation(remote, { to: 'a@b.pl', origin }).html).not.toContain(
      'Jak dojechać',
    )
    const repair = { ...remote, topic: 'naprawa' as const }
    expect(confirmationSteps(repair).slice(1)).toEqual(NEXT_STEPS.pracownia.slice(1))
  })

  it('nie zawiera treści wiadomości klienta i escapuje wartości w HTML', () => {
    const mail = buildClientConfirmation(
      {
        ...submission,
        name: 'Ola',
        summary: 'Temat: Inne pytanie\nOkazja: <b>urodziny</b> & "test"',
      },
      { to: 'ola@example.pl', origin },
    )
    expect(mail.html).toContain('&lt;b&gt;urodziny&lt;/b&gt; &amp; &quot;test&quot;')
    expect(mail.html).not.toContain('<b>urodziny')
    expect(Object.keys(submission)).not.toContain('message')
  })

  it('„Skąd o nas wie” zostaje tylko dla pracowni', () => {
    expect(summaryRows('Temat: Inne pytanie\nSkąd o nas wie: Google')).toEqual([
      ['Temat', 'Inne pytanie'],
    ])
  })

  it('powitanie: pierwsze imię z wielkiej litery', () => {
    expect(greetingName('marcinnn')).toBe('Marcinnn')
    expect(greetingName('  łucja maria ')).toBe('Łucja')
    expect(greetingName('McKenzie')).toBe('McKenzie')
    const mail = buildClientConfirmation(
      { ...submission, name: 'ola' },
      { to: 'o@example.pl', origin },
    )
    expect(mail.text).toContain('Dzień dobry Ola,')
    expect(mail.html).toContain('Dziękujemy, Ola.')
  })

  it('pomocnicze: wiersze podsumowania, escapowanie, wyłącznik', () => {
    expect(summaryRows('A: 1\nbez dwukropka\nB: x: y\n')).toEqual([
      ['A', '1'],
      ['B', 'x: y'],
    ])
    expect(escapeHtml(`<'&">`)).toBe('&lt;&#39;&amp;&quot;&gt;')
    expect(clientConfirmationEnabled({})).toBe(true)
    expect(clientConfirmationEnabled({ SUBMISSIONS_CLIENT_CONFIRMATION: '0' })).toBe(false)
    expect(clientConfirmationEnabled({ SUBMISSIONS_CLIENT_CONFIRMATION: 'false' })).toBe(false)
  })
})
