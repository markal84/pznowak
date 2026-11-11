/**
 * Wpina przyjęte wizualizacje na listę wariantów: przepisuje `seed/warianty/warianty-w.json` do `warianty.json`
 * (nowa karta = nowy wpis, istniejąca karta = dodane albo podmienione warianty o tej samej nazwie kamienia).
 *
 *   npm run warianty:wdroz            przepisuje wpisy i od razu uruchamia `staging:warianty --apply`
 *   node --import=tsx/esm scripts/warianty-wdroz.ts   tylko przepisuje, bez stagingu
 *
 * Wywołuj dopiero po przeglądzie arkusza. Plik `warianty-w.json` zostaje, a przy następnym `warianty:wizualizacje`
 * i tak odświeża się (wpisy już wpięte są z niego odfiltrowywane).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'seed', 'warianty')
const proposalsPath = path.join(dir, 'warianty-w.json')
const targetPath = path.join(dir, 'warianty.json')

type Variant = { stone: string; files: string[]; [key: string]: unknown }
type Card = { slug: string; name: string; variants: Variant[]; removeStones?: string[]; [key: string]: unknown }

if (!existsSync(proposalsPath)) {
  console.log('Brak warianty-w.json – nic do wpięcia.')
  process.exit(0)
}
const proposals = JSON.parse(readFileSync(proposalsPath, 'utf8')) as Card[]
const target = JSON.parse(readFileSync(targetPath, 'utf8')) as Card[]

let added = 0
let replaced = 0
for (const entry of proposals) {
  const card = target.find((item) => item.slug === entry.slug)
  if (!card) {
    target.push({ slug: entry.slug, name: entry.name, variants: entry.variants })
    added += entry.variants.length
    continue
  }
  for (const variant of entry.variants) {
    // Kamień celowo wycofany z karty (removeStones, np. szmaragd Aiona = prawdziwe zdjęcia Thalassy) nie wraca jako wizualizacja.
    if (card.removeStones?.includes(variant.stone)) {
      console.log(`Pomijam ${entry.slug}: „${variant.stone}” jest w removeStones.`)
      continue
    }
    const index = card.variants.findIndex((item) => item.stone === variant.stone)
    // Wariant na prawdziwych zdjęciach (np. Iris z oliwinem = dawna Taygete) nie ustępuje wizualizacji.
    if (index >= 0 && card.variants[index].isVisualization === false) {
      console.log(`Pomijam ${entry.slug}: „${variant.stone}” ma prawdziwe zdjęcia.`)
      continue
    }
    if (index >= 0) {
      card.variants[index] = variant
      replaced++
    } else {
      card.variants.push(variant)
      added++
    }
  }
}
writeFileSync(targetPath, `${JSON.stringify(target, null, 2)}\n`)
console.log(`warianty.json: dodane ${added}, podmienione ${replaced} wariantów (${proposals.length} kart).`)
