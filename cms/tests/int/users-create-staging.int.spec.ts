// @vitest-environment node
/**
 * Konta w panelu zakłada tylko administrator (`access.create: isAdmin` w kolekcji `users`).
 * Bez tej reguły Payload przyjmuje domyślne „każdy zalogowany”, więc redaktor mógł zakładać konta
 * przez panel i `POST /api/users`.
 *
 * Część bazodanowa idzie na bazie stagingowej (Neon branch `staging`): `npm run test:int:staging`.
 * Bez bazy stagingowej jest pomijana, na produkcyjnej przerywa się. Zapisy idą Local API
 * z `overrideAccess: false` (ta sama kontrola dostępu co REST). Test zakłada jedno konto
 * `test-users-*@example.invalid` (redaktor z losowym hasłem) i po teście
 * usuwa wszystkie konta z adresami tego przebiegu, nawet przy błędzie.
 *
 * Pierwsze konto (`/admin/create-first-user` → `POST /api/users/first-register`) tej reguły nie
 * dotyczy: Payload tworzy je z `overrideAccess: true` (opis w PR).
 */
import { randomUUID } from 'node:crypto'

import {
  getAccessResults,
  type Payload,
  type PayloadRequest,
  type RequiredDataFromCollectionSlug,
  type TypedUser,
} from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

import { stagingDatabaseOrSkipReason } from './helpers/submissions'

const skipReason = stagingDatabaseOrSkipReason()
const RUN = randomUUID().slice(0, 8)
const emailFor = (who: string) => `test-users-${who}-${RUN}@example.invalid`

type Role = 'admin' | 'editor'
const asUser = (roles: Role[]) => ({ collection: 'users', id: 0, roles }) as unknown as TypedUser
const editor = asUser(['editor'])
const admin = asUser(['admin'])

// Bez `roles` celowo: tak wysyła formularz panelu, w którym redaktor nie może ustawić ról.
const newAccount = (who: string, roles?: Role[]) =>
  ({
    email: emailFor(who),
    name: `TEST users – usunąć (${RUN})`,
    password: randomUUID(),
    ...(roles ? { roles } : {}),
  }) as RequiredDataFromCollectionSlug<'users'>

describe('użytkownicy: uprawnienia w panelu (bez bazy)', () => {
  it('przycisk „Utwórz” w kolekcji użytkowników ma tylko administrator', async () => {
    const sanitized = await config
    const fakePayload = {
      collections: Object.fromEntries(
        sanitized.collections.map((collection) => [collection.slug, { config: collection }]),
      ),
      config: sanitized,
      globals: { config: sanitized.globals },
    }
    const canCreateUsers = async (user: TypedUser | null) => {
      const req = { context: {}, payload: fakePayload, user } as unknown as PayloadRequest
      return Boolean((await getAccessResults({ req })).collections?.users?.create)
    }

    expect(await canCreateUsers(admin)).toBe(true)
    expect(await canCreateUsers(editor)).toBe(false)
    expect(await canCreateUsers(null)).toBe(false)
  })
})

describe.skipIf(skipReason)('użytkownicy na stagingu: konta zakłada tylko administrator', () => {
  let payload: Payload

  const countByEmail = async (email: string) =>
    (
      await payload.count({
        collection: 'users',
        overrideAccess: true,
        where: { email: { equals: email } },
      })
    ).totalDocs

  beforeAll(async () => {
    const { getPayload } = await import('payload')
    payload = await getPayload({ config: (await import('@payload-config')).default })
  }, 120_000)

  afterAll(async () => {
    if (!payload) return
    try {
      await payload.delete({
        collection: 'users',
        overrideAccess: true,
        where: { email: { like: `-${RUN}@example.invalid` } },
      })
      const left = await payload.count({
        collection: 'users',
        overrideAccess: true,
        where: { email: { like: `-${RUN}@example.invalid` } },
      })
      expect(left.totalDocs).toBe(0)
    } finally {
      await payload.destroy()
    }
  }, 60_000)

  it.each([
    ['bez ról (jak formularz w panelu)', 'redaktor-bez-rol', undefined],
    ['z rolą administratora', 'redaktor-admin', ['admin'] as Role[]],
  ])('redaktor nie może założyć konta %s', async (_label, who, roles) => {
    await expect(
      payload.create({
        collection: 'users',
        data: newAccount(who, roles),
        overrideAccess: false,
        user: editor,
      }),
    ).rejects.toMatchObject({ status: 403 })
    expect(await countByEmail(emailFor(who))).toBe(0)
  })

  it('niezalogowany też nie może założyć konta', async () => {
    await expect(
      payload.create({
        collection: 'users',
        data: newAccount('gosc', ['editor']),
        overrideAccess: false,
      }),
    ).rejects.toMatchObject({ status: 403 })
    expect(await countByEmail(emailFor('gosc'))).toBe(0)
  })

  it('administrator zakłada konto redaktora', async () => {
    const created = await payload.create({
      collection: 'users',
      data: newAccount('admin-tworzy', ['editor']),
      overrideAccess: false,
      user: admin,
    })
    expect(created.email).toBe(emailFor('admin-tworzy'))
    expect(created.roles).toEqual(['editor'])
    expect(await countByEmail(emailFor('admin-tworzy'))).toBe(1)
  })
})
