import { describe, expect, it, vi } from 'vitest'

import {
  buildStudioMail,
  mailErrorCode,
  notifyStudio,
  payloadMailTransport,
  type MailTransport,
  type NotifiedSubmission,
} from '@/lib/submissions/notify'
import type { Payload } from 'payload'

const submission: NotifiedSubmission = {
  id: 17,
  kind: 'creator',
  name: 'Anna',
  phone: '+48 501 321 347',
  email: 'anna@example.pl',
  summary: 'Okazja: Rocznica\nKamień: Szmaragd',
  message: 'Rozmiar do sprawdzenia.',
  createdAt: '2026-10-20T17:20:00.000Z',
}

/** Atrapa dostawcy poczty: zapamiętuje wysłane wiadomości. */
function fakeTransport(
  name = 'smtp',
): MailTransport & { sent: Array<{ to: string; subject: string; text: string }> } {
  const sent: Array<{ to: string; subject: string; text: string }> = []
  return { name, sent, send: vi.fn(async (mail) => void sent.push(mail)) }
}

describe('powiadomienie pracowni', () => {
  it('wysyła jedną wiadomość wyłącznie na adres pracowni, nie do klienta', async () => {
    const transport = fakeTransport()
    const status = await notifyStudio(submission, {
      transport,
      to: 'pracownia@example.pl',
      adminUrl: 'https://pznowak.pl/admin/collections/submissions/17',
      log: () => undefined,
    })
    expect(status).toBe('sent')
    expect(transport.sent).toHaveLength(1)
    expect(transport.sent.map((m) => m.to)).toEqual(['pracownia@example.pl'])
    expect(transport.sent.some((m) => m.to.includes('anna@example.pl'))).toBe(false)
  })

  it('treść: dane do oddzwonienia, karta projektu i link do panelu; temat z rodzajem sprawy i imieniem', () => {
    const mail = buildStudioMail(submission, {
      to: 'pracownia@example.pl',
      adminUrl: 'https://pznowak.pl/admin/collections/submissions/17',
    })
    expect(mail.subject).toBe('Kreator pierścionka – Anna (nr 17)')
    // telefon i e-mail tylko w treści, nie w temacie
    expect(mail.subject).not.toContain('501')
    expect(mail.subject).not.toContain('anna@')
    expect(mail.text).toContain('Telefon: +48 501 321 347')
    expect(mail.text).toContain('Kamień: Szmaragd')
    expect(mail.text).toContain('Wiadomość:\nRozmiar do sprawdzenia.')
    expect(mail.text).toContain('https://pznowak.pl/admin/collections/submissions/17')
    expect(mail.text).toContain('20 października 2026')
  })

  it('kwarantanna: oznaczenie w temacie i ostrzeżenie w treści', () => {
    const mail = buildStudioMail(
      { ...submission, verification: 'quarantine' },
      { to: 'pracownia@example.pl', adminUrl: 'https://pznowak.pl/admin' },
    )
    expect(mail.subject).toBe('Kreator pierścionka – Anna (nr 17) – kwarantanna')
    expect(mail.text).toContain('UWAGA: KWARANTANNA')
    expect(mail.text).toContain('Wizualizacja ruszy tylko po ręcznym zatwierdzeniu')
    // formularz kontaktowy nie ma wizualizacji
    const contactMail = buildStudioMail(
      { ...submission, kind: 'contact', topic: 'inne', verification: 'quarantine' },
      { to: 'pracownia@example.pl', adminUrl: 'https://pznowak.pl/admin' },
    )
    expect(contactMail.text).toContain('UWAGA: KWARANTANNA')
    expect(contactMail.text).not.toContain('Wizualizacja')
    const verified = buildStudioMail(
      { ...submission, verification: 'verified' },
      { to: 'pracownia@example.pl', adminUrl: 'https://pznowak.pl/admin' },
    )
    expect(verified.subject).not.toContain('kwarantanna')
    expect(verified.text).not.toContain('KWARANTANNA')
  })

  it('bez adresu pracowni albo bez dostawcy poczty: pomija, nic nie wysyła i nie loguje danych klienta', async () => {
    const logs: string[] = []
    const transport = fakeTransport()
    expect(
      await notifyStudio(submission, {
        transport,
        to: undefined,
        adminUrl: '',
        log: (m) => logs.push(m),
      }),
    ).toBe('skipped')
    const consoleAdapter = fakeTransport('console')
    expect(
      await notifyStudio(submission, {
        transport: consoleAdapter,
        to: 'pracownia@example.pl',
        adminUrl: '',
        log: (m) => logs.push(m),
      }),
    ).toBe('skipped')
    expect(
      await notifyStudio(submission, {
        transport: null,
        to: 'pracownia@example.pl',
        adminUrl: '',
        log: (m) => logs.push(m),
      }),
    ).toBe('skipped')
    expect(transport.sent).toHaveLength(0)
    expect(consoleAdapter.sent).toHaveLength(0)
    expect(logs.join(' ')).not.toMatch(/Anna|501|anna@/)
  })

  it('błąd dostawcy poczty nie przerywa obsługi: status „failed”', async () => {
    const transport: MailTransport = {
      name: 'smtp',
      send: async () => {
        throw new Error('SMTP 550')
      },
    }
    expect(
      await notifyStudio(submission, {
        transport,
        to: 'pracownia@example.pl',
        adminUrl: '',
        log: () => undefined,
      }),
    ).toBe('failed')
  })

  it('formularz kontaktowy: temat maila z rodzajem sprawy, Reply-To = e-mail klienta', () => {
    const contact: NotifiedSubmission = {
      ...submission,
      kind: 'contact',
      topic: 'obraczki',
      summary:
        'Temat: Obrączki ślubne\nRozmowa: Telefonicznie – mieszkam dalej\nPreferowany kontakt: E-mail',
    }
    const mail = buildStudioMail(contact, { to: 'pracownia@example.pl', adminUrl: 'https://x/a' })
    expect(mail.subject).toBe('Obrączki ślubne – Anna (nr 17)')
    expect(mail.replyTo).toBe('anna@example.pl')
    expect(mail.to).toBe('pracownia@example.pl')
    expect(mail.text).toContain('Rozmowa: Telefonicznie – mieszkam dalej')
    expect(mail.text).toContain('Preferowany kontakt: E-mail')
    expect(mail.text).toContain('„Odpowiedz” na tę wiadomość trafi do klienta')
  })

  it('bez e-maila albo z adresem, który nie przejdzie walidacji: bez Reply-To', () => {
    const contact = { ...submission, kind: 'contact' as const, topic: 'inne' as const }
    for (const email of [null, '', 'a@b.pl, c@d.pl', 'a@b.pl\nBcc: x@y.pl', 'Anna <a@b.pl>']) {
      const mail = buildStudioMail({ ...contact, email }, { to: 'p@example.pl', adminUrl: '' })
      expect(mail.replyTo, String(email)).toBeUndefined()
      expect(mail.text).not.toContain('Odpowiedz')
    }
  })

  it('przekazuje Reply-To do adaptera poczty Payloada', async () => {
    const sendEmail = vi.fn(async () => undefined)
    const payload = { email: { name: 'nodemailer' }, sendEmail } as unknown as Payload
    const transport = payloadMailTransport(payload)
    expect(transport.name).toBe('nodemailer')
    await transport.send({
      to: 'p@example.pl',
      subject: 'T',
      text: 'x',
      replyTo: 'anna@example.pl',
    })
    await transport.send({ to: 'p@example.pl', subject: 'T', text: 'x' })
    expect(sendEmail).toHaveBeenNthCalledWith(1, {
      to: 'p@example.pl',
      subject: 'T',
      text: 'x',
      replyTo: 'anna@example.pl',
    })
    expect(sendEmail).toHaveBeenNthCalledWith(2, { to: 'p@example.pl', subject: 'T', text: 'x' })
  })

  it('błąd SMTP w logu: tylko kod, bez treści odpowiedzi serwera (adresy)', async () => {
    const logs: string[] = []
    const transport: MailTransport = {
      name: 'nodemailer',
      send: async () => {
        throw Object.assign(new Error('Invalid login: 535 anna@example.pl rejected'), {
          code: 'EAUTH',
          responseCode: 535,
        })
      },
    }
    const status = await notifyStudio(submission, {
      transport,
      to: 'pracownia@example.pl',
      adminUrl: '',
      log: (m) => logs.push(m),
    })
    expect(status).toBe('failed')
    expect(logs.join(' ')).toContain('EAUTH 535')
    expect(logs.join(' ')).not.toMatch(/anna@|Invalid login/)
    expect(mailErrorCode(new Error('x'))).toBe('nieznany')
    expect(mailErrorCode({ code: 'zły kod\n' })).toBe('nieznany')
  })
})
