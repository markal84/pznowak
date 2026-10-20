import { describe, expect, it } from 'vitest'

import { LIMITS } from '@/lib/submissions/options'
import {
  MESSAGES,
  normalizePolishPhone,
  validateContact,
  validateCreator,
} from '@/lib/submissions/validation'

const creator = (overrides: Record<string, unknown> = {}) => ({
  occasion: 'rocznica',
  when: 'czerwiec 2027',
  gem: 'szmaragd',
  cut: 'serce',
  setting: 'trylogia',
  metal: 'ag',
  width: 'klasyczna',
  pave: 'tak',
  engraving: 'A & M 14.06.2027',
  name: 'Anna',
  phone: '501 321 347',
  notes: 'Rozmiar do sprawdzenia, inspiracja: https://pinterest.com/pin/1',
  consent: true,
  ...overrides,
})

const contact = (overrides: Record<string, unknown> = {}) => ({
  topic: 'naprawa',
  message: 'Zmniejszyć pierścionek po babci.',
  name: 'Marek',
  phone: '+48 600 100 200',
  email: '',
  consent: true,
  ...overrides,
})

describe('telefon w formacie polskim', () => {
  it.each([
    ['501 321 347', '+48 501 321 347'],
    ['501-321-347', '+48 501 321 347'],
    ['+48 501 321 347', '+48 501 321 347'],
    ['0048501321347', '+48 501 321 347'],
    ['(41) 378 12 34', '+48 413 781 234'],
    ['0 41 378 12 34', '+48 413 781 234'],
  ])('przyjmuje %s', (raw, normalized) => {
    expect(normalizePolishPhone(raw)).toBe(normalized)
  })

  it.each([
    '',
    '12345',
    '501 321 34',
    '501 321 3477',
    '012 345 678',
    '+49 501 321 347',
    '501 321 347 wew. 2',
    'abc',
    '+48 501 321 347 501',
  ])('odrzuca %s', (raw) => {
    expect(normalizePolishPhone(raw)).toBeNull()
  })
})

describe('walidacja kreatora', () => {
  it('przyjmuje poprawne zgłoszenie i normalizuje telefon', () => {
    const result = validateCreator(creator())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.phone).toBe('+48 501 321 347')
      expect(result.value.engraving).toBe('A & M 14.06.2027')
    }
  })

  it.each([
    ['gem', 'brylant-z-ksiezyca'],
    ['cut', 'trojkat'],
    ['setting', 'klej'],
    ['metal', 'platyna'],
    ['width', 'gruba'],
    ['pave', 'moze'],
    ['occasion', 'rozwod'],
    ['gem', 42],
  ])('odrzuca wartość spoza listy: %s = %s', (field, value) => {
    const result = validateCreator(creator({ [field]: value }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[field]).toBe(MESSAGES.choice)
  })

  it('grawer: limit znaków, bez linków, bez HTML i tylko dozwolone znaki', () => {
    const tooLong = validateCreator(creator({ engraving: 'x'.repeat(LIMITS.engraving + 1) }))
    expect(!tooLong.ok && tooLong.errors.engraving).toBe(MESSAGES.tooLong(LIMITS.engraving))
    for (const link of ['www.sklep.pl', 'http://a.b', 'kup.com', 'a@b.pl', 'javascript:alert(1)']) {
      const result = validateCreator(creator({ engraving: link }))
      expect(result.ok, link).toBe(false)
    }
    const html = validateCreator(creator({ engraving: '<b>Anna</b>' }))
    expect(!html.ok && html.errors.engraving).toBe(MESSAGES.html)
    const emoji = validateCreator(creator({ engraving: 'Anna 💍' }))
    expect(!emoji.ok && emoji.errors.engraving).toBe(MESSAGES.engraving)
    expect(validateCreator(creator({ engraving: 'Zawsze ♥ Ż&M 2027' })).ok).toBe(true)
    // limit liczy znaki, nie bajty: 24 polskie litery mieszczą się w limicie
    expect(validateCreator(creator({ engraving: 'ż'.repeat(LIMITS.engraving) })).ok).toBe(true)
  })

  it('wymaga imienia, telefonu i zgody', () => {
    const result = validateCreator(creator({ name: ' ', phone: '', consent: false }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.name).toBe(MESSAGES.nameRequired)
      expect(result.errors.phone).toBe(MESSAGES.phoneRequired)
      expect(result.errors.consent).toBe(MESSAGES.consent)
    }
    // zgoda musi być wartością logiczną true, nie tekstem
    expect(validateCreator(creator({ consent: 'true' })).ok).toBe(false)
  })

  it('odrzuca linki i HTML w imieniu oraz za długie pola', () => {
    expect(validateCreator(creator({ name: 'Anna www.spam.pl' })).ok).toBe(false)
    expect(validateCreator(creator({ name: 'Anna2' })).ok).toBe(false)
    expect(validateCreator(creator({ name: 'A'.repeat(LIMITS.name + 1) })).ok).toBe(false)
    expect(validateCreator(creator({ when: 'x'.repeat(LIMITS.when + 1) })).ok).toBe(false)
    expect(validateCreator(creator({ notes: 'x'.repeat(LIMITS.notes + 1) })).ok).toBe(false)
    expect(validateCreator(creator({ notes: 'zobacz <script>alert(1)</script>' })).ok).toBe(false)
    expect(validateCreator(creator({ name: 'Anna-Maria O’Neil' })).ok).toBe(true)
  })

  it('odrzuca znaki sterujące i odwracanie kierunku tekstu', () => {
    expect(validateCreator(creator({ name: 'Anna‮anna' })).ok).toBe(false)
    expect(validateCreator(creator({ notes: 'tekst\u0000ukryty' })).ok).toBe(false)
    expect(validateCreator(creator({ when: 'czerwiec\n2027' })).ok).toBe(false)
  })

  it('odrzuca dane, które nie są obiektem', () => {
    expect(validateCreator(null).ok).toBe(false)
    expect(validateCreator(['a']).ok).toBe(false)
    expect(validateCreator('tekst').ok).toBe(false)
  })
})

describe('walidacja formularza kontaktowego', () => {
  it('przyjmuje naprawę z wiadomością', () => {
    const result = validateContact(contact())
    expect(result.ok).toBe(true)
  })

  it('wymaga wiadomości przy naprawie i innym pytaniu', () => {
    for (const topic of ['naprawa', 'inne']) {
      const result = validateContact(contact({ topic, message: '' }))
      expect(!result.ok && result.errors.message).toBe(MESSAGES.messageRequired)
    }
  })

  it('pomija pola innego tematu i sprawdza budżet z listy', () => {
    const result = validateContact(
      contact({ topic: 'naprawa', project: 'x'.repeat(500), budget: 'milion' }),
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.project).toBe('')
      expect(result.value.budget).toBe('')
    }
    const budget = validateContact(contact({ topic: 'nowy', budget: 'milion' }))
    expect(!budget.ok && budget.errors.budget).toBe(MESSAGES.choice)
    const okBudget = validateContact(contact({ topic: 'nowy', budget: '' }))
    expect(okBudget.ok && okBudget.value.budget).toBe('Jeszcze nie wiem')
  })

  it('odrzuca nieznany temat, zły e-mail i link w polu projektu', () => {
    expect(validateContact(contact({ topic: 'reklama' })).ok).toBe(false)
    expect(validateContact(contact({ email: 'to-nie-mail' })).ok).toBe(false)
    expect(
      validateContact(contact({ topic: 'kolekcja', project: 'https://spam.example' })).ok,
    ).toBe(false)
    const ok = validateContact(contact({ email: 'Anna@Example.PL' }))
    expect(ok.ok && ok.value.email).toBe('anna@example.pl')
  })
})
