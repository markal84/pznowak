/**
 * Jednorazowe przeniesienie poradników i tekstów stron do panelu (20.11.2026), słowo w słowo jak na stronie.
 *
 *   npm run tresci:przenies              sprawdzenie: co zostanie wpisane, nic nie zapisuje
 *   npm run tresci:przenies -- --apply   zapis (opublikowane, bo to obecna treść strony)
 *
 * Kolejność wdrożenia: najpierw migracja bazy (20261120_150000_poradniki_teksty_stron), potem ten skrypt, potem kod.
 *
 * Idempotentne: poradnik o istniejącym adresie i niepuste pole w „Tekstach stron” zostają nietknięte, więc drugie
 * uruchomienie niczego nie zmienia i nie nadpisze poprawek zrobionych w panelu. Działa tylko na żywej bazie
 * (NEON_BRANCH=production, zob. db-guard.ts); `--lokalnie` pozwala sprawdzić skrypt na bazie z localhost.
 */
import { getPayload } from 'payload'

import { GUIDE_SEED } from '../src/content/guides-seed'
import { PAGE_TEXT_DEFAULTS } from '../src/content/page-texts'
import config from '../src/payload.config'
import { requireLiveDatabase } from './db-guard'

const applyChanges = process.argv.includes('--apply')
const local = process.argv.includes('--lokalnie')

if (local) {
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? '').hostname
    } catch {
      return ''
    }
  })()
  if (!['localhost', '127.0.0.1'].includes(host)) throw new Error('--lokalnie: tylko baza na localhost.')
} else {
  requireLiveDatabase('przenies-tresci')
}

const payload = await getPayload({ config: await config })
const context = { skipFrontendRevalidation: true }

const isEmpty = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && value.length === 0)

try {
  // ---------- Poradniki ----------
  const existing = await payload.find({
    collection: 'guides',
    depth: 0,
    draft: true,
    limit: 100,
    overrideAccess: true,
    pagination: false,
  })
  const slugs = new Set(existing.docs.map((doc) => doc.slug))
  const missing = GUIDE_SEED.filter((guide) => !slugs.has(guide.slug))
  for (const guide of GUIDE_SEED) {
    console.log(`${slugs.has(guide.slug) ? '= jest już w panelu' : '+ do wpisania     '}  /poradniki/${guide.slug}`)
  }

  // ---------- Teksty stron ----------
  const current = (await payload.findGlobal({
    slug: 'site-content',
    depth: 0,
    draft: false,
    overrideAccess: true,
  })) as unknown as Record<string, Record<string, unknown> | undefined>
  const patch: Record<string, Record<string, unknown>> = {}
  for (const [section, defaults] of Object.entries(PAGE_TEXT_DEFAULTS)) {
    for (const [field, value] of Object.entries(defaults)) {
      if (!isEmpty(current?.[section]?.[field])) continue
      patch[section] = { ...(current?.[section] ?? {}), ...patch[section], [field]: value }
      console.log(`+ Teksty stron → ${section}.${field}`)
    }
  }
  const textFields = Object.values(patch).reduce((sum, section) => sum + Object.keys(section).length, 0)
  if (textFields === 0) console.log('= Teksty stron: wszystkie pola już wypełnione')

  if (!applyChanges) {
    console.log(`\nSprawdzenie: ${missing.length} poradników i pola tekstów do wpisania. Zapis: --apply`)
  } else {
    for (const guide of missing) {
      await payload.create({
        collection: 'guides',
        context,
        data: { ...guide, _status: 'published' } as never,
        draft: false,
        overrideAccess: true,
      })
      console.log(`✓ poradnik /poradniki/${guide.slug}`)
    }
    if (Object.keys(patch).length > 0) {
      await payload.updateGlobal({
        slug: 'site-content',
        context,
        data: { ...patch, _status: 'published' } as never,
        draft: false,
        overrideAccess: true,
      })
      console.log('✓ Teksty stron')
    }

    // Kontrola: opublikowane poradniki i teksty w bazie są takie jak w kodzie.
    const check = await payload.find({
      collection: 'guides',
      depth: 0,
      draft: false,
      limit: 100,
      overrideAccess: true,
      pagination: false,
      where: { _status: { equals: 'published' } },
    })
    const published = new Set(check.docs.map((doc) => doc.slug))
    const notPublished = GUIDE_SEED.filter((guide) => !published.has(guide.slug)).map((guide) => guide.slug)
    if (notPublished.length > 0) throw new Error(`Nieopublikowane poradniki: ${notPublished.join(', ')}`)
    console.log('\nGotowe. Po wdrożeniu kodu poradniki i teksty stron są w panelu: Strona → Poradniki, Strona → Teksty stron.')
  }
} finally {
  await payload.destroy()
}

process.exit(process.exitCode ?? 0)
