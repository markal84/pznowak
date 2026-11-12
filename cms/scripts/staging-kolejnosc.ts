/**
 * Jednorazowe uporządkowanie pola „Kolejność” pierścionków na staging: zamienia powtórzone i dziurawe wartości
 * (9, 9, 9; brak 6, 8) na 0, 1, 2 … po kolei. Zachowuje obecną kolejność w katalogu; remisy rozstrzyga numer karty.
 *
 *   npm run staging:kolejnosc            sprawdzenie: nic nie zapisuje, pokazuje plan
 *   npm run staging:kolejnosc -- --apply zapisuje nowe wartości (bez nowych wersji i bez zmiany statusu kart)
 *
 * Po zapisie odśwież katalog: zapisz dowolną kartę w panelu. Działa tylko z NEON_BRANCH=staging.
 */
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { planNormalize } from '../src/lib/sort-order'

const applyChanges = process.argv.includes('--apply')

if (process.env.NEON_BRANCH !== 'staging') {
  throw new Error('staging:kolejnosc musi działać z NEON_BRANCH=staging (backend/.env.staging.local)')
}

const payload = await getPayload({ config: await config })
try {
  const found = await payload.find({
    collection: 'products',
    depth: 0,
    draft: false,
    pagination: false,
    overrideAccess: true,
    select: { name: true, sortOrder: true },
  })
  const names = new Map(found.docs.map((doc) => [doc.id, doc.name]))
  const changes = planNormalize(found.docs)
  for (const change of changes) console.log(`~ ${names.get(change.id as number)}: ${change.from} → ${change.to}`)
  if (!changes.length) console.log('= wartości są już unikalne i po kolei')
  else if (!applyChanges) console.log(`Sprawdzenie: ${changes.length} z ${found.docs.length} kart do zmiany. Zapis: dodaj --apply.`)
  else {
    for (const change of changes) {
      await payload.db.updateOne({ collection: 'products', id: change.id, data: { sortOrder: change.to }, returning: false })
      const latest = await payload.findVersions({
        collection: 'products',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        where: { and: [{ parent: { equals: change.id } }, { latest: { equals: true } }, { 'version._status': { equals: 'draft' } }] },
      })
      if (latest.docs[0]) {
        await payload.db.updateVersion({
          collection: 'products',
          id: latest.docs[0].id,
          versionData: { version: { sortOrder: change.to } },
          returning: false,
        })
      }
    }
    console.log(`Zapisane: ${changes.length} kart. Odśwież katalog: zapisz dowolną kartę w panelu.`)
  }
} finally {
  await payload.destroy()
}
process.exit(process.exitCode ?? 0)
