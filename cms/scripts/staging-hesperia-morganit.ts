/**
 * Rozdzielenie Hesperii (26.11.2026): Kama potwierdziła, że zdjęcia na karcie to dwa różne pierścionki w tym samym
 * fasonie. Ciemniejszy, brązowawy kamień to andaluzyt (0,65 ct + brylanty 0,09 ct) – zostaje na karcie Hesperia.
 * Jasny, brzoskwiniowy to morganit (0,38 ct + diamenty 0,054 ct) – dostaje nowy szkic „Alcyone”.
 * Podział zdjęć po wyglądzie kamienia (docs/od-kamili/2026-11-06): andaluzyt IMG_0056, IMG_0058;
 * morganit hesperia-andaluzyt-1.jpg (to samo co andaluzyt/IMG_0000-dubel), IMG_0057, IMG_0059.
 *
 *   npm run staging:hesperia-morganit              sprawdzenie, nic nie zapisuje
 *   npm run staging:hesperia-morganit -- --apply   zapis
 *
 * Hesperia zostaje opublikowana (zmiana zdjęć, karatów i zdania o barwie w opisie). Alcyone to szkic: nazwę, cenę
 * i publikację ustala Marcin w panelu. Film i wariant z turmalinem zostają na Hesperii. Idempotentne.
 * Działa tylko na żywej bazie (NEON_BRANCH=production, zob. db-guard.ts).
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { requireLiveDatabase } from './db-guard'
import { KAMILA_DIR, photoKey } from './nowe-karty-logic'

const applyChanges = process.argv.includes('--apply')
requireLiveDatabase('staging-hesperia-morganit')

const ANDALUZYT_KEYS = [photoKey('od-kamili/IMG_0056.jpg'), photoKey('od-kamili/IMG_0058.jpg')]
const MORGANIT_KEYS = [photoKey('hesperia-andaluzyt-1.jpg'), photoKey('od-kamili/IMG_0057.jpg'), photoKey('od-kamili/IMG_0059.jpg')]
const HESPERIA_CARATS = '0,65 ct + brylanty 0,09 ct'
const HESPERIA_FROM = 'andaluzyt w ciepłym, brzoskwiniowo-różowym odcieniu.'
const HESPERIA_TO = 'andaluzyt w ciepłym, brązowo-różowym odcieniu, który zmienia się zależnie od kąta patrzenia.'

const ALCYONE = {
  name: 'Alcyone',
  slug: 'alcyone',
  lead: 'Jasny owal w czterech łapkach i trójki diamentów po bokach, na cienkiej szynie z żółtego złota.',
  description:
    'Pierścionek z żółtego złota próby 585. Jasny, owalny kamień trzymają cztery łapki na cienkiej szynie, a po jego bokach błyszczą trójki drobnych diamentów.\n\n' +
    'Kamienie oprawiamy ręcznie w naszej pracowni. Na zdjęciach w centrum jest brzoskwiniowy morganit, kamień z rodziny berylu, tej samej co szmaragd.\n\n' +
    'Model wykonamy w wybranym rozmiarze, także z innym kamieniem centralnym.',
  metal: 'Żółte',
  stone: 'Morganit, Diament',
  carats: '0,38 ct + diamenty 0,054 ct',
  stoneCut: 'owalny' as const,
  uniqueNote: 'Alcyone to jaśniejsza siostra pierścionka Hesperia: ten sam smukły układ z owalem w czterech łapkach i trójkami diamentów po bokach, ale z morganitem w miękkim, brzoskwiniowym kolorze. Morganit jest kuzynem szmaragdu, a jego delikatna barwa dobrze łączy się z żółtym złotem. Na zdjęciu z odbiciem w ciemnym blacie widać, jak przejrzysty jest kamień i jak równo układają się jego fasety. To pierścionek romantyczny i dyskretny, wygodny do noszenia na co dzień. Jeśli wolisz ciemniejszy, bardziej zmienny kamień, wybierz andaluzyt z karty Hesperii, a morganit w zupełnie innej oprawie, na szynie z diamentami, pokazuje pierścionek Eos.',
}

const payload = await getPayload({ config: await config })
const context = { skipFrontendRevalidation: true }
type MediaEntry = { asset: unknown; alt?: string | null; isPrimary?: boolean | null }
const assetOf = (entry: MediaEntry) => (typeof entry.asset === 'object' && entry.asset ? (entry.asset as { id: number; legacySourceUrl?: string | null }) : null)

const mediaByKey = async (key: string, upload?: { file: string; alt: string }): Promise<number | null> => {
  const found = await payload.find({ collection: 'media', depth: 0, limit: 1, overrideAccess: true, where: { legacySourceUrl: { equals: key } } })
  if (found.docs[0]) return found.docs[0].id
  if (!upload || !applyChanges) return null
  const data = await readFile(path.join(KAMILA_DIR, upload.file))
  const media = await payload.create({
    collection: 'media',
    data: { alt: upload.alt, legacySourceUrl: key },
    file: { data, mimetype: 'image/jpeg', name: upload.file, size: data.byteLength },
    overrideAccess: true,
  })
  return media.id
}

try {
  const all = await payload.find({ collection: 'products', depth: 1, draft: true, limit: 1000, overrideAccess: true, pagination: false })
  const hesperia = all.docs.find((doc) => doc.slug === 'hesperia')
  if (!hesperia || hesperia.name !== 'Hesperia') throw new Error('Nie ma karty Hesperia (slug hesperia)')
  const entries = (hesperia.media ?? []) as MediaEntry[]
  const keyOf = (entry: MediaEntry) => assetOf(entry)?.legacySourceUrl ?? ''

  // 1) Alcyone: szkic z jasnymi zdjęciami (te same pliki w mediach, bez ponownego wgrywania).
  const alcyone = all.docs.find((doc) => doc.slug === ALCYONE.slug)
  if (alcyone) {
    console.log(`= Alcyone: karta już jest (#${alcyone.id}, ${alcyone._status}), nie ruszam`)
  } else {
    const ids: number[] = []
    for (const key of MORGANIT_KEYS) {
      const id = await mediaByKey(key)
      if (id === null) throw new Error(`Brak zdjęcia w mediach: ${key}`)
      ids.push(id)
    }
    console.log(`+ Alcyone: nowy szkic z morganitem, zdjęcia: ${MORGANIT_KEYS.join(', ')}`)
    if (applyChanges) {
      const nextSort = Math.max(0, ...all.docs.map((doc) => doc.sortOrder ?? 0)) + 1
      const created = await payload.create({
        collection: 'products',
        data: {
          ...ALCYONE,
          generateSlug: false,
          price: null,
          media: ids.map((asset, index) => ({ asset, alt: `Pierścionek Alcyone z morganitem i diamentami, zdjęcie ${index + 1}`, isPrimary: index === 0 })),
          sortOrder: nextSort,
          _status: 'draft',
        } as never,
        draft: true,
        overrideAccess: true,
        context,
      })
      console.log(`  szkic #${created.id}`)
    }
  }

  // 2) Hesperia: bez jasnych zdjęć, z IMG_0058, karaty andaluzytu, zdanie o barwie.
  const keep = entries.filter((entry) => !MORGANIT_KEYS.includes(keyOf(entry)))
  const hasKeys = new Set(keep.map(keyOf))
  const missing = ANDALUZYT_KEYS.filter((key) => !hasKeys.has(key))
  const description = hesperia.description ?? ''
  const changes: string[] = []
  if (keep.length !== entries.length) changes.push(`usuwam zdjęcia morganitu (${entries.length - keep.length})`)
  if (missing.length) changes.push(`dodaję: ${missing.join(', ')}`)
  if (hesperia.carats !== HESPERIA_CARATS) changes.push(`karaty „${hesperia.carats ?? ''}” → „${HESPERIA_CARATS}”`)
  const newDescription = description.includes(HESPERIA_FROM) ? description.replace(HESPERIA_FROM, HESPERIA_TO) : description
  if (newDescription !== description) changes.push('opis: zdanie o barwie andaluzytu')
  else if (!description.includes(HESPERIA_TO)) console.log('! Hesperia: opis ma inny tekst niż oczekiwany, zdania o barwie nie zmieniam')
  if (!changes.length) {
    console.log('= Hesperia: już rozdzielona')
  } else {
    console.log(`~ Hesperia (#${hesperia.id}): ${changes.join('; ')}`)
    if (applyChanges) {
      const media = keep.map((entry) => ({ asset: assetOf(entry)?.id ?? entry.asset, alt: entry.alt, isPrimary: false }))
      for (const key of missing) {
        const file = key.split('/').pop() as string
        const id = await mediaByKey(key, { file, alt: 'Pierścionek Hesperia z andaluzytem, zdjęcie z pracowni' })
        if (id === null) throw new Error(`Nie mogę wgrać ${file} z ${KAMILA_DIR}`)
        media.push({ asset: id, alt: 'Pierścionek Hesperia z andaluzytem, zdjęcie z pracowni', isPrimary: false })
      }
      // Główne zdjęcie: pierwsze z andaluzytem (IMG_0056), żeby miniatura w katalogu pokazywała właściwy kamień.
      const primary = media.findIndex((entry) => entry.asset === assetOf(entries.find((e) => keyOf(e) === ANDALUZYT_KEYS[0]) ?? { asset: null })?.id)
      media.forEach((entry, index) => (entry.isPrimary = index === (primary >= 0 ? primary : 0)))
      const published = hesperia._status === 'published'
      await payload.update({
        collection: 'products',
        id: hesperia.id,
        data: { media, carats: HESPERIA_CARATS, description: newDescription, _status: published ? 'published' : 'draft' } as never,
        draft: !published,
        overrideAccess: true,
        context,
      })
      console.log(`  zapisane${published ? ', opublikowana' : ' (szkic)'}`)
    }
  }
  if (!applyChanges) console.log('To było sprawdzenie. Zapis: npm run staging:hesperia-morganit -- --apply')
  else console.log('Odświeżenie katalogu: zapisz dowolną kartę w panelu (bez zmian). Alcyone opublikuj w panelu po obejrzeniu.')
} finally {
  await payload.destroy()
}
process.exit(process.exitCode ?? 0)
