/**
 * Magazyn zdjęć i filmów katalogu (kolekcja `media`). Przełącznik: zmienna `MEDIA_STORAGE`.
 *
 * - `vercel-blob` (domyślnie, także gdy zmienna jest pusta): publiczny magazyn Vercel Blob, `BLOB_READ_WRITE_TOKEN`.
 * - `r2`: Cloudflare R2 przez API S3. Wymaga kompletu: `R2_ENDPOINT` (`https://<konto>.r2.cloudflarestorage.com`),
 *   `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_URL` (publiczna domena bucketu,
 *   np. `https://media.pznowak.pl`). Opcjonalnie `R2_CLIENT_UPLOADS=1`: przeglądarka wysyła plik prosto do R2
 *   (wymaga reguły CORS bucketu dla adresu strony); bez tego plik idzie przez serwer aplikacji.
 *
 * Adres pliku jest wyliczany przy każdym odczycie z `prefix` + `filename` (nie z kolumny `url` w bazie), więc po
 * skopiowaniu plików pod tymi samymi kluczami zmiana magazynu to zmiana zmiennej i ponowne zbudowanie aplikacji.
 * Powrót: `MEDIA_STORAGE=vercel-blob`. Pliki dodane w panelu trafiają tylko do aktualnie wybranego magazynu.
 */

export type MediaStorageKind = 'vercel-blob' | 'r2'

export type R2Settings = {
  endpoint: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  publicUrl: string
  clientUploads: boolean
}

type Env = Record<string, string | undefined>

export function mediaStorageKind(env: Env = process.env): MediaStorageKind {
  const value = env.MEDIA_STORAGE?.trim().toLowerCase()
  if (!value || value === 'vercel-blob') return 'vercel-blob'
  if (value === 'r2') return 'r2'
  throw new Error(`Nieznana wartość MEDIA_STORAGE: "${value}" (dozwolone: vercel-blob, r2)`)
}

export function r2SettingsFromEnv(env: Env = process.env): R2Settings {
  const required = (name: string): string => {
    const value = env[name]?.trim()
    if (!value) throw new Error(`MEDIA_STORAGE=r2 wymaga zmiennej ${name}`)
    return value
  }
  const publicUrl = required('R2_PUBLIC_URL').replace(/\/+$/, '')
  if (!/^https:\/\/[^/]+$/.test(publicUrl)) {
    throw new Error('R2_PUBLIC_URL ma być adresem https bez ścieżki, np. https://media.pznowak.pl')
  }
  return {
    endpoint: required('R2_ENDPOINT').replace(/\/+$/, ''),
    bucket: required('R2_BUCKET'),
    accessKeyId: required('R2_ACCESS_KEY_ID'),
    secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    publicUrl,
    clientUploads: ['1', 'true'].includes(env.R2_CLIENT_UPLOADS?.trim().toLowerCase() ?? ''),
  }
}

/** Publiczny adres pliku w R2: ten sam klucz co w Vercel Blob (`prefix/nazwa`), nazwa pliku zakodowana do URL. */
export function r2FileUrl(publicUrl: string, prefix: string | undefined, filename: string): string {
  const folder = (prefix ?? '').replace(/^\/+|\/+$/g, '')
  const key = [...(folder ? folder.split('/') : []), encodeURIComponent(filename)].join('/')
  return `${publicUrl.replace(/\/+$/, '')}/${key}`
}
