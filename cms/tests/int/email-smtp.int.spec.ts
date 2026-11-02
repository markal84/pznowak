import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import nodemailer from 'nodemailer'
import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_FROM_NAME,
  emailAdapterFromEnv,
  parseFrom,
  smtpConfigFromEnv,
  smtpTransportOptions,
} from '@/lib/email'
import { buildStudioMail, notifyStudio, payloadMailTransport } from '@/lib/submissions/notify'

/**
 * Poczta przez SMTP (zlecenie X). Bez prawdziwego serwera i bez wysyłki do ludzi: transport testowy nodemailera
 * (`streamTransport`) składa gotową wiadomość MIME, którą sprawdzamy jak serwer poczty.
 */

const FULL = {
  SMTP_HOST: 'mail0.mydevil.net',
  SMTP_PORT: '465',
  SMTP_USER: 'kontakt@pznowak.pl',
  SMTP_PASS: 'tajne haslo ',
  SMTP_FROM: 'Formularz pznowak.pl <kontakt@pznowak.pl>',
}

describe('konfiguracja SMTP ze zmiennych', () => {
  it('bez zmiennych: wyłączone, bez adaptera (zachowanie jak dotąd: „pominięte”)', () => {
    expect(smtpConfigFromEnv({})).toEqual({ status: 'off' })
    expect(emailAdapterFromEnv({})).toBeUndefined()
  })

  it('niekompletne: wyłączone, w ostrzeżeniu same nazwy zmiennych, bez wartości', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const partial = { SMTP_HOST: 'mail0.mydevil.net', SMTP_PASS: 'tajne haslo' }
    expect(smtpConfigFromEnv(partial)).toEqual({
      status: 'incomplete',
      problems: ['brak SMTP_USER', 'brak SMTP_FROM'],
    })
    expect(emailAdapterFromEnv(partial)).toBeUndefined()
    expect(warn.mock.calls.join(' ')).toContain('brak SMTP_USER')
    expect(warn.mock.calls.join(' ')).not.toMatch(/tajne|mydevil/)
    warn.mockRestore()
    expect(smtpConfigFromEnv({ ...FULL, SMTP_PORT: '99999' })).toMatchObject({
      status: 'incomplete',
      problems: ['niepoprawny SMTP_PORT'],
    })
    expect(smtpConfigFromEnv({ ...FULL, SMTP_FROM: 'kontakt' })).toMatchObject({
      status: 'incomplete',
      problems: ['niepoprawny SMTP_FROM'],
    })
  })

  it('komplet: adres i nazwa nadawcy, hasło bez przycinania, domyślny port 465', () => {
    const config = smtpConfigFromEnv({ ...FULL, SMTP_PORT: '' })
    expect(config).toEqual({
      status: 'ok',
      settings: {
        host: 'mail0.mydevil.net',
        port: 465,
        user: 'kontakt@pznowak.pl',
        pass: 'tajne haslo ',
        fromAddress: 'kontakt@pznowak.pl',
        fromName: 'Formularz pznowak.pl',
      },
    })
    expect(parseFrom('kontakt@pznowak.pl')).toEqual({
      address: 'kontakt@pznowak.pl',
      name: DEFAULT_FROM_NAME,
    })
    expect(parseFrom('"Pracownia Złotnicza Michał Nowak" <kontakt@pznowak.pl>')).toEqual({
      address: 'kontakt@pznowak.pl',
      name: 'Pracownia Złotnicza Michał Nowak',
    })
    expect(parseFrom('a@b.pl, c@d.pl')).toBeNull()
  })

  it('połączenie zawsze szyfrowane: 465 = TLS, inny port = wymagany STARTTLS; bez szyfrowania tylko localhost', () => {
    const base = {
      host: 'mail0.mydevil.net',
      user: 'u',
      pass: 'p',
      fromAddress: 'a@b.pl',
      fromName: 'x',
    }
    expect(smtpTransportOptions({ ...base, port: 465 })).toMatchObject({
      secure: true,
      requireTLS: false,
    })
    expect(smtpTransportOptions({ ...base, port: 587 })).toMatchObject({
      secure: false,
      requireTLS: true,
    })
    expect(smtpTransportOptions({ ...base, port: 25 })).toMatchObject({ requireTLS: true })
    expect(smtpTransportOptions({ ...base, host: 'localhost', port: 1025 })).toMatchObject({
      secure: false,
      requireTLS: false,
    })
    const options = smtpTransportOptions({ ...base, port: 465 })
    expect(options.connectionTimeout).toBeLessThanOrEqual(10_000)
    expect(options.socketTimeout).toBeLessThanOrEqual(20_000)
  })

  it('z kompletem zmiennych powstaje adapter nodemailera (bez łączenia przy starcie)', async () => {
    const verify = vi.spyOn(nodemailer, 'createTransport')
    const adapter = await emailAdapterFromEnv(FULL)
    expect(adapter).toBeTypeOf('function')
    const initialized = adapter!({ payload: {} as Payload })
    expect(initialized.name).toBe('nodemailer')
    expect(initialized.defaultFromAddress).toBe('kontakt@pznowak.pl')
    expect(verify).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'mail0.mydevil.net', secure: true }),
    )
    verify.mockRestore()
  })
})

describe('wiadomość do pracowni przez transport testowy', () => {
  it('temat z rodzajem sprawy i imieniem, Reply-To klienta, nadawca ze skrzynki pracowni, tylko tekst', async () => {
    const transport = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
      newline: 'unix',
    })
    const adapter = await nodemailerAdapter({
      defaultFromAddress: 'kontakt@pznowak.pl',
      defaultFromName: 'Formularz pznowak.pl',
      transport,
      skipVerify: true,
    })
    const email = adapter({ payload: {} as Payload })
    const sent: Array<{ message: Buffer; envelope: { from: string; to: string[] } }> = []
    const payload = {
      email,
      sendEmail: async (message: Parameters<typeof email.sendEmail>[0]) => {
        const info = (await email.sendEmail(message)) as {
          message: Buffer
          envelope: { from: string; to: string[] }
        }
        sent.push(info)
        return info
      },
    } as unknown as Payload

    const status = await notifyStudio(
      {
        id: 42,
        kind: 'contact',
        topic: 'nowy',
        name: 'Zażółć',
        phone: '+48 501 321 347',
        email: 'klientka@example.pl',
        summary:
          'Temat: Pierścionek lub obrączki na zamówienie\nRozmowa: Telefonicznie albo przez wideo – mieszkam dalej\nPreferowany kontakt: E-mail\nBudżet: 6 000 zł (kwota podana przez klienta)',
        message: '<b>Nie pogrubiaj</b> https://example.com',
        createdAt: '2026-11-02T10:00:00.000Z',
      },
      {
        transport: payloadMailTransport(payload),
        to: 'pracownia@example.pl',
        adminUrl: 'https://pznowak.pl/admin/collections/submissions/42',
        log: () => undefined,
      },
    )
    expect(status).toBe('sent')
    expect(sent).toHaveLength(1)
    const { envelope } = sent[0]
    const raw = sent[0].message.toString('utf8')
    expect(envelope).toEqual({ from: 'kontakt@pznowak.pl', to: ['pracownia@example.pl'] })
    expect(raw).toMatch(/^From: "?Formularz pznowak\.pl"? <kontakt@pznowak\.pl>$/m)
    expect(raw).toMatch(/^Reply-To: klientka@example\.pl$/m)
    expect(raw).toMatch(/^To: pracownia@example\.pl$/m)
    expect(raw).toMatch(/^Content-Type: text\/plain; charset=utf-8$/m)
    expect(raw).not.toMatch(/text\/html/)
    // temat zakodowany (polskie znaki), po zdekodowaniu: rodzaj sprawy i imię
    const subjectLine = /^Subject: (.+(?:\n .+)*)$/m.exec(raw)![1]
    const decoded = subjectLine
      .split(/\s+/)
      .map((word) => {
        const m = /^=\?UTF-8\?Q\?(.*)\?=$/i.exec(word)
        if (!m) return word
        return Buffer.from(
          m[1]
            .replace(/_/g, ' ')
            .replace(/=([0-9A-F]{2})/gi, (_x, h) => String.fromCharCode(parseInt(h, 16))),
          'latin1',
        ).toString('utf8')
      })
      .join(' ')
      .replace(/\s+/g, ' ')
    expect(decoded.replace(/ /g, '')).toBe(
      'Pierścioneklubobrączkinazamówienie–Zażółć(nr42)'.replace(/ /g, ''),
    )
    // podgląd treści: zwykły tekst z podsumowaniem zgłoszenia
    const mail = buildStudioMail(
      {
        id: 42,
        kind: 'contact',
        topic: 'nowy',
        name: 'Zażółć',
        phone: '+48 501 321 347',
        email: 'klientka@example.pl',
        summary: 'Budżet: 6 000 zł (kwota podana przez klienta)',
        createdAt: '2026-11-02T10:00:00.000Z',
      },
      {
        to: 'pracownia@example.pl',
        adminUrl: 'https://pznowak.pl/admin/collections/submissions/42',
      },
    )
    expect(mail.text).toContain('Budżet: 6 000 zł')
  })
})
