import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CONSENT_COOKIE,
  CONSENT_VERSION,
  hasConsent,
  parseConsent,
  readConsent,
  writeConsent,
} from '../../src/lib/cookie-consent'

const encode = (value: unknown) => encodeURIComponent(JSON.stringify(value))
const valid = { v: CONSENT_VERSION, at: 1, maps: false, analytics: false, marketing: false }

function clearConsentCookie() {
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`
}

describe('zgoda na cookies: odczyt', () => {
  it('brak wartości albo śmieci to brak wyboru', () => {
    expect(parseConsent(undefined)).toBeNull()
    expect(parseConsent('')).toBeNull()
    expect(parseConsent('zepsute')).toBeNull()
    expect(parseConsent(encode('tekst'))).toBeNull()
    expect(parseConsent(encode(null))).toBeNull()
  })

  it('poprawny wybór jest odczytywany', () => {
    expect(parseConsent(encode({ ...valid, maps: true }))).toEqual({ ...valid, maps: true })
  })

  it('stara wersja albo brakująca kategoria wymusza ponowne pytanie', () => {
    expect(parseConsent(encode({ ...valid, v: CONSENT_VERSION - 1 }))).toBeNull()
    const { marketing: _marketing, ...withoutMarketing } = valid
    expect(parseConsent(encode(withoutMarketing))).toBeNull()
    expect(parseConsent(encode({ ...valid, maps: 'tak' }))).toBeNull()
  })
})

describe('zgoda na cookies: zapis', () => {
  beforeEach(clearConsentCookie)
  afterEach(clearConsentCookie)

  it('bez wyboru żadna kategoria opcjonalna nie ma zgody', () => {
    expect(readConsent()).toBeNull()
    expect(hasConsent('maps')).toBe(false)
    expect(hasConsent('analytics')).toBe(false)
    expect(hasConsent('marketing')).toBe(false)
  })

  it('zapis jednej kategorii zostawia pozostałe wyłączone', () => {
    writeConsent({ maps: true })
    expect(hasConsent('maps')).toBe(true)
    expect(hasConsent('analytics')).toBe(false)
    expect(hasConsent('marketing')).toBe(false)
    expect(readConsent()).toMatchObject({ v: CONSENT_VERSION, maps: true, analytics: false, marketing: false })
  })

  it('kolejny zapis zachowuje kategorie, których nie dotyczy, a wycofanie działa', () => {
    writeConsent({ analytics: true })
    writeConsent({ maps: true })
    expect(readConsent()).toMatchObject({ maps: true, analytics: true, marketing: false })
    writeConsent({ maps: false })
    expect(readConsent()).toMatchObject({ maps: false, analytics: true })
  })

  it('zapis rozsyła zdarzenie, na które reagują ConsentGate i pasek', () => {
    const listener = vi.fn()
    window.addEventListener('pn-consent-change', listener)
    writeConsent({ marketing: true })
    window.removeEventListener('pn-consent-change', listener)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('przełącznik paska (COOKIE_BANNER_ENABLED)', () => {
  afterEach(() => {
    vi.doUnmock('../../src/lib/site')
    vi.resetModules()
    clearConsentCookie()
  })

  it('przy wyłączonym pasku zapisana zgoda nie otwiera żadnej kategorii', async () => {
    writeConsent({ maps: true, analytics: true, marketing: true })
    expect(hasConsent('analytics')).toBe(true)

    vi.resetModules()
    vi.doMock('../../src/lib/site', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../../src/lib/site')>()),
      COOKIE_BANNER_ENABLED: false,
    }))
    const disabled = await import('../../src/lib/cookie-consent')
    expect(disabled.hasConsent('maps')).toBe(false)
    expect(disabled.hasConsent('analytics')).toBe(false)
    expect(disabled.hasConsent('marketing')).toBe(false)
  })
})
