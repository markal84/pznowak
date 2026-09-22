import { describe, expect, it } from 'vitest'

import { publicationAffectsFrontend } from '@/lib/frontend-publication'

describe('frontend publication', () => {
  it('rebuilds for a publish and for a previously published document', () => {
    expect(publicationAffectsFrontend({ _status: 'published' })).toBe(true)
    expect(
      publicationAffectsFrontend({ _status: 'draft' }, { _status: 'published' }),
    ).toBe(true)
  })

  it('does not rebuild for draft-only edits', () => {
    expect(publicationAffectsFrontend({ _status: 'draft' }, { _status: 'draft' })).toBe(false)
  })
})
