import { describe, expect, it } from 'vitest'

import { planInsert, planNormalize } from '../../src/lib/sort-order'

const items = (...values: number[]) => values.map((sortOrder, index) => ({ id: index + 1, sortOrder }))
const apply = (list: ReturnType<typeof items>, moved: number, target: number) => {
  const changes = planInsert(list, moved, target)
  return list
    .map((item) => ({
      ...item,
      sortOrder: item.id === moved ? target : (changes.find((c) => c.id === item.id)?.to ?? item.sortOrder),
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

describe('kolejność pierścionków', () => {
  it('przeniesienie z 14 na 9 przesuwa 9…13 o 1 i domyka lukę', () => {
    const list = items(8, 9, 10, 11, 12, 13, 14, 15)
    const result = apply(list, 7, 9)
    expect(result.map((i) => i.sortOrder)).toEqual([8, 9, 10, 11, 12, 13, 14, 15])
    expect(result.map((i) => i.id)).toEqual([1, 7, 2, 3, 4, 5, 6, 8])
  })

  it('powtórzone wartości dostają kolejne liczby (9, 9, 9 → 9, 10, 11)', () => {
    const changes = planInsert(items(9, 9, 9), 99, 9)
    expect(changes.map((c) => c.to)).toEqual([10, 11, 12])
  })

  it('wolne miejsce nic nie przesuwa', () => {
    expect(planInsert(items(1, 2, 5), 99, 3)).toEqual([])
  })

  it('nie rusza kart przed docelowym miejscem ani za pierwszą luką', () => {
    const changes = planInsert(items(1, 2, 3, 4, 8), 99, 2)
    expect(changes.map((c) => [c.id, c.to])).toEqual([
      [2, 3],
      [3, 4],
      [4, 5],
    ])
  })

  it('pomija sam przenoszony pierścionek', () => {
    expect(planInsert(items(5, 6), 1, 5)).toEqual([])
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
