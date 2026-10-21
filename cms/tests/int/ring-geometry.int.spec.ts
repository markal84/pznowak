import { describe, expect, it } from 'vitest'
import { CUTS, GEMS, computeRing, type CutId, type RingState, type SettingId } from '../../src/lib/ring-geometry'

const base: RingState = { gem: 'szafir', cut: 'owal', setting: 'halo', metal: 'au', width: 'klasyczna', pave: 'nie' }

describe('geometria podglądu pierścionka', () => {
  it('każdy szlif i każda oprawa daje ścieżki SVG bez NaN i undefined', () => {
    for (const cut of Object.keys(CUTS) as CutId[]) {
      for (const setting of ['lapki-4', 'lapki-6', 'kaszta', 'halo', 'trylogia'] as SettingId[]) {
        const geo = computeRing({ ...base, cut, setting })
        expect(geo.gemPath.length).toBeGreaterThan(20)
        for (const [key, value] of Object.entries(geo)) {
          if (typeof value === 'string') {
            expect(value, `${cut}/${setting}/${key}`).not.toMatch(/NaN|undefined/)
          }
        }
      }
    }
  })

  it('przełącza warstwy zależnie od oprawy', () => {
    expect(computeRing({ ...base, setting: 'halo' })).toMatchObject({ haloDisplay: true, bezelDisplay: false, trioDisplay: false, prongDisplay: true })
    expect(computeRing({ ...base, setting: 'kaszta' })).toMatchObject({ haloDisplay: false, bezelDisplay: true, prongDisplay: false })
    expect(computeRing({ ...base, setting: 'trylogia' })).toMatchObject({ trioDisplay: true, haloDisplay: false })
    expect(computeRing({ ...base, setting: 'lapki-4' })).toMatchObject({ haloDisplay: false, trioDisplay: false, bezelDisplay: false })
  })

  it('sześć łapek rysuje więcej łapek niż cztery', () => {
    const four = computeRing({ ...base, setting: 'lapki-4' }).prongPath.split('M').length
    const six = computeRing({ ...base, setting: 'lapki-6' }).prongPath.split('M').length
    expect(six).toBeGreaterThan(four)
  })

  it('kolor złota: żółte obrączka i oprawa, białe obie białe, dwukolorowe żółta obrączka z białą oprawą', () => {
    expect(computeRing({ ...base, metal: 'au' })).toMatchObject({ bandFill: 'url(#kr-au)', headFill: 'url(#kr-au)' })
    expect(computeRing({ ...base, metal: 'ag' })).toMatchObject({ bandFill: 'url(#kr-ag)', headFill: 'url(#kr-ag)' })
    expect(computeRing({ ...base, metal: 'dwa' })).toMatchObject({ bandFill: 'url(#kr-au)', headFill: 'url(#kr-ag)' })
  })

  it('ramiona z diamentami pojawiają się tylko po wyborze pavé', () => {
    expect(computeRing({ ...base, pave: 'nie' })).toMatchObject({ paveDisplay: false, pavePath: 'M0 0' })
    const withPave = computeRing({ ...base, pave: 'tak' })
    expect(withPave.paveDisplay).toBe(true)
    expect(withPave.pavePath.split('M').length).toBeGreaterThan(10)
  })

  it('szerokość obrączki zmienia jej grubość', () => {
    const thin = computeRing({ ...base, width: 'cienka' }).bandPath
    const wide = computeRing({ ...base, width: 'szeroka' }).bandPath
    expect(thin).not.toBe(wide)
  })

  it('kolory kamienia pochodzą z palety wybranego kamienia', () => {
    const geo = computeRing({ ...base, gem: 'rubin' })
    expect([geo.g1, geo.g2, geo.g3]).toEqual(GEMS.rubin.c)
    expect(geo.gemStroke).toBe(GEMS.rubin.c[2])
  })
})
