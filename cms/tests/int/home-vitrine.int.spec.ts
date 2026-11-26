import { describe, expect, it } from 'vitest'

import { HERO_VITRINE, shuffleVitrine } from '@/lib/home'

describe('shuffleVitrine', () => {
  it('keeps every ring exactly once and does not touch the source list', () => {
    const before = HERO_VITRINE.map((v) => v.name)
    const out = shuffleVitrine(HERO_VITRINE)
    expect(out.map((v) => v.name).sort()).toEqual([...before].sort())
    expect(HERO_VITRINE.map((v) => v.name)).toEqual(before)
  })

  it('puts a different ring first depending on the draw', () => {
    const firsts = new Set([0, 0.25, 0.5, 0.75, 0.99].map((r) => shuffleVitrine(['a', 'b', 'c', 'd', 'e'], () => r)[0]))
    expect(firsts.size).toBeGreaterThan(1)
  })
})
