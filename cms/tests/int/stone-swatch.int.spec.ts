import { describe, expect, it } from 'vitest'

import { guessSwatch } from '../../src/lib/stone-variants'

// fb:do-istniejacych zakłada wariant ze zdjęć (np. Hesperia → Turmalin od Kamili) i dobiera kolor kółka z nazwy kamienia.
describe('guessSwatch', () => {
  it.each([
    ['Turmalin', 'zielony'],
    ['Zielony turmalin', 'zielony'],
    ['Malinowy turmalin', 'rozowy'],
    ['Turmalin różowy', 'rozowy'],
    ['Diamenty niebieskie i białe', 'niebieski'],
    ['Szafir granatowy i diamenty', 'granatowy'],
    ['Granat', 'czerwony'],
    ['Topaz London blue', 'londonblue'],
    ['Oliwin', 'oliwkowy'],
    ['Akwamaryn', 'jasnoniebieski'],
    ['Ametyst', 'fioletowy'],
    ['Moissanit', 'bialy'],
  ])('%s → %s', (stone, swatch) => {
    expect(guessSwatch(stone)).toBe(swatch)
  })

  it('bez pewności zwraca null (wariant czeka, kolor wybiera Marcin)', () => {
    expect(guessSwatch('Andaluzyt')).toBeNull()
    expect(guessSwatch('')).toBeNull()
  })
})
