// Sprzątanie serwera: usuwanie katalogów postów starszych niż RETENTION_DAYS.
// Domyślnie tylko takich, które zostały już skopiowane na Maca (skrypt mac/kopia-na-maca.sh po udanej kopii
// zapisuje na serwerze plik BACKUP_MARKER z czasem rozpoczęcia kopii).
import { readFile, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { formatDateTime, plural } from './mail.mjs'
import { POSTS_DIR } from './store.mjs'

export const BACKUP_MARKER = '.kopia-na-maca'
const DAY = 864e5

/** Czas rozpoczęcia ostatniej udanej kopii na Maca (Date) albo null, gdy kopii jeszcze nie było. */
export async function readBackupTime(dataDir) {
  const file = path.join(dataDir, BACKUP_MARKER)
  const text = await readFile(file, 'utf8').catch(() => null)
  if (text === null) return null
  const secs = Number(text.trim())
  if (Number.isFinite(secs) && secs > 1e9) return new Date(secs * 1000)
  const s = await stat(file).catch(() => null)
  return s ? s.mtime : null
}

/**
 * Wybiera i (poza trybem na sucho) usuwa stare katalogi postów.
 * Zwraca { removed: [folder], waiting: liczba starych czekających na kopię, notice: ostrzeżenie albo null, backupAt }.
 */
export async function pruneOld(cfg, state, now, { dryRun = false, log = () => {} } = {}) {
  const out = { removed: [], waiting: 0, notice: null, backupAt: null }
  if (!(cfg.retentionDays > 0)) return out
  const backupAt = cfg.retentionNeedsBackup ? await readBackupTime(cfg.dataDir) : null
  out.backupAt = backupAt
  const cutoff = now.getTime() - cfg.retentionDays * DAY
  let oldestWaiting = null

  for (const [key, rec] of Object.entries(state.items)) {
    if (!rec.folder || rec.removedAt || rec.status === 'pending' || rec.status === 'duplicate') continue
    const created = new Date(rec.createdTime).getTime()
    if (!(created < cutoff)) continue
    if (cfg.retentionNeedsBackup) {
      const saved = new Date(rec.savedAt || rec.firstSeenAt || rec.createdTime).getTime()
      if (!backupAt || !(saved < backupAt.getTime())) {
        out.waiting++
        if (oldestWaiting === null || created < oldestWaiting) oldestWaiting = created
        continue
      }
    }
    out.removed.push(rec.folder)
    if (dryRun) continue
    const dir = path.join(cfg.dataDir, POSTS_DIR, rec.folder)
    if (path.dirname(dir) !== path.join(cfg.dataDir, POSTS_DIR)) continue // nazwa katalogu zawsze bez „/”, ale na wszelki wypadek
    await rm(dir, { recursive: true, force: true })
    rec.removedAt = now.toISOString()
    const prefix = path.join(POSTS_DIR, rec.folder) + path.sep
    for (const [id, rel] of Object.entries(state.media)) if (rel.startsWith(prefix)) delete state.media[id]
    log(`${rec.folder}: usunięty z serwera (starszy niż ${cfg.retentionDays} dni${cfg.retentionNeedsBackup ? ', jest już na Macu' : ''}) [${key}]`)
  }

  if (cfg.retentionNeedsBackup && cfg.backupWarnDays > 0 && oldestWaiting !== null) {
    const overdueDays = (cutoff - oldestWaiting) / DAY
    if (overdueDays >= cfg.backupWarnDays) {
      const last = backupAt ? `ostatnia udana kopia: ${formatDateTime(backupAt.toISOString(), cfg.timezone)}` : 'kopii jeszcze nie było'
      out.notice = {
        scope: 'kopia na Maca',
        kind: 'backup-warning',
        message: `${out.waiting} ${plural(out.waiting, 'stary post czeka', 'stare posty czekają', 'starych postów czeka')} na skopiowanie na Maca, więc nie usuwam ich z serwera (${last}). Sprawdź, czy Mac był włączony i czy działa kopia (README, sekcja „Kopia na Maca”).`,
      }
    }
  }
  return out
}
