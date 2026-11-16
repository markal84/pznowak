// Która baza to żywa strona? Rozpoznajemy po endpoincie Neon w adresie bazy, nie po nazwie gałęzi ani pliku .env:
// nazwy się zmieniają („staging” był żywą bazą, „production” archiwum; zob. scripts/backup/README.md), endpoint nie.
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { parse } from 'dotenv'

export const LIVE_ENDPOINT = 'ep-nameless-butterfly'

const hostOf = (url?: string) => {
  try {
    return new URL(url ?? '').hostname
  } catch {
    return ''
  }
}

export const isLiveDatabase = (url = process.env.DATABASE_URL) => hostOf(url).startsWith(LIVE_ENDPOINT)

/** Wczytuje do process.env cms/.env, cms/.env.local i ten plik backend/.env*.local, który wskazuje żywą bazę. */
export async function loadLiveEnv(envRoot: string): Promise<string> {
  for (const file of ['cms/.env', 'cms/.env.local']) {
    Object.assign(process.env, parse(await readFile(path.join(envRoot, file)).catch(() => Buffer.from(''))))
  }
  for (const file of ['backend/.env.production.local', 'backend/.env.staging.local', 'backend/.env.local']) {
    const vars = parse(await readFile(path.join(envRoot, file)).catch(() => Buffer.from('')))
    if (isLiveDatabase(vars.DATABASE_URL)) {
      Object.assign(process.env, vars)
      return file
    }
  }
  throw new Error(`Żaden backend/.env*.local nie wskazuje żywej bazy (endpoint ${LIVE_ENDPOINT})`)
}
