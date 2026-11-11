import { describe, expect, it } from 'vitest'
import {
  MAX_SWING,
  REST_ANGLE,
  isSettled,
  pointerForces,
  restState,
  scrollForce,
  stepTag,
} from '@/components/site/hangingTagPhysics'

const none = { alpha: 0, alphaY: 0, alphaX: 0, rest: REST_ANGLE }
const box = { left: -16, top: 14, width: 280, height: 76 }

describe('fizyka przywieszki w hero', () => {
  it('wychylona przywieszka wraca do spoczynku w kilka sekund', () => {
    let s = { ...restState(), a: REST_ANGLE + 0.3 }
    for (let i = 0; i < 60 * 6; i++) s = stepTag(s, 1 / 60, none)
    expect(isSettled(s, REST_ANGLE)).toBe(true)
  })

  it('nigdy nie przekracza granicy wychylenia (czytelność)', () => {
    let s = restState()
    let max = 0
    for (let i = 0; i < 120; i++) {
      s = stepTag(s, 1 / 60, { ...none, alpha: 400 })
      max = Math.max(max, Math.abs(s.a - REST_ANGLE))
    }
    expect(max).toBeLessThanOrEqual(MAX_SWING + 1e-9)
  })

  it('kursor ciągnięty w dół po prawym końcu obraca przywieszkę zgodnie ze wskazówkami zegara', () => {
    const f = pointerForces({ dx: 220, dy: 50, vx: 0, vy: 900 }, restState(), box)
    expect(f.touching).toBe(true)
    expect(f.alpha).toBeGreaterThan(0)
  })

  it('kursor daleko od przywieszki nic nie robi', () => {
    const f = pointerForces({ dx: 1200, dy: 900, vx: 800, vy: 800 }, restState(), box)
    expect(f.alpha).toBe(0)
    expect(f.alphaY).toBe(0)
  })

  it('przewijanie w dół (strona przyspiesza w górę) opuszcza prawy koniec', () => {
    expect(scrollForce(12000, restState(), 280)).toBeGreaterThan(0)
    expect(scrollForce(-12000, restState(), 280)).toBeLessThan(0)
  })
})
