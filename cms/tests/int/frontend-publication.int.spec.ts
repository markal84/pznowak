import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

import { publicationAffectsFrontend, revalidateFrontend } from '@/lib/frontend-publication'
import { revalidatePath, revalidateTag } from 'next/cache'

describe('frontend publication', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refreshes for a publish and for a previously published document', () => {
    expect(publicationAffectsFrontend({ _status: 'published' })).toBe(true)
    expect(
      publicationAffectsFrontend({ _status: 'draft' }, { _status: 'published' }),
    ).toBe(true)
  })

  it('does not refresh for draft-only edits', () => {
    expect(publicationAffectsFrontend({ _status: 'draft' }, { _status: 'draft' })).toBe(false)
  })

  it('invalidates the catalog, home and both product slugs after a slug change', () => {
    revalidateFrontend('product', { slug: 'new-slug' }, { slug: 'old-slug' })
    expect(revalidateTag).toHaveBeenCalledWith('products', { expire: 0 })
    expect(vi.mocked(revalidatePath).mock.calls.map(([path]) => path)).toEqual([
      '/',
      '/pierscionki',
      '/na-zamowienie',
      '/naprawy',
      '/pierscionki/new-slug',
      '/pierscionki/old-slug',
    ])
  })

  it('targets gallery and shared site content separately', () => {
    revalidateFrontend('gallery')
    expect(revalidateTag).toHaveBeenCalledWith('gallery', { expire: 0 })
    expect(revalidatePath).toHaveBeenCalledWith('/realizacje')
    vi.clearAllMocks()
    revalidateFrontend('site-content')
    expect(revalidateTag).toHaveBeenCalledWith('site-content', { expire: 0 })
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([
      ['/', 'layout'],
      ['/'],
      ['/pracownia'],
      ['/kontakt'],
    ])
  })
})
