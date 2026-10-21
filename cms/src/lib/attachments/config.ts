import path from 'node:path'

import { isStagingEnvironment } from '../staging-media'
import { localDiskStorage, vercelPrivateStorage, type AttachmentStorage } from './storage'

/**
 * Magazyn zdjęć od klientów (zmienne środowiskowe):
 * - `ATTACHMENTS_BLOB_STORE_ID` – **prywatny** magazyn Vercel Blob podłączony do projektu w panelu z przedrostkiem
 *   zmiennych `ATTACHMENTS_BLOB` (uwierzytelnienie OIDC funkcji, bez tokenu w zmiennych); albo
 *   `ATTACHMENTS_BLOB_READ_WRITE_TOKEN` – token takiego magazynu (pierwszeństwo, np. poza Vercelem).
 *   To osobny magazyn, nie ten od katalogu; bez niego zgłoszenia przychodzą bez zdjęć, a klient dostaje prośbę
 *   o przesłanie ich e-mailem,
 * - `ATTACHMENTS_STORAGE=local` – tylko lokalnie: pliki w `cms/.zalaczniki-lokalne/` (na Vercelu zablokowane).
 *
 * Przedrostek ścieżek rozdziela środowiska (staging/preview i produkcja mogą dzielić magazyn): sprzątanie
 * osieroconych plików patrzy tylko na swój przedrostek.
 */

export const ATTACHMENTS_PREFIX = {
  production: 'zgloszenia/',
  staging: 'zgloszenia-staging/',
} as const

export function attachmentsPrefix(): string {
  return isStagingEnvironment() ? ATTACHMENTS_PREFIX.staging : ATTACHMENTS_PREFIX.production
}

let cached: { key: string; storage: AttachmentStorage | null } | null = null

export function attachmentStorageFromEnv(
  env: Record<string, string | undefined> = process.env,
): AttachmentStorage | null {
  const token = env.ATTACHMENTS_BLOB_READ_WRITE_TOKEN?.trim()
  const storeId = env.ATTACHMENTS_BLOB_STORE_ID?.trim()
  const local = env.ATTACHMENTS_STORAGE?.trim() === 'local' && !env.VERCEL
  const key = `${token ?? ''}|${storeId ?? ''}|${local}`
  if (cached?.key === key) return cached.storage
  const storage = token
    ? vercelPrivateStorage({ token })
    : storeId
      ? vercelPrivateStorage({ storeId })
      : local
        ? localDiskStorage(path.resolve(process.cwd(), '.zalaczniki-lokalne'))
        : null
  cached = { key, storage }
  return storage
}
