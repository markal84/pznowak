import { describe, expect, it } from 'vitest'
import { isIndexable, siteEnvironment } from '../../src/lib/indexing'
import { SUBMISSIONS_ENABLED } from '../../src/lib/site'

describe('indeksowanie', () => {
  it('tylko produkcja jest indeksowana (zapasowo wg VERCEL_ENV)', () => {
    expect(isIndexable('', 'production')).toBe(true)
    expect(isIndexable('', 'preview')).toBe(false)
    expect(isIndexable('', 'development')).toBe(false)
    expect(isIndexable('', '')).toBe(false)
  })

  it('SITE_ENV ma pierwszeństwo przed VERCEL_ENV na każdym hostingu', () => {
    expect(isIndexable('production', undefined)).toBe(true)
    expect(isIndexable('production', 'preview')).toBe(true)
    expect(isIndexable('preview', 'production')).toBe(false)
    expect(isIndexable('staging', 'production')).toBe(false)
    expect(isIndexable(' production ', '')).toBe(true)
  })

  it('puste SITE_ENV jest ignorowane i nie włącza indeksowania samo z siebie', () => {
    expect(isIndexable('   ', 'production')).toBe(true)
    expect(isIndexable('   ', '   ')).toBe(false)
  })

  it('siteEnvironment zwraca środowisko albo undefined', () => {
    expect(siteEnvironment('production', 'preview')).toBe('production')
    expect(siteEnvironment('', 'preview')).toBe('preview')
    expect(siteEnvironment('', '')).toBeUndefined()
  })
})

describe('wysyłka formularzy', () => {
  it('jest wyłączona do czasu wdrożenia zabezpieczeń (etap 2)', () => {
    expect(SUBMISSIONS_ENABLED).toBe(false)
  })
})
