/**
 * Zlecenie K, pkt 3, 4 i 6: zapis planu zmian pierścionków (kolor złota, kamień, czysty adres) z pliku JSON
 * przygotowanego przez `scripts/pierscionki/przygotuj_zmiany.py`.
 *
 * Domyślnie PODGLĄD (tabela „było / będzie” z bazy, bez zapisu). `--apply` zapisuje przez Payload Local API
 * wyłącznie na stagingu (`NEON_BRANCH=staging`); na produkcji skrypt odmawia: zapis tam robi Marcin po przeglądzie.
 *
 *   npm run k:dane -- ../data/pierscionki-k/plan.json            # podgląd
 *   npm run k:dane -- ../data/pierscionki-k/plan.json --apply    # zapis na stagingu
 *   --pola=metal,stone   tylko te pola (adresy `slug` osobno: wymagają przekierowań ze starych adresów)
 */
import { readFile } from 'node:fs/promises'

import { getPayload } from 'payload'

import config from '../src/payload.config'

type Change = { slug: string; name: string; set: { metal?: string; stone?: string; slug?: string } }

const planPath = process.argv.slice(2).find((a) => !a.startsWith('--'))
const apply = process.argv.includes('--apply')
const only = process.argv.find((a) => a.startsWith('--pola='))?.slice('--pola='.length).split(',')

if (!planPath) throw new Error('Podaj ścieżkę do planu JSON (plan.json z przygotuj_zmiany.py)')
if (apply && process.env.NEON_BRANCH !== 'staging') {
  throw new Error('Zapis tylko na stagingu (NEON_BRANCH=staging). Produkcja: po decyzji Marcina.')
}

const plan = JSON.parse(await readFile(planPath, 'utf8')) as Change[]
const payload = await getPayload({ config: await config })

let changed = 0
for (const item of plan) {
  const found = await payload.find({
    collection: 'products',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { slug: { equals: item.slug } },
  })
  const doc = found.docs[0]
  if (!doc) {
    console.log(`? ${item.name}: brak karty z adresem ${item.slug} (pominięto)`)
    continue
  }
  const data: Record<string, string> = {}
  for (const [field, value] of Object.entries(item.set)) {
    if (only && !only.includes(field)) continue
    const current = String((doc as unknown as Record<string, unknown>)[field] ?? '')
    if (current !== value) {
      data[field] = value
      console.log(`${item.name} · ${field}: ${current || '-'} → ${value}`)
    }
  }
  if (Object.keys(data).length === 0) continue
  if (data.slug) {
    const taken = await payload.find({ collection: 'products', depth: 0, limit: 1, overrideAccess: true, where: { slug: { equals: data.slug } } })
    if (taken.docs[0]) {
      console.log(`! ${item.name}: adres „${data.slug}” jest zajęty, pomijam zmianę adresu`)
      delete data.slug
    }
  }
  if (Object.keys(data).length === 0) continue
  changed += 1
  if (apply) {
    await payload.update({ collection: 'products', data, depth: 0, draft: false, id: doc.id, overrideAccess: true })
  }
}
console.log(`\n${apply ? 'zapisano' : 'PODGLĄD, nic nie zapisano'}: kart ze zmianą ${changed}`)
process.exit(0)
