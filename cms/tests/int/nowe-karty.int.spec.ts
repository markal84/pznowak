import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { lintAc } from '../../scripts/opisy-ac-logic'
import { collectPhotos, loadNewCards, photoKey, planNewCard } from '../../scripts/nowe-karty-logic'

/** Nowe karty (andaluzyt, opal): szkice na staging, opis według wzoru AC (od fasonu). */
const specs = loadNewCards()
const pustyFolder = mkdtempSync(path.join(tmpdir(), 'nowe-karty-'))

describe('nowe karty: treść nowe-karty.json', () => {
  it('Hesperia z andaluzytem za 3299 zł i Selene z opalem bez ceny', () => {
    const hesperia = specs.find((s) => s.slug === 'hesperia')!
    const selene = specs.find((s) => s.slug === 'selene')!
    expect(hesperia.price).toBe(3299)
    expect(hesperia.stone).toMatch(/^Andaluzyt/)
    expect(selene.price).toBeNull()
    expect(selene.stone).toMatch(/^Opal/)
  })

  it.each(specs.map((s) => [s.name, s] as const))('%s: standard U + początek od fasonu, bez słowa „oryginał”', (_n, spec) => {
    expect(lintAc({ id: 0, slug: spec.slug, name: spec.name, lead: spec.lead, description: spec.description })).toEqual([])
    expect(`${spec.lead} ${spec.description}`.toLowerCase()).not.toContain('oryginał')
  })

  it.each(specs.map((s) => [s.name, s] as const))('%s: wszystkie własne zdjęcia są w repo', (_n, spec) => {
    const { photos, missing } = collectPhotos(spec, { kamilaDir: pustyFolder })
    expect(missing.filter((m) => !m.includes('od Kamili'))).toEqual([])
    expect(photos.length).toBe(spec.photos.length)
  })
})

describe('nowe karty: zdjęcia od Kamili i plan', () => {
  const hesperia = specs.find((s) => s.slug === 'hesperia')!

  it('bierze JPG z folderu Kamili, HEIC zgłasza do konwersji, brakujące wypisuje', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'od-kamili-'))
    writeFileSync(path.join(dir, 'IMG_0056.JPG'), 'x')
    writeFileSync(path.join(dir, 'IMG_0057.HEIC'), 'x')
    const { photos, missing } = collectPhotos(hesperia, { kamilaDir: dir })
    expect(photos.map((p) => p.file)).toEqual(['hesperia-andaluzyt-1.jpg', 'IMG_0056.JPG'])
    expect(photos[1].key).toBe(photoKey('od-kamili/IMG_0056.JPG'))
    expect(missing).toContain('IMG_0057.HEIC (HEIC, przekonwertuj na JPG)')
    expect(missing).toContain('IMG_0060 (od Kamili)')
  })

  it('zakłada brakującą kartę, dopina do szkicu tylko nowe zdjęcia, opublikowanej nie rusza', () => {
    const { photos } = collectPhotos(hesperia, { kamilaDir: pustyFolder })
    expect(planNewCard(undefined, hesperia, photos).action).toBe('utworz')
    expect(planNewCard(undefined, hesperia, []).action).toBe('pomin')
    const draft = { id: 60, name: 'Hesperia', status: 'draft' as const, photoKeys: photos.map((p) => p.key) }
    expect(planNewCard(draft, hesperia, photos).action).toBe('juz')
    const extra = { ...photos[0], key: photoKey('od-kamili/IMG_0056.jpg'), file: 'IMG_0056.jpg' }
    const plan = planNewCard(draft, hesperia, [...photos, extra])
    expect(plan.action).toBe('dodaj')
    expect(plan.action === 'dodaj' && plan.photos.map((p) => p.file)).toEqual(['IMG_0056.jpg'])
    expect(planNewCard({ ...draft, status: 'published' }, hesperia, [...photos, extra]).action).toBe('pomin')
    expect(planNewCard({ ...draft, name: 'Inna' }, hesperia, photos).action).toBe('pomin')
  })
})
