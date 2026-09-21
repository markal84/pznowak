import { describe, expect, it } from 'vitest'

import { resolveCmsEnvironment } from '@/lib/environment'

describe('CMS environment', () => {
  it('rejects every missing production secret', () => {
    expect(() => resolveCmsEnvironment({ nodeEnv: 'production' })).toThrow('BLOB_READ_WRITE_TOKEN')
    expect(() =>
      resolveCmsEnvironment({
        blobReadWriteToken: 'blob',
        nodeEnv: 'production',
      }),
    ).toThrow('DATABASE_URL')
    expect(() =>
      resolveCmsEnvironment({
        blobReadWriteToken: 'blob',
        databaseUrl: 'postgres://database',
        nodeEnv: 'production',
      }),
    ).toThrow('PAYLOAD_SECRET')
  })

  it('returns explicitly configured production values', () => {
    expect(
      resolveCmsEnvironment({
        blobReadWriteToken: 'blob',
        databaseUrl: 'postgres://database',
        nodeEnv: 'production',
        payloadSecret: 'secret',
      }),
    ).toEqual({
      blobReadWriteToken: 'blob',
      databaseUrl: 'postgres://database',
      payloadSecret: 'secret',
    })
  })
})
