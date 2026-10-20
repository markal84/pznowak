import { describe, expect, it } from 'vitest'
import { isIndexable } from '../../src/lib/indexing'
import { SUBMISSIONS_ENABLED } from '../../src/lib/site'

describe('indeksowanie', () => {
  it('tylko produkcja Vercela jest indeksowana', () => {
    expect(isIndexable('production')).toBe(true)
    expect(isIndexable('preview')).toBe(false)
    expect(isIndexable('development')).toBe(false)
    expect(isIndexable(undefined)).toBe(false)
  })
})

describe('wysyłka formularzy', () => {
  it('jest wyłączona do czasu wdrożenia zabezpieczeń (etap 2)', () => {
    expect(SUBMISSIONS_ENABLED).toBe(false)
  })
})
