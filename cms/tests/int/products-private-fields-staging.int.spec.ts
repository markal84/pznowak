// @vitest-environment node
/**
 * Test na bazie stagingowej (Neon branch `staging`): dane robocze pierścionka (`source` z FB i
 * `legacy.sourcePayload` ze starego katalogu) nie wychodzą do niezalogowanych, a editor je widzi.
 * Uruchamianie: `npm run test:int:staging`. Bez bazy stagingowej jest pomijany, na produkcyjnej przerywa się.
 *
 * Odczyty idą Local API z `overrideAccess: false` (ta sama kontrola dostępu co REST). Test tworzy jeden
 * szkic „TEST H-C2 – usunąć”, a po teście usuwa go na stałe (także z kosza i wersje), nawet przy błędzie.
 * Nic nie publikuje; do sprawdzenia pól na opublikowanym produkcie używa tylko odczytu.
 */
import { randomUUID } from 'node:crypto'

import type { Payload, TypedUser, Where } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { stagingDatabaseOrSkipReason } from './helpers/submissions'

const skipReason = stagingDatabaseOrSkipReason()
const RUN = randomUUID().slice(0, 8)
const NAME = `TEST H-C2 – usunąć (${RUN})`
const FACEBOOK_KEY = `test-hc2@${RUN}`
const WORDPRESS_ID = 990_000_000 + Math.floor(Math.random() * 9_000_000)

const editor = { collection: 'users', id: 0, roles: ['editor'] } as unknown as TypedUser

let payload: Payload
let draftId: number | undefined

const find = (user: TypedUser | undefined, where: Where, draft = false) =>
  payload.find({
    collection: 'products',
    depth: 0,
    draft,
    limit: 5,
    overrideAccess: false,
    user,
    where,
  })

describe.skipIf(skipReason)('pierścionki na stagingu: dane robocze niewidoczne dla gościa', () => {
  beforeAll(async () => {
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    payload = await getPayload({ config })
    const created = await payload.create({
      collection: 'products',
      context: { skipFrontendRevalidation: true },
      data: {
        _status: 'draft',
        legacy: { sourcePayload: { test: `hc2-${RUN}` }, wordpressId: WORDPRESS_ID },
        name: NAME,
        source: { facebookKey: FACEBOOK_KEY, facebookPayload: { test: `hc2-${RUN}` } },
      },
      draft: true,
      overrideAccess: true,
    })
    draftId = created.id
  }, 120_000)

  afterAll(async () => {
    if (!payload) return
    try {
      if (draftId !== undefined) {
        await payload.delete({
          collection: 'products',
          context: { skipFrontendRevalidation: true },
          overrideAccess: true,
          trash: true,
          where: { id: { equals: draftId } },
        })
        // Potwierdzenie sprzątania: ani dokumentu (także w koszu), ani wersji nie ma.
        const left = await payload.find({
          collection: 'products',
          depth: 0,
          overrideAccess: true,
          trash: true,
          where: { name: { equals: NAME } },
        })
        const versions = await payload.findVersions({
          collection: 'products',
          depth: 0,
          overrideAccess: true,
          trash: true,
          where: { parent: { equals: draftId } },
        })
        expect(left.totalDocs).toBe(0)
        expect(versions.totalDocs).toBe(0)
      }
    } finally {
      await payload.destroy()
    }
  }, 60_000)

  it('szkic: gość go nie widzi, editor widzi go z oboma polami', async () => {
    const asGuest = await find(undefined, { id: { equals: draftId } }, true)
    expect(asGuest.docs).toHaveLength(0)

    const asEditor = await find(editor, { id: { equals: draftId } }, true)
    expect(asEditor.docs).toHaveLength(1)
    const doc = asEditor.docs[0]
    expect(doc.source?.facebookKey).toBe(FACEBOOK_KEY)
    expect(doc.legacy?.sourcePayload).toEqual({ test: `hc2-${RUN}` })
    expect(doc.legacy?.wordpressId).toBe(WORDPRESS_ID)
  })

  it('opublikowany pierścionek (tylko odczyt): gość nie dostaje source ani legacy.sourcePayload', async () => {
    const published = await find(undefined, { _status: { equals: 'published' } })
    expect(published.docs.length).toBeGreaterThan(0)
    for (const doc of published.docs) {
      expect(doc).not.toHaveProperty('source')
      expect(doc.legacy ?? {}).not.toHaveProperty('sourcePayload')
    }
    // wordpressId zostaje publiczne – endpoint /products bierze go jako `id`
    expect(published.docs.some((doc) => doc.legacy?.wordpressId != null)).toBe(true)

    const asEditor = await find(editor, { _status: { equals: 'published' } })
    expect(asEditor.docs.some((doc) => doc.legacy?.sourcePayload != null)).toBe(true)
  })

  it('gość nie może filtrować po polach roboczych', async () => {
    await expect(
      find(undefined, { 'source.facebookKey': { equals: FACEBOOK_KEY } }),
    ).rejects.toThrow()
    await expect(find(undefined, { 'legacy.sourcePayload': { exists: true } })).rejects.toThrow()
  })
})
