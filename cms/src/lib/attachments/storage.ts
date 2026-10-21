import { del, get, list, put } from '@vercel/blob'
import { getVercelOidcToken } from '@vercel/oidc'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Magazyn zdjęć od klientów. Na Vercelu: osobny, **prywatny** magazyn Vercel Blob (każdy odczyt wymaga
 * uwierzytelnienia, pliki nie mają publicznego adresu). Zdjęcia w panelu pokazuje serwer po sprawdzeniu logowania
 * (`/api/zgloszenia/zalaczniki/[id]`). Publiczny magazyn katalogu (`BLOB_READ_WRITE_TOKEN`) nie jest używany:
 * każde wywołanie dostaje jawnie token albo parę OIDC + identyfikator magazynu, więc SDK nigdy nie sięgnie
 * po token katalogu z otoczenia.
 *
 * Lokalnie (bez tokenu) można włączyć katalog na dysku (`ATTACHMENTS_STORAGE=local`); na Vercelu ta opcja
 * jest zablokowana. Testy używają magazynu w pamięci.
 */

export type StoredObject = { pathname: string; uploadedAt: Date }

export interface AttachmentStorage {
  readonly name: string
  put(pathname: string, body: Buffer, contentType: string): Promise<void>
  /** `null`, gdy pliku nie ma. */
  get(pathname: string): Promise<{ body: ReadableStream<Uint8Array>; size: number } | null>
  del(pathnames: string[]): Promise<void>
  list(prefix: string): AsyncIterable<StoredObject>
}

/**
 * Dostęp do prywatnego magazynu: token odczytu i zapisu (`ATTACHMENTS_BLOB_READ_WRITE_TOKEN`) albo magazyn
 * podłączony do projektu w panelu Vercela (`ATTACHMENTS_BLOB_STORE_ID`, uwierzytelnienie OIDC funkcji).
 */
export type BlobCredentials = { token: string } | { storeId: string }

async function blobAuth(
  credentials: BlobCredentials,
): Promise<{ token: string } | { oidcToken: string; storeId: string }> {
  if ('token' in credentials) return { token: credentials.token }
  // Bez tokenu OIDC wyjątek (a nie cichy powrót SDK do BLOB_READ_WRITE_TOKEN publicznego magazynu katalogu).
  return { oidcToken: await getVercelOidcToken(), storeId: credentials.storeId }
}

export function vercelPrivateStorage(credentials: BlobCredentials): AttachmentStorage {
  return {
    name: 'vercel-blob-private',
    async put(pathname, body, contentType) {
      await put(pathname, body, {
        access: 'private',
        ...(await blobAuth(credentials)),
        contentType,
        addRandomSuffix: false,
        allowOverwrite: false,
        // Kopia w pamięci podręcznej między funkcją a magazynem żyje krótko, żeby usunięcie (RODO) działało od razu.
        cacheControlMaxAge: 60,
      })
    },
    async get(pathname) {
      const result = await get(pathname, {
        access: 'private',
        ...(await blobAuth(credentials)),
        useCache: false,
      })
      if (!result || result.statusCode !== 200) return null
      return { body: result.stream, size: result.blob.size }
    },
    async del(pathnames) {
      if (pathnames.length) await del(pathnames, await blobAuth(credentials))
    },
    async *list(prefix) {
      let cursor: string | undefined
      do {
        const page = await list({ prefix, cursor, limit: 1000, ...(await blobAuth(credentials)) })
        for (const blob of page.blobs)
          yield { pathname: blob.pathname, uploadedAt: blob.uploadedAt }
        cursor = page.hasMore ? page.cursor : undefined
      } while (cursor)
    },
  }
}

/** Katalog na dysku do pracy lokalnej (`next dev` / `next start`), nigdy na Vercelu. */
export function localDiskStorage(root: string): AttachmentStorage {
  if (process.env.VERCEL) throw new Error('Magazyn na dysku jest tylko do pracy lokalnej.')
  const resolve = (pathname: string) => {
    const full = path.resolve(root, pathname)
    if (!full.startsWith(path.resolve(root) + path.sep))
      throw new Error('Nieprawidłowa ścieżka pliku.')
    return full
  }
  return {
    name: 'local-disk',
    async put(pathname, body) {
      const file = resolve(pathname)
      await mkdir(path.dirname(file), { recursive: true })
      await writeFile(file, body, { flag: 'wx' })
    },
    async get(pathname) {
      try {
        const data = await readFile(resolve(pathname))
        return { body: new Blob([new Uint8Array(data)]).stream(), size: data.length }
      } catch {
        return null
      }
    },
    async del(pathnames) {
      await Promise.all(pathnames.map((p) => rm(resolve(p), { force: true })))
    },
    async *list(prefix) {
      const base = resolve(prefix)
      const walk = async function* (dir: string): AsyncGenerator<StoredObject> {
        let entries
        try {
          entries = await readdir(dir, { withFileTypes: true })
        } catch {
          return
        }
        for (const entry of entries) {
          const full = path.join(dir, entry.name)
          if (entry.isDirectory()) yield* walk(full)
          else
            yield {
              pathname: path.relative(path.resolve(root), full).split(path.sep).join('/'),
              uploadedAt: (await stat(full)).mtime,
            }
        }
      }
      yield* walk(base)
    },
  }
}

/** Magazyn w pamięci dla testów. */
export function memoryStorage(): AttachmentStorage & {
  objects: Map<string, { body: Buffer; contentType: string; uploadedAt: Date }>
} {
  const objects = new Map<string, { body: Buffer; contentType: string; uploadedAt: Date }>()
  return {
    name: 'memory',
    objects,
    async put(pathname, body, contentType) {
      if (objects.has(pathname)) throw new Error('Plik już istnieje.')
      objects.set(pathname, { body, contentType, uploadedAt: new Date() })
    },
    async get(pathname) {
      const object = objects.get(pathname)
      if (!object) return null
      return { body: new Blob([new Uint8Array(object.body)]).stream(), size: object.body.length }
    },
    async del(pathnames) {
      pathnames.forEach((p) => objects.delete(p))
    },
    async *list(prefix) {
      for (const [pathname, object] of objects)
        if (pathname.startsWith(prefix)) yield { pathname, uploadedAt: object.uploadedAt }
    },
  }
}
