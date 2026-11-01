import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { SEED_WORKS } from '../../scripts/realizacje-data'

const photosDir = path.join(process.cwd(), 'seed', 'realizacje')

describe('treść startowa „Realizacje”', () => {
  it('has the six stories from the order, the first one featured and in table order', () => {
    expect(SEED_WORKS).toHaveLength(6)
    expect(SEED_WORKS.filter((w) => w.featured).map((w) => w.slug)).toEqual(['pierscionek-zareczynowy-wyspa'])
    expect(SEED_WORKS[0].slug).toBe('pierscionek-zareczynowy-wyspa')
    expect(new Set(SEED_WORKS.map((w) => w.slug)).size).toBe(SEED_WORKS.length)
    expect(SEED_WORKS.map((w) => w.kind)).toEqual(['zamowienie', 'zamowienie', 'zamowienie', 'zamowienie', 'zamowienie', 'przerobka'])
  })

  it('uses every photo from cms/seed/realizacje exactly once, each with a concrete Polish alt', () => {
    const used = SEED_WORKS.flatMap((w) => w.photos.map((p) => p.file))
    expect([...used].sort()).toEqual(readdirSync(photosDir).filter((f) => f.endsWith('.webp')).sort())
    for (const photo of SEED_WORKS.flatMap((w) => w.photos)) {
      expect(photo.alt.length, photo.file).toBeGreaterThan(20)
      expect(photo.alt, photo.file).not.toMatch(/\.webp|\[|zdjęcie\b$/i)
    }
  })

  it('does not invent a duration or other facts: only task and what we did, no brackets', () => {
    for (const work of SEED_WORKS) {
      expect(work.task.length, work.slug).toBeGreaterThan(10)
      expect(work.whatWeDid.length, work.slug).toBeGreaterThan(10)
      expect(`${work.task} ${work.whatWeDid}`, work.slug).not.toMatch(/\[|\d\s?(ct|zł)|tygod/i)
    }
  })
})
