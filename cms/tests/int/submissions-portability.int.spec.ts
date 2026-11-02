import { describe, expect, it, vi } from 'vitest'

import {
  clientIpSourceFromEnv,
  isProductionRuntime,
  submissionSettingsFromEnv,
} from '@/lib/submissions/config'
import { deriveKey, hashIp } from '@/lib/submissions/form-token'
import { handleSubmission, type SubmissionDeps } from '@/lib/submissions/handler'
import { ipLimitIdentity } from '@/lib/submissions/limits'
import {
  cleanIp,
  clientIp,
  describeIpHeaders,
  linkOrigin,
  safeErrorMessage,
} from '@/lib/submissions/request'
import type { SubmissionDraft } from '@/lib/submissions/store'
import {
  APP_SECRET,
  DUMMY_TOKEN,
  formTokenAged,
  submissionRequest,
  testSettings,
  validContactData,
} from './helpers/submissions'

/** Zlecenie X: to samo zachowanie na Vercelu i na MyDevil (nginx, opcjonalnie Cloudflare przed nim). */

const NOW = Date.parse('2026-11-02T10:00:00Z')

const headers = (values: Record<string, string>) => new Headers(values)

describe('adres klienta z konfigurowalnego nagłówka', () => {
  it('bez CLIENT_IP_HEADER jak dotąd na Vercelu: x-real-ip, potem pierwszy wpis x-forwarded-for', () => {
    expect(clientIpSourceFromEnv({})).toEqual({ kind: 'legacy' })
    expect(
      clientIp(headers({ 'x-real-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.1' })),
    ).toBe('203.0.113.7')
    expect(clientIp(headers({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }))).toBe('198.51.100.1')
    expect(clientIp(headers({}))).toBeNull()
  })

  it('cf-connecting-ip: tylko ten nagłówek, podrobione x-real-ip i x-forwarded-for są ignorowane', () => {
    const source = clientIpSourceFromEnv({ CLIENT_IP_HEADER: 'CF-Connecting-IP' })
    expect(source).toEqual({ kind: 'header', header: 'cf-connecting-ip' })
    const spoofed = headers({
      'cf-connecting-ip': '2001:db8::1',
      'x-real-ip': '1.2.3.4',
      'x-forwarded-for': '5.6.7.8',
    })
    expect(clientIp(spoofed, source)).toBe('2001:db8::1')
    expect(clientIp(headers({ 'x-real-ip': '1.2.3.4' }), source)).toBeNull()
  })

  it('x-forwarded-for: wpis dopisany przez zaufane proxy (od końca), nie wpis klienta z początku', () => {
    const one = clientIpSourceFromEnv({ CLIENT_IP_HEADER: 'x-forwarded-for' })
    expect(one).toEqual({ kind: 'forwarded-for', hops: 1 })
    // klient sam dopisał „1.1.1.1”; nginx dopisał prawdziwy adres na końcu
    const list = headers({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' })
    expect(clientIp(list, one)).toBe('203.0.113.9')
    const two = clientIpSourceFromEnv({
      CLIENT_IP_HEADER: 'x-forwarded-for',
      CLIENT_IP_PROXY_HOPS: '2',
    })
    expect(clientIp(headers({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9, 10.0.0.2' }), two)).toBe(
      '203.0.113.9',
    )
    // za mało wpisów: brak adresu (wspólny licznik „nieznany”), a nie wpis klienta
    expect(clientIp(headers({ 'x-forwarded-for': '203.0.113.9' }), two)).toBeNull()
    for (const hops of ['0', '-1', 'abc', '9']) {
      expect(
        clientIpSourceFromEnv({ CLIENT_IP_HEADER: 'x-forwarded-for', CLIENT_IP_PROXY_HOPS: hops }),
        hops,
      ).toEqual({ kind: 'forwarded-for', hops: 1 })
    }
  })

  it('niepoprawna nazwa nagłówka: domyślne źródło i ostrzeżenie bez wartości', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(clientIpSourceFromEnv({ CLIENT_IP_HEADER: 'x real ip\n' })).toEqual({ kind: 'legacy' })
    expect(warn.mock.calls.join(' ')).not.toContain('x real ip')
    warn.mockRestore()
  })

  it('wartość musi być adresem IP (bez portu i nawiasów); śmieci nie tworzą osobnych liczników', () => {
    expect(cleanIp('203.0.113.7:443')).toBe('203.0.113.7')
    expect(cleanIp('[2001:db8::1]:443')).toBe('2001:db8::1')
    expect(cleanIp('::ffff:203.0.113.7')).toBe('::ffff:203.0.113.7')
    for (const junk of ['', 'unknown', 'abc, def', '1.2.3', 'x'.repeat(100), '<script>']) {
      expect(cleanIp(junk), junk).toBeNull()
    }
  })

  it('wpis diagnostyczny: nazwy nagłówków i liczba wpisów, bez adresów', () => {
    const text = describeIpHeaders(
      headers({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9', 'cf-connecting-ip': '203.0.113.9' }),
      true,
    )
    expect(text).toBe(
      'nagłówki adresu klienta: cf-connecting-ip, x-forwarded-for (wpisów: 2); adres odczytany',
    )
    expect(text).not.toMatch(/203\.0|1\.1\.1/)
    expect(describeIpHeaders(headers({}), false)).toContain('NIEODCZYTANY')
  })

  it('endpoint liczy limit z adresu ze skonfigurowanego nagłówka', async () => {
    const inserted: SubmissionDraft[] = []
    const deps: SubmissionDeps = {
      settings: testSettings({ clientIpSource: { kind: 'header', header: 'cf-connecting-ip' } }),
      now: () => NOW,
      verifyTurnstile: vi.fn(async () => ({ ok: true as const, testing: true })),
      siteverifyReachable: async () => true,
      consumeLimits: vi.fn(async () => ({ ok: true as const })),
      insertDraft: async (draft) => {
        inserted.push(draft)
        return { id: inserted.length }
      },
      afterAccepted: async () => undefined,
      defer: () => undefined,
      log: () => undefined,
    }
    const body = {
      form: 'kontakt',
      formToken: formTokenAged('kontakt', NOW, 30_000),
      turnstileToken: DUMMY_TOKEN,
      honeypot: '',
      data: validContactData(),
    }
    const response = await handleSubmission(
      submissionRequest(body, { ip: '1.2.3.4', headers: { 'cf-connecting-ip': '198.51.100.20' } }),
      deps,
    )
    expect(response.status).toBe(201)
    const expected = hashIp(ipLimitIdentity('198.51.100.20'), deriveKey(APP_SECRET, 'ip-hash'))
    expect(inserted[0].meta?.ipHash).toBe(expected)
    expect(vi.mocked(deps.verifyTurnstile).mock.calls[0][0].remoteip).toBe('198.51.100.20')
  })
})

describe('produkcja i podgląd ze zmiennych, nie z „czy to Vercel”', () => {
  it('SITE_ENV ma pierwszeństwo, VERCEL_ENV jako zapas, a bez obu decyduje NODE_ENV', () => {
    expect(isProductionRuntime({ SITE_ENV: 'production' })).toBe(true)
    expect(isProductionRuntime({ VERCEL_ENV: 'production' })).toBe(true)
    expect(isProductionRuntime({ VERCEL_ENV: 'preview', NODE_ENV: 'production' })).toBe(false)
    expect(isProductionRuntime({ SITE_ENV: 'preview', VERCEL_ENV: 'production' })).toBe(false)
    // MyDevil bez SITE_ENV (`next start`): traktowane jak produkcja
    expect(isProductionRuntime({ NODE_ENV: 'production' })).toBe(true)
    expect(isProductionRuntime({ NODE_ENV: 'development' })).toBe(false)
    expect(isProductionRuntime({})).toBe(false)
  })

  it('klucze testowe Turnstile tylko poza produkcją', () => {
    // `next start` wymaga sekretów aplikacji (src/lib/environment.ts)
    const built = {
      NODE_ENV: 'production',
      PAYLOAD_SECRET: 'x',
      DATABASE_URL: 'postgres://x',
      BLOB_READ_WRITE_TOKEN: 'x',
    }
    expect(submissionSettingsFromEnv({ SITE_ENV: 'production' }).allowTestingKeys).toBe(false)
    expect(submissionSettingsFromEnv(built).allowTestingKeys).toBe(false)
    expect(submissionSettingsFromEnv({ VERCEL_ENV: 'production' }).allowTestingKeys).toBe(false)
    expect(submissionSettingsFromEnv({ ...built, VERCEL_ENV: 'preview' }).allowTestingKeys).toBe(
      true,
    )
    expect(submissionSettingsFromEnv({ NODE_ENV: 'development' }).allowTestingKeys).toBe(true)
  })

  it('link do panelu w mailu: na produkcji z SITE_URL (domyślnie pznowak.pl), nie z X-Forwarded-Host', () => {
    expect(submissionSettingsFromEnv({ SITE_ENV: 'production' }).publicOrigin).toBe(
      'https://pznowak.pl',
    )
    expect(
      submissionSettingsFromEnv({ SITE_ENV: 'production', SITE_URL: 'https://nowa.pznowak.pl/x' })
        .publicOrigin,
    ).toBe('https://nowa.pznowak.pl')
    expect(submissionSettingsFromEnv({ VERCEL_ENV: 'preview' }).publicOrigin).toBeNull()

    const forged = new Request('http://localhost/api/zgloszenia', {
      headers: {
        host: 'pznowak.pl',
        'x-forwarded-host': 'zly-adres.example',
        'x-forwarded-proto': 'https',
      },
    })
    expect(linkOrigin(forged, 'https://pznowak.pl')).toBe('https://pznowak.pl')
    // podgląd (Vercel nadpisuje te nagłówki): adres z żądania
    expect(linkOrigin(forged, null)).toBe('https://zly-adres.example')
  })

  it('endpoint przekazuje do powiadomienia adres z konfiguracji', async () => {
    const origins: string[] = []
    const deps: SubmissionDeps = {
      settings: testSettings({ publicOrigin: 'https://pznowak.pl' }),
      now: () => NOW,
      verifyTurnstile: async () => ({ ok: true as const, testing: true }),
      siteverifyReachable: async () => true,
      consumeLimits: async () => ({ ok: true as const }),
      insertDraft: async () => ({ id: 1 }),
      afterAccepted: async (_s, { origin }) => void origins.push(origin),
      defer: (task) => void task(),
      log: () => undefined,
    }
    const body = {
      form: 'kontakt',
      formToken: formTokenAged('kontakt', NOW, 30_000),
      turnstileToken: DUMMY_TOKEN,
      honeypot: '',
      data: validContactData(),
    }
    await handleSubmission(
      submissionRequest(body, { headers: { 'x-forwarded-host': 'zly-adres.example' } }),
      deps,
    )
    expect(origins).toEqual(['https://pznowak.pl'])
  })
})

describe('treść żądania i logi', () => {
  it('żądanie bez Content-Length (strumień) większe niż 16 KB: 413, bez wczytywania całości', async () => {
    let pulled = 0
    const chunk = new TextEncoder().encode('x'.repeat(4096))
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++
        if (pulled > 1000) controller.close()
        else controller.enqueue(chunk)
      },
    })
    const request = new Request('http://localhost/api/zgloszenia', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: stream,
      duplex: 'half',
    } as RequestInit)
    const deps = { settings: testSettings(), log: () => undefined } as unknown as SubmissionDeps
    const response = await handleSubmission(request, deps)
    expect(response.status).toBe(413)
    // przerwane po przekroczeniu limitu (16 KB = 4 kawałki po 4 KB), a nie po 4 MB
    expect(pulled).toBeLessThan(10)
  })

  it('błąd zapytania do bazy w logu bez parametrów (danych klienta)', async () => {
    const drizzleLike = new Error(
      'Failed query: insert into "cms_submissions" ("name", "phone") values ($1, $2)\nparams: Anna,+48 501 321 347',
    )
    expect(safeErrorMessage(drizzleLike)).toBe(
      'Failed query: insert into "cms_submissions" ("name", "phone") values ($1, $2)',
    )
    const logs: unknown[] = []
    const deps: SubmissionDeps = {
      settings: testSettings(),
      now: () => NOW,
      verifyTurnstile: async () => ({ ok: true as const, testing: true }),
      siteverifyReachable: async () => true,
      consumeLimits: async () => ({ ok: true as const }),
      insertDraft: async () => {
        throw drizzleLike
      },
      afterAccepted: async () => undefined,
      defer: () => undefined,
      log: (event, details) => void logs.push(event, details),
    }
    const body = {
      form: 'kontakt',
      formToken: formTokenAged('kontakt', NOW, 30_000),
      turnstileToken: DUMMY_TOKEN,
      honeypot: '',
      data: validContactData({ name: 'Anna', phone: '501 321 347' }),
    }
    const response = await handleSubmission(submissionRequest(body), deps)
    expect(response.status).toBe(500)
    expect(JSON.stringify(logs)).not.toMatch(/Anna|501 321/)
  })
})
