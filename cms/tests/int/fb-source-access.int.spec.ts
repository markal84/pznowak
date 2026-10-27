import {
  afterReadTraverseFields,
  getAccessResults,
  validateQueryPaths,
  type PayloadRequest,
  type SanitizedCollectionConfig,
  type Where,
} from 'payload'
import { describe, expect, it } from 'vitest'

import config from '@/payload.config'

/**
 * Grupa `source` pierścionka (klucz karty z przeglądu FB, notatki i posty źródłowe) to dane robocze:
 * niezalogowany odwiedzający nie może ich dostać przez REST/GraphQL ani po nich filtrować,
 * a zalogowany admin/editor i skrypt importu (Local API, overrideAccess) widzą je jak dotąd.
 *
 * Bez bazy: test przepuszcza dokument przez ten sam etap odczytu Payloada (afterRead z kontrolą
 * dostępu do pól), którego używają find/findByID w REST, GraphQL i Local API.
 */

const sanitized = await config
const products = sanitized.collections.find(
  (collection) => collection.slug === 'products',
) as SanitizedCollectionConfig

const fakePayload = {
  collections: Object.fromEntries(
    sanitized.collections.map((collection) => [collection.slug, { config: collection }]),
  ),
  config: sanitized,
  globals: { config: sanitized.globals },
}

type TestUser = null | { collection: 'users'; id: number; roles: Array<'admin' | 'editor'> }

const anonymous: TestUser = null
const editor: TestUser = { collection: 'users', id: 2, roles: ['editor'] }
const admin: TestUser = { collection: 'users', id: 1, roles: ['admin'] }

const makeReq = (user: TestUser) =>
  ({
    context: {},
    payload: fakePayload,
    payloadAPI: 'REST',
    user,
  }) as unknown as PayloadRequest

const storedProduct = () => ({
  _status: 'published',
  id: 42,
  legacy: { sourcePayload: { wpTitle: 'Stary wpis 777' }, wordpressId: 777 },
  name: 'Morganit z diamentami',
  slug: 'morganit-z-diamentami',
  sortOrder: 1,
  source: {
    facebookKey: 'morganit@111',
    facebookPayload: { importRun: 'run-1', posts: [{ text: 'post' }] },
  },
})

async function readAs(user: TestUser, { overrideAccess = false } = {}) {
  const doc: Record<string, unknown> = storedProduct()
  const fieldPromises: Promise<void>[] = []
  const populationPromises: Promise<void>[] = []
  afterReadTraverseFields({
    collection: products,
    context: {},
    currentDepth: 1,
    depth: 0,
    doc,
    draft: false,
    fallbackLocale: null,
    fieldPromises,
    fields: products.fields,
    findMany: true,
    flattenLocales: true,
    global: null,
    locale: null,
    overrideAccess,
    parentIndexPath: '',
    parentPath: '',
    parentSchemaPath: '',
    populationPromises,
    req: makeReq(user),
    showHiddenFields: false,
    siblingDoc: doc,
  })
  while (fieldPromises.length || populationPromises.length) {
    await Promise.all(fieldPromises.splice(0))
    await Promise.all(populationPromises.splice(0))
  }
  return doc
}

async function queryErrors(user: TestUser, where: Where) {
  const errors: { path: string }[] = []
  await validateQueryPaths({
    collectionConfig: products,
    errors,
    overrideAccess: false,
    req: makeReq(user),
    where,
  }).catch(() => undefined)
  return errors.map((error) => error.path)
}

describe('pierścionki: dane robocze (source z FB, legacy.sourcePayload ze starego katalogu)', () => {
  it('niezalogowany nie dostaje grupy source (facebookKey ani facebookPayload)', async () => {
    const doc = await readAs(anonymous)
    expect(doc.name).toBe('Morganit z diamentami')
    expect(doc).not.toHaveProperty('source')
    expect(JSON.stringify(doc)).not.toContain('morganit@111')
  })

  it('zalogowany editor i admin widzą source jak dotąd', async () => {
    for (const user of [editor, admin]) {
      const doc = await readAs(user)
      expect(doc.source).toEqual(storedProduct().source)
    }
  })

  it('niezalogowany nie dostaje legacy.sourcePayload, ale legacy.wordpressId zostaje publiczne', async () => {
    const doc = (await readAs(anonymous)) as { legacy?: Record<string, unknown> }
    expect(doc.legacy?.wordpressId).toBe(777)
    expect(doc.legacy).not.toHaveProperty('sourcePayload')
    expect(JSON.stringify(doc)).not.toContain('Stary wpis 777')
  })

  it('editor, admin i import (overrideAccess) widzą legacy.sourcePayload', async () => {
    const expected = storedProduct().legacy
    for (const user of [editor, admin]) {
      expect((await readAs(user)).legacy).toEqual(expected)
    }
    expect((await readAs(anonymous, { overrideAccess: true })).legacy).toEqual(expected)
  })

  it('niezalogowany nie może filtrować po legacy.sourcePayload, po wordpressId może', async () => {
    const where = { 'legacy.sourcePayload': { exists: true } } as Where
    expect(await queryErrors(anonymous, where)).toEqual(['legacy.sourcePayload'])
    expect(await queryErrors(editor, where)).toEqual([])
    expect(await queryErrors(anonymous, { 'legacy.wordpressId': { equals: 777 } })).toEqual([])
  })

  it('import przez Local API z overrideAccess dalej widzi klucz (idempotencja)', async () => {
    const doc = (await readAs(anonymous, { overrideAccess: true })) as {
      source?: { facebookKey?: string }
    }
    expect(doc.source?.facebookKey).toBe('morganit@111')
  })

  it('niezalogowany nie może filtrować po kluczu FB (bez sprawdzania, czy istnieje)', async () => {
    expect(
      await queryErrors(anonymous, { 'source.facebookKey': { equals: 'morganit@111' } }),
    ).toEqual(['source.facebookKey'])
    expect(await queryErrors(editor, { 'source.facebookKey': { equals: 'morganit@111' } })).toEqual(
      [],
    )
    expect(await queryErrors(anonymous, { slug: { equals: 'morganit-z-diamentami' } })).toEqual([])
  })

  it('uprawnienia w panelu: editor czyta i zapisuje source, niezalogowany nie czyta', async () => {
    // Payload skraca `fields` do `true`, gdy użytkownik ma pełny dostęp do wszystkich pól.
    const sourcePermission = async (user: TestUser, operation: 'create' | 'read' | 'update') => {
      const permissions = (await getAccessResults({ req: makeReq(user) })).collections?.products
      const fields = permissions?.fields as
        Record<string, Partial<Record<string, unknown>>> | true | undefined
      if (fields === true) return Boolean(permissions?.[operation])
      return Boolean(fields?.source?.[operation])
    }

    for (const user of [editor, admin]) {
      expect(await sourcePermission(user, 'read')).toBe(true)
      expect(await sourcePermission(user, 'create')).toBe(true)
      expect(await sourcePermission(user, 'update')).toBe(true)
    }
    expect(await sourcePermission(anonymous, 'read')).toBe(false)
    expect(await sourcePermission(anonymous, 'update')).toBe(false)
  })

  it('uprawnienia w panelu: legacy.sourcePayload czyta editor, niezalogowany nie', async () => {
    const legacyReadable = async (user: TestUser) => {
      const permissions = (await getAccessResults({ req: makeReq(user) })).collections?.products
      const fields = permissions?.fields as
        Record<string, { fields?: Record<string, { read?: unknown }> }> | true | undefined
      if (fields === true) return Boolean(permissions?.read)
      return Boolean(fields?.legacy?.fields?.sourcePayload?.read)
    }
    expect(await legacyReadable(editor)).toBe(true)
    expect(await legacyReadable(admin)).toBe(true)
    expect(await legacyReadable(anonymous)).toBe(false)
  })
})
