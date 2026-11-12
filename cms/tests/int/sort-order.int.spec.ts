import { describe, expect, it } from 'vitest'

import { planMove, planNormalize } from '../../src/lib/sort-order'

const items = (...values: number[]) => values.map((sortOrder, index) => ({ id: index + 1, sortOrder }))
const apply = (list: ReturnType<typeof items>, moved: number, target: number) => {
  const { movedTo, changes } = planMove(list, moved, target)
  return list
    .map((item) => ({
      ...item,
      sortOrder: item.id === moved ? movedTo : (changes.find((c) => c.id === item.id)?.to ?? item.sortOrder),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

describe('kolejność pierścionków', () => {
  it('w górę: z 6 na 2 staje przed kartą z 2, reszta +1, luka domknięta', () => {
    const result = apply(items(0, 1, 2, 3, 4, 5, 6, 7), 7, 2)
    expect(result.map((i) => i.sortOrder)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(result.map((i) => i.id)).toEqual([1, 2, 7, 3, 4, 5, 6, 8])
  })

  it('w dół: z 1 na 5 staje tuż za kartą z 4 (dostaje 4), bez powtórzeń i luk', () => {
    const result = apply(items(0, 1, 2, 3, 4, 5, 6), 2, 5)
    expect(result.map((i) => i.sortOrder)).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(result.map((i) => i.id)).toEqual([1, 3, 4, 5, 2, 6, 7])
    expect(planMove(items(0, 1, 2, 3, 4, 5, 6), 2, 5).movedTo).toBe(4)
  })

  it('przypadek Thalii: za Adamas (11), nie powstaje druga 12', () => {
    // id 9 = Thalia (8), id 12 = Adamas (11), id 13 = Terpsichore (12)
    const list = items(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13)
    const result = apply(list, 9, 12)
    const ids = result.map((i) => i.id)
    expect(ids.indexOf(9)).toBe(ids.indexOf(12) + 1)
    expect(new Set(result.map((i) => i.sortOrder)).size).toBe(list.length)
  })

  it('powtórzone wartości porządkuje przy okazji (9, 9, 9)', () => {
    const result = apply(items(9, 9, 9, 3), 4, 0)
    expect(result.map((i) => i.sortOrder)).toEqual([0, 1, 2, 3])
  })

  it('numer poza listą: na koniec albo na początek', () => {
    expect(planMove(items(0, 1, 2), 1, 99).movedTo).toBe(2)
    expect(planMove(items(0, 1, 2), 3, -5).movedTo).toBe(0)
  })

  it('normalizacja numeruje po kolei, zachowując kolejność', () => {
    const changes = planNormalize(items(0, 1, 2, 3, 4, 5, 7, 9, 9, 9))
    expect(changes.map((c) => [c.id, c.to])).toEqual([
      [7, 6],
      [8, 7],
      [9, 8],
    ])
  })
})
