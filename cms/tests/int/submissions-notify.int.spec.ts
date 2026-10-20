import { describe, expect, it, vi } from 'vitest'

import {
  buildStudioMail,
  notifyStudio,
  type MailTransport,
  type NotifiedSubmission,
} from '@/lib/submissions/notify'

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

  it('treść: dane do oddzwonienia, karta projektu i link do panelu; temat bez danych osobowych', () => {
    const mail = buildStudioMail(submission, {
      to: 'pracownia@example.pl',
      adminUrl: 'https://pznowak.pl/admin/collections/submissions/17',
    })
    expect(mail.subject).toBe('Nowe zgłoszenie z kreatora pierścionka (nr 17)')
    expect(mail.subject).not.toContain('Anna')
    expect(mail.subject).not.toContain('501')
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
    expect(mail.subject).toBe('Nowe zgłoszenie z kreatora pierścionka (nr 17) – kwarantanna')
    expect(mail.text).toContain('UWAGA: KWARANTANNA')
    expect(mail.text).toContain('Wizualizacja ruszy tylko po ręcznym zatwierdzeniu')
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
})
