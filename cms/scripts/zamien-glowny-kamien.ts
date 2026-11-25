// Zamiana kamienia głównego karty z wariantem, który ma prawdziwe zdjęcia (np. Cyane: szmaragd zamiast niebieskiego diamentu).
//
//   npm run zamien:glowny -- --slug cyane --wariant "Szmaragd i diamenty" --kamien "Szmaragd, Diament" --stary "Diament niebieski"
//   … --apply                 zapis jako WERSJA ROBOCZA żywej bazy (wymaga wpisania PRODUKCJA); publikuje Marcin w panelu
//   … --rollback <plik.json>  przywraca kartę sprzed przebiegu (też jako wersja robocza)
//
// Co się dzieje:
//   - galeria karty („Zdjęcia i filmy”) = zdjęcia wariantu (pierwsze główne), wariant znika z listy,
//   - dotychczasowa galeria (zdjęcia i film) staje się wariantem „--stary” (kółko z nazwy kamienia, prawdziwe zdjęcia),
//     w miejscu, gdzie był zamieniany wariant,
//   - pole „Kamień” = --kamien; „Masa / karaty” traci masę kamienia centralnego (zostaje to, co po „+”, np. „diamenty 0,25 ct”),
//   - w opisie zdanie „Na zdjęciach … w centrum jest …” i lista kamieni na końcu dostają nowy kamień, jeśli da się je znaleźć;
//     reszta tekstu bez zmian. Co nie zostało zmienione, skrypt wypisuje do sprawdzenia w panelu.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import readline from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

import { guessSwatch } from '../src/lib/stone-variants'
import { confirmedOnBoard, isLiveDatabase, loadLiveEnv } from './live-db'

const args = process.argv.slice(2)
const option = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const apply = args.includes('--apply')
const rollbackFile = option('--rollback')
const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const dataDir = path.join(repoRoot, 'data/facebook')

await loadLiveEnv(repoRoot)
if (!isLiveDatabase()) throw new Error('Zmienne nie wskazują żywej bazy')
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config: await config })
const context = { skipFrontendRevalidation: true }

async function confirm() {
  if (confirmedOnBoard()) return
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await rl.question('Zapis do ŻYWEJ bazy (tylko wersja robocza). Wpisz PRODUKCJA, aby kontynuować: ')
  rl.close()
  if (answer.trim() !== 'PRODUKCJA') throw new Error('Przerwano: brak potwierdzenia')
}

const idOf = (x: unknown) => (x && typeof x === 'object' ? (x as { id: number }).id : (x as number))
const norm = (s: string) => s.trim().toLowerCase().normalize('NFC')

if (rollbackFile) {
  const log = JSON.parse(await readFile(path.resolve(dataDir, rollbackFile), 'utf8'))
  console.log(`Cofnięcie zamiany ${log.at} w karcie #${log.id} (${log.slug})`)
  if (!apply) process.exit(console.log('Na sucho. Dodaj --apply, żeby cofnąć.') ?? 0)
  await confirm()
  await payload.update({ collection: 'products', context, data: log.before, draft: true, id: log.id, overrideAccess: true })
  console.log('  ↺ przywrócona poprzednia treść (wersja robocza)')
  process.exit(0)
}

const slug = option('--slug')
const variantName = option('--wariant')
const newStone = option('--kamien')
const oldName = option('--stary')
if (!slug || !variantName || !newStone || !oldName) throw new Error('Podaj --slug, --wariant, --kamien i --stary')

const found = await payload.find({ collection: 'products', depth: 0, draft: true, limit: 1, overrideAccess: true, where: { slug: { equals: slug } } })
const p = found.docs[0]
if (!p) throw new Error(`Nie ma karty ${slug}`)
const variants = p.stoneVariants ?? []
const i = variants.findIndex((v) => norm(v.stone ?? '') === norm(variantName))
if (i < 0) throw new Error(`Karta nie ma wariantu „${variantName}” (są: ${variants.map((v) => v.stone).join(', ')})`)
const v = variants[i]
if (v.isVisualization) throw new Error(`Wariant „${variantName}” ma tylko wizualizację – zamieniam tylko prawdziwe zdjęcia`)

const media = p.media ?? []
// depth 0: typ pliku trzeba doczytać
const assets = await payload.find({ collection: 'media', depth: 0, limit: 100, overrideAccess: true, where: { id: { in: media.map((m) => idOf(m.asset)) } } })
const mime = new Map(assets.docs.map((d) => [d.id, d.mimeType ?? '']))
const oldPhotos = media.filter((m) => !mime.get(idOf(m.asset))?.startsWith('video/')).map((m) => idOf(m.asset))
const oldVideo = media.find((m) => mime.get(idOf(m.asset))?.startsWith('video/'))

const newIds = [idOf(v.image), ...(v.moreImages ?? []).map(idOf)].filter(Boolean)
const altBase = `${p.name} – ${variantName.replace(/ i diamenty$/i, '').toLowerCase()}`
const nextMedia = newIds.map((id, j) => ({ asset: id, isPrimary: j === 0, alt: `${altBase} – zdjęcie ${j + 1}` }))
if (v.video) nextMedia.push({ asset: idOf(v.video), isPrimary: false, alt: `${altBase} – film` })

const swatch = guessSwatch(oldName)
if (!swatch) throw new Error(`Z nazwy „${oldName}” nie umiem dobrać koloru kółka`)
const oldAlt = `${p.name} – ${oldName.toLowerCase()}`
const oldVariant: Record<string, unknown> = {
  alt: oldAlt, image: oldPhotos[0], isVisualization: false, moreImages: oldPhotos.slice(1), stone: oldName, swatch,
  ...(oldVideo ? { video: idOf(oldVideo.asset) } : {}),
}
const nextVariants = variants.map((x, j) => (j === i ? oldVariant : x))

const check: string[] = []
const carats = p.carats ?? ''
const nextCarats = carats.includes('+') ? carats.split('+').slice(1).join('+').trim() : ''
check.push(`masa: „${carats}” → „${nextCarats}” (masy nowego kamienia centralnego nie znam – dopisz, jeśli ma być)`)
const newWord = variantName.replace(/ i diamenty$/i, '').toLowerCase()
let desc = p.description ?? ''
const centre = /(Na zdjęciach[^.]*? w centrum jest )([^.]+)\./
const m = desc.match(centre)
let oldWord = ''
if (m) {
  oldWord = m[2].trim()
  desc = desc.replace(centre, `Na zdjęciach w centrum jest ${newWord}.`)
} else check.push('opis: nie znalazłam zdania „Na zdjęciach … w centrum jest …” – popraw ręcznie')
const listRe = /(także z )([^.]+)( w centrum)/
const lm = desc.match(listRe)
if (lm && oldWord) {
  const inst: Record<string, string> = { szmaragd: 'szmaragdem', rubin: 'rubinem', szafir: 'szafirem', 'niebieski diament': 'niebieskim diamentem' }
  const from = inst[newWord] ?? ''
  const to = inst[oldWord] ?? ''
  if (from && to && lm[2].includes(from)) desc = desc.replace(lm[0], `${lm[1]}${lm[2].replace(from, to)}${lm[3]}`)
  else check.push(`opis: lista kamieni na końcu bez zmian („${lm[2]}”) – sprawdź`)
}
if (v.video == null && oldVideo) check.push('film: dotychczasowy film przechodzi do wariantu; galeria karty zostaje bez filmu')

console.log(`Karta #${p.id} ${p.name} (${p._status === 'published' ? 'opublikowana → nowa wersja robocza' : 'wersja robocza'})`)
console.log(`  galeria: ${oldPhotos.length} zdj.${oldVideo ? ' + film' : ''} → ${newIds.length} zdj. wariantu „${variantName}”${v.video ? ' + film' : ''}`)
console.log(`  wariant „${variantName}” → „${oldName}” (kółko: ${swatch}), ${oldPhotos.length} zdj.${oldVideo ? ' + film' : ''}`)
console.log(`  kamień: „${p.stone}” → „${newStone}”`)
if (desc !== p.description) console.log(`  opis po zmianie:\n${desc.replace(/^/gm, '    ')}`)
for (const c of check) console.log(`  ? ${c}`)
if (!apply) process.exit(console.log('\nNa sucho. Dodaj --apply, żeby zapisać wersję roboczą.') ?? 0)
await confirm()
const before = { carats: p.carats, description: p.description, media: p.media, stone: p.stone, stoneVariants: variants }
const at = new Date().toISOString()
const logFile = path.join(dataDir, `zamien-glowny-${slug}-${at.replace(/[:.]/g, '-')}.json`)
await writeFile(logFile, JSON.stringify({ at, before, id: p.id, slug }, null, 1))
await payload.update({
  collection: 'products', context, draft: true, id: p.id, overrideAccess: true,
  data: { carats: nextCarats, description: desc, media: nextMedia, stone: newStone, stoneVariants: nextVariants } as never,
})
console.log(`  ✓ zapisane jako wersja robocza. Cofnięcie: npm run zamien:glowny -- --rollback ${path.basename(logFile)} --apply`)
process.exit(0)
