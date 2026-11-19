import { describe, expect, it } from 'vitest'

import { cardFilmCaption, cardFilmStone, guessSwatch } from '../../src/lib/stone-variants'

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

describe('film karty z wariantu (Aion: niebieskie diamenty + film „Białych diamentów”)', () => {
  const variants = [
    { stone: 'Białe diamenty', video: '/m/biale.mp4' },
    { stone: 'Różowy szafir i diamenty', video: '/m/rozowy.mp4' },
    { stone: 'Rubin i diamenty', video: '' },
  ]

  it('rozpoznaje kamień na filmie karty', () => {
    expect(cardFilmStone('/m/biale.mp4', variants)).toBe('Białe diamenty')
    expect(cardFilmStone('/m/oryginal.mp4', variants)).toBeNull()
    expect(cardFilmStone('', variants)).toBeNull()
  })

  it('podpis przy oryginale i innych kamieniach, bez podpisu przy samym wariancie', () => {
    const film = 'Białe diamenty'
    expect(cardFilmCaption(null, 'Diamenty niebieskie i białe', film)).toBe('Na filmie kamień: białe diamenty')
    expect(cardFilmCaption('Rubin i diamenty', 'Diamenty niebieskie i białe', film)).toBe('Na filmie kamień: białe diamenty')
    expect(cardFilmCaption('Białe diamenty', 'Diamenty niebieskie i białe', film)).toBeUndefined()
  })

  it('film oryginału jak dotąd: podpis tylko przy innym kamieniu', () => {
    expect(cardFilmCaption(null, 'Szmaragd', null)).toBeUndefined()
    expect(cardFilmCaption('Rubin', 'Szmaragd', null)).toBe('Na filmie kamień: szmaragd')
  })
})
