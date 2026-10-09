import { describe, expect, it, afterEach, vi } from 'vitest'
import { assertStagingOwnsMedia, isStagingEnvironment } from '../../src/lib/staging-media'

afterEach(() => vi.unstubAllEnvs())
describe('Staging Blob ownership', () => {
  it('blocks changing/deleting production and unowned media on staging', () => {
    vi.stubEnv('NEON_BRANCH', 'staging')
    expect(() => assertStagingOwnsMedia({ prefix: 'cms/media' })).toThrow()
    expect(() => assertStagingOwnsMedia({})).toThrow()
    expect(() => assertStagingOwnsMedia({ prefix: 'cms/media-staging' })).not.toThrow()
  })
  it('enforces isolation on Preview even without NEON_BRANCH', () => {
    vi.stubEnv('NEON_BRANCH', '')
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect(isStagingEnvironment()).toBe(true)
    expect(() => assertStagingOwnsMedia({ prefix: 'cms/media' })).toThrow()
  })
  it('leaves production media operations available in production', () => {
    vi.stubEnv('NEON_BRANCH', 'production')
    vi.stubEnv('VERCEL_ENV', 'production')
    expect(() => assertStagingOwnsMedia({ prefix: 'cms/media' })).not.toThrow()
  })
})
