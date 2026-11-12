/**
 * Jednorazowe ułożenie pierścionków na staging według tła zdjęcia głównego: najpierw złote tła, potem ciemne,
 * na końcu pozostałe (kamień, aksamit, pudełko, jasne). W każdej grupie zostaje dotychczasowa kolejność.
 * Karty archiwalne idą na sam koniec. Numery 0, 1, 2 … bez powtórzeń.
 *
 * Tło rozpoznaje automatycznie z pikseli (sharp): udział ciepłych, złotych pikseli, udział ciemnych i średnia jasność.
 * Progi dobrane na starych zdjęciach katalogu (data/legacy), gdzie dawały podział zgodny z oceną na oko.
 *
 *   npm run staging:kolejnosc-tla            pokazuje grupy i nową kolejność, nic nie zapisuje
 *   npm run staging:kolejnosc-tla -- --apply zapisuje; poprzednie numery idą do output/kolejnosc-tla-*.json
 *   npm run staging:kolejnosc-tla -- --cofnij output/kolejnosc-tla-XXXX.json   przywraca numery z kopii
 *
 * Działa tylko z NEON_BRANCH=staging.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { getPayload } from 'payload'
import sharp from 'sharp'

import config from '../src/payload.config'
import { writeSortOrder } from '../src/lib/sort-order'

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:kolejnosc-tla musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
}

const args = process.argv.slice(2)
const applyChanges = args.includes('--apply')
const undoIndex = args.indexOf('--cofnij')
const undoFile = undoIndex >= 0 ? args[undoIndex + 1] : undefined

type Group = 'złote' | 'ciemne' | 'inne'
const GROUP_ORDER: Group[] = ['złote', 'ciemne', 'inne']

type MediaDoc = { mimeType?: null | string; url?: null | string }
type Row = {
  archived?: boolean | null
  id: number
  media?: null | { asset?: MediaDoc | number | null; isPrimary?: boolean | null }[]
  name?: null | string
  sortOrder?: null | number
}

function primaryImage(row: Row): MediaDoc | undefined {
  const images = (row.media ?? [])
    .filter((item) => typeof item.asset === 'object' && item.asset?.mimeType?.startsWith('image/'))
    .map((item) => ({ asset: item.asset as MediaDoc, isPrimary: item.isPrimary }))
  return (images.find((item) => item.isPrimary) ?? images[0])?.asset
}

async function classify(url: string): Promise<{ group: Group; stats: string }> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const { data, info } = await sharp(Buffer.from(await response.arrayBuffer()))
    .removeAlpha()
    .resize(48, 48, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  let dark = 0
  let warm = 0
  let sumV = 0
  const n = info.width * info.height
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i] / 255
    const g = data[i + 1] / 255
    const b = data[i + 2] / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const v = max
    const s = max === 0 ? 0 : (max - min) / max
    let h = 0
    if (max !== min) {
      if (max === r) h = ((g - b) / (max - min) + 6) % 6
      else if (max === g) h = (b - r) / (max - min) + 2
      else h = (r - g) / (max - min) + 4
      h *= 60
    }
    sumV += v
    if (v < 0.22) dark += 1
    if (h >= 15 && h <= 50 && s > 0.4 && v > 0.3) warm += 1
  }
  const darkShare = dark / n
  const warmShare = warm / n
  const meanV = sumV / n
  const group: Group =
    warmShare >= 0.25 && darkShare < 0.5 ? 'złote' : meanV < 0.32 || darkShare >= 0.55 ? 'ciemne' : 'inne'
  return { group, stats: `złote ${warmShare.toFixed(2)}, ciemne ${darkShare.toFixed(2)}, jasność ${meanV.toFixed(2)}` }
}

const payload = await getPayload({ config: await config })
try {
  if (undoFile) {
    const saved = JSON.parse(readFileSync(undoFile, 'utf8')) as { id: number; name: string; sortOrder: number }[]
    for (const row of saved) await writeSortOrder(payload, row.id, row.sortOrder)
    console.log(`Przywrócone numery ${saved.length} kart z ${undoFile}.`)
  } else {
    const found = await payload.find({
      collection: 'products',
      depth: 1,
      draft: false,
      pagination: false,
      overrideAccess: true,
      select: { archived: true, media: true, name: true, sortOrder: true },
    })
    const rows = (found.docs as unknown as Row[]).sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id,
    )

    const groups = new Map<Group | 'archiwum', Row[]>([...GROUP_ORDER.map((g) => [g, []] as [Group, Row[]]), ['archiwum', []]])
    for (const row of rows) {
      if (row.archived) {
        groups.get('archiwum')!.push(row)
        continue
      }
      const image = primaryImage(row)
      let group: Group = 'inne'
      let note = 'brak zdjęcia'
      if (image?.url) {
        try {
          const result = await classify(image.url)
          group = result.group
          note = result.stats
        } catch (error) {
          note = `nie udało się pobrać zdjęcia (${(error as Error).message})`
        }
      }
      groups.get(group)!.push(row)
      console.log(`${group.padEnd(6)} ${String(row.name).padEnd(14)} ${note}`)
    }

    const ordered = [...groups.values()].flat()
    console.log('\nNowa kolejność:')
    for (const [label, list] of groups) console.log(`  ${label} (${list.length}): ${list.map((r) => r.name).join(', ')}`)

    if (!applyChanges) console.log('\nSprawdzenie, nic nie zapisane. Zapis: npm run staging:kolejnosc-tla -- --apply')
    else {
      const dir = path.resolve(process.cwd(), '..', 'output')
      mkdirSync(dir, { recursive: true })
      const backup = path.join(dir, `kolejnosc-tla-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
      writeFileSync(backup, JSON.stringify(rows.map((r) => ({ id: r.id, name: r.name, sortOrder: r.sortOrder ?? 0 })), null, 2))
      let changed = 0
      for (const [index, row] of ordered.entries()) {
        if (row.sortOrder === index) continue
        await writeSortOrder(payload, row.id, index)
        changed += 1
      }
      console.log(`\nZapisane: ${changed} kart. Kopia poprzednich numerów: ${backup}`)
      console.log(`Cofnięcie: npm run staging:kolejnosc-tla -- --cofnij ${backup}`)
    }
  }
} finally {
  await payload.destroy()
}
process.exit(process.exitCode ?? 0)
