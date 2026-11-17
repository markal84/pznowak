import type { CollectionBeforeOperationHook, CollectionBeforeChangeHook, PayloadRequest } from 'payload'

/**
 * Konto „Automat” (rola Redaktor, klucz API) może tylko przygotowywać szkice.
 * Publikacja zostaje po stronie człowieka zalogowanego w panelu.
 *
 * Payload 3 oznacza użytkownika uwierzytelnionego kluczem API przez `user._strategy === 'api-key'`
 * (packages/payload/src/auth/strategies/apiKey.ts). Sesja z panelu ma inną strategię (`local-jwt`).
 * Reguła nie zmienia schematu bazy ani migracji.
 */
export const isApiKeyRequest = (req: Pick<PayloadRequest, 'user'> | undefined): boolean =>
  (req?.user as { _strategy?: string } | null | undefined)?._strategy === 'api-key'

/**
 * Wymusza `draft: true` w create/update: zapis idzie do wersji roboczej, a opublikowana wersja zostaje nietknięta.
 * Przywracanie wersji kluczem API jest zablokowane, bo mogłoby opublikować starą wersję.
 */
export const apiKeyDraftOnlyBeforeOperation: CollectionBeforeOperationHook = ({
  args,
  operation,
  req,
}) => {
  if (!isApiKeyRequest(req)) return args

  if (operation === 'restoreVersion') {
    throw new Error('Konto z kluczem API nie może przywracać wersji. Zrób to ręcznie w panelu.')
  }

  if (operation === 'create' || operation === 'update') {
    return { ...args, draft: true }
  }

  return args
}

/** Druga zapora: nawet jeśli w danych jest `_status: 'published'`, klucz API zapisze szkic. */
export const apiKeyDraftOnlyBeforeChange: CollectionBeforeChangeHook = ({ data, req }) => {
  if (!isApiKeyRequest(req)) return data
  return { ...data, _status: 'draft' }
}
