import type { PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { applyArchiveStatus, validatePublishedProductMedia } from '@/lib/product-workflow'

const requestWithMedia = (mimeTypes: Record<number, string>) =>
  ({
    payload: {
      findByID: vi.fn(async ({ id }: { id: number }) => ({
        id,
        mimeType: mimeTypes[id],
      })),
    },
  }) as unknown as PayloadRequest

describe('product workflow', () => {
  it('requires one primary image for a published product', async () => {
    const req = requestWithMedia({ 1: 'image/png', 2: 'image/jpeg' })

    await expect(
      validatePublishedProductMedia(
        [
          { asset: 1, isPrimary: true },
          { asset: 2, isPrimary: false },
        ],
        req,
      ),
    ).resolves.toBe(true)

    await expect(
      validatePublishedProductMedia([{ asset: 1, isPrimary: false }], req),
    ).resolves.toContain('dokładnie jedno')
  })

  it('allows at most one video and never a primary video', async () => {
    const req = requestWithMedia({
      1: 'image/png',
      2: 'video/mp4',
      3: 'video/mp4',
    })

    await expect(
      validatePublishedProductMedia(
        [{ asset: 1, isPrimary: true }, { asset: 2 }, { asset: 3 }],
        req,
      ),
    ).resolves.toContain('najwyżej jeden film')

    await expect(
      validatePublishedProductMedia([{ asset: 2, isPrimary: true }], req),
    ).resolves.toContain('co najmniej jedno zdjęcie')
  })

  it('turns every archived product into a draft', () => {
    expect(applyArchiveStatus({ _status: 'published', archived: true })).toEqual({
      _status: 'draft',
      archived: true,
    })
  })
})
