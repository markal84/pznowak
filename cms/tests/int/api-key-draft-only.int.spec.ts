import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  apiKeyDraftOnlyBeforeChange,
  apiKeyDraftOnlyBeforeOperation,
  isApiKeyRequest,
} from '@/lib/api-key-draft-only'

const reqWith = (user: unknown) => ({ user }) as unknown as PayloadRequest
const apiKeyReq = reqWith({ id: 1, roles: ['editor'], _strategy: 'api-key' })
const panelReq = reqWith({ id: 2, roles: ['editor'], _strategy: 'local-jwt' })

const runOp = (operation: string, req: PayloadRequest, args: Record<string, unknown>) =>
  apiKeyDraftOnlyBeforeOperation({
    args,
    collection: {} as never,
    context: {},
    operation,
    req,
  } as never)

const runChange = (req: PayloadRequest, data: Record<string, unknown>) =>
  apiKeyDraftOnlyBeforeChange({
    data,
    req,
    collection: {} as never,
    context: {},
    operation: 'update',
  } as never)

describe('klucz API zapisuje tylko szkice', () => {
  it('rozpoznaje strategię api-key, a sesji z panelu i braku użytkownika nie', () => {
    expect(isApiKeyRequest(apiKeyReq)).toBe(true)
    expect(isApiKeyRequest(panelReq)).toBe(false)
    expect(isApiKeyRequest(reqWith(null))).toBe(false)
    expect(isApiKeyRequest(undefined)).toBe(false)
  })

  it('wymusza draft: true przy create i update kluczem API', () => {
    expect(runOp('create', apiKeyReq, { draft: false, data: {} })).toMatchObject({ draft: true })
    expect(runOp('update', apiKeyReq, { data: {} })).toMatchObject({ draft: true })
  })

  it('blokuje przywracanie wersji kluczem API', () => {
    expect(() => runOp('restoreVersion', apiKeyReq, {})).toThrow(/przywracać/)
  })

  it('nie rusza zapisów z panelu', () => {
    const args = { draft: false, data: {} }
    expect(runOp('update', panelReq, args)).toBe(args)
    expect(runOp('restoreVersion', panelReq, args)).toBe(args)
  })

  it('zamienia _status: published na draft tylko dla klucza API', () => {
    expect(runChange(apiKeyReq, { _status: 'published', name: 'A' })).toEqual({
      _status: 'draft',
      name: 'A',
    })
    expect(runChange(panelReq, { _status: 'published' })).toEqual({ _status: 'published' })
  })
})
