import { describe, expect, it } from 'vitest'

import { classifyLink, EVENTS } from '@/lib/analytics'
import { heardFromText } from '@/lib/submissions/summary'
import { SITE } from '@/lib/site'

describe('zdarzenia konwersji: rozpoznawanie linków', () => {
  it('telefon i e-mail pracowni', () => {
    expect(classifyLink(SITE.phoneHref)?.event).toBe(EVENTS.phone)
    expect(classifyLink(`mailto:${SITE.email}`)?.event).toBe(EVENTS.email)
  })

  it('nawigacja do pracowni w Mapach Google i Apple', () => {
    expect(classifyLink(SITE.mapsUrl)).toEqual({ event: EVENTS.map, data: { rodzaj: 'google' } })
    expect(classifyLink(SITE.mapsAppleUrl)).toEqual({ event: EVENTS.map, data: { rodzaj: 'apple' } })
  })

  it('wizytówka i opinie Google', () => {
    expect(classifyLink('https://www.google.com/maps/place/?q=place_id:abc')?.event).toBe(EVENTS.reviews)
    expect(classifyLink('https://maps.app.goo.gl/xyz')?.event).toBe(EVENTS.reviews)
    expect(classifyLink('https://search.google.com/local/writereview?placeid=abc')?.event).toBe(EVENTS.reviews)
  })

  it('Facebook i Instagram pracowni', () => {
    expect(classifyLink(SITE.facebook)).toEqual({ event: EVENTS.social, data: { kanal: 'facebook' } })
    expect(classifyLink(SITE.instagram)).toEqual({ event: EVENTS.social, data: { kanal: 'instagram' } })
  })

  it('zwykłe linki nie są konwersją', () => {
    expect(classifyLink('https://pznowak.pl/pierscionki')).toBeNull()
    expect(classifyLink('/kontakt')).toBeNull()
    expect(classifyLink('https://www.google.com/search?q=pierscionki')).toBeNull()
    expect(classifyLink('')).toBeNull()
  })
})

describe('„Skąd o nas wiesz?” w podsumowaniu zgłoszenia', () => {
  it('etykieta, wpis przy „Inne” i brak odpowiedzi', () => {
    expect(heardFromText({ heardFrom: 'olx' })).toBe('OLX')
    expect(heardFromText({ heardFrom: 'inne', heardFromOther: 'targi' })).toBe('Inne: targi')
    expect(heardFromText({ heardFrom: '' })).toBe('')
    expect(heardFromText({})).toBe('')
  })
})
