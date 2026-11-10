import { describe, expect, it } from 'vitest'

import { BUDGETS, MEETING_TOPICS, formatZloty } from '@/lib/submissions/options'
import { describeContact, rowsToText } from '@/lib/submissions/summary'
import { MESSAGES, parseBudgetAmount, validateContact } from '@/lib/submissions/validation'

/** Zlecenie X: budżet z kwotą, forma rozmowy (klient spoza Buska) i preferowany kontakt. */

const contact = (overrides: Record<string, unknown> = {}) => ({
  topic: 'nowy',
  meeting: 'pracownia',
  contactPreference: 'telefon',
  message: 'Pierścionek z szafirem.',
  name: 'Anna',
  phone: '501 321 347',
  email: '',
  consent: true,
  ...overrides,
})

describe('budżet', () => {
  it('przedziały z listy; brak odpowiedzi = „Jeszcze nie wiem”', () => {
    expect(BUDGETS.map((b) => b.label)).toEqual([
      'Jeszcze nie wiem',
      'do 4 000 zł',
      '4 000–10 000 zł',
      'powyżej 10 000 zł',
      'Podam kwotę',
    ])
    for (const budget of ['do-4000', '4000-10000', 'powyzej-10000']) {
      const result = validateContact(contact({ budget }))
      expect(result.ok && result.value.budget, budget).toBe(budget)
      expect(result.ok && result.value.budgetAmount).toBeNull()
    }
    const missing = validateContact(contact({ budget: undefined }))
    expect(missing.ok && missing.value.budget).toBe('nie-wiem')
    // dawna etykieta zamiast identyfikatora nie przechodzi
    const label = validateContact(contact({ budget: 'do 4 000 zł' }))
    expect(!label.ok && label.errors.budget).toBe(MESSAGES.choice)
  })

  it('„Podam kwotę”: tylko cyfry (spacje jako odstęp tysięcy), całe złote, najwyżej 7 cyfr', () => {
    for (const [raw, value] of [
      ['6000', 6000],
      [' 6 000 ', 6000],
      ['6 000', 6000],
      ['15000', 15000],
      ['9999999', 9_999_999],
      [4500, 4500],
    ] as const) {
      const result = validateContact(contact({ budget: 'kwota', budgetAmount: raw }))
      expect(result.ok && result.value.budgetAmount, String(raw)).toBe(value)
    }
    for (const raw of [
      '6000 zł',
      '6.000',
      '6,000',
      '6000,50',
      '-6000',
      '+6000',
      '1e4',
      '0',
      '000',
      '10000000',
      'sześć tysięcy',
      '<b>6000</b>',
      4500.5,
      -1,
      ['6000'],
      { value: 6000 },
    ]) {
      const result = validateContact(contact({ budget: 'kwota', budgetAmount: raw }))
      expect(!result.ok && result.errors.budgetAmount, JSON.stringify(raw)).toBe(
        MESSAGES.budgetAmount,
      )
    }
    for (const raw of [undefined, null, '', '   ']) {
      const result = validateContact(contact({ budget: 'kwota', budgetAmount: raw }))
      expect(!result.ok && result.errors.budgetAmount, String(raw)).toBe(
        MESSAGES.budgetAmountRequired,
      )
    }
    expect(parseBudgetAmount('x'.repeat(41))).toEqual({ error: MESSAGES.budgetAmount })
  })

  it('kwota bez „Podam kwotę” i budżet przy innych tematach są pomijane', () => {
    const range = validateContact(contact({ budget: 'do-4000', budgetAmount: '1e4' }))
    expect(range.ok && range.value.budgetAmount).toBeNull()
    for (const topic of ['kolekcja', 'obraczki', 'naprawa', 'inne']) {
      const result = validateContact(contact({ topic, budget: 'kwota', budgetAmount: 'abc' }))
      expect(result.ok, topic).toBe(true)
      if (result.ok) {
        expect(result.value.budget).toBe('')
        expect(result.value.budgetAmount).toBeNull()
      }
    }
  })

  it('w podsumowaniu etykieta przedziału albo kwota z odstępem tysięcy', () => {
    expect(formatZloty(6000)).toBe('6 000 zł')
    expect(formatZloty(950)).toBe('950 zł')
    expect(formatZloty(1250000)).toBe('1 250 000 zł')
    const amount = validateContact(contact({ budget: 'kwota', budgetAmount: '6000' }))
    if (!amount.ok) throw new Error('niepoprawne dane testu')
    const { name: _n, phone: _p, email: _e, message: _m, consent: _c, ...details } = amount.value
    expect(rowsToText(describeContact(details))).toContain(
      'Budżet: 6 000 zł (kwota podana przez klienta)',
    )
    const range = validateContact(contact({ budget: '4000-10000' }))
    if (!range.ok) throw new Error('niepoprawne dane testu')
    expect(rowsToText(describeContact(range.value))).toContain('Budżet: 4 000–10 000 zł')
  })
})

describe('Jak wolisz porozmawiać?', () => {
  it('wymagane przy zamówieniu, kolekcji, obrączkach i innym pytaniu; tylko wartości z listy', () => {
    expect(MEETING_TOPICS).toEqual(['nowy', 'kolekcja', 'obraczki', 'inne'])
    for (const topic of MEETING_TOPICS) {
      for (const meeting of ['pracownia', 'zdalnie']) {
        const result = validateContact(contact({ topic, meeting }))
        expect(result.ok && result.value.meeting, `${topic}/${meeting}`).toBe(meeting)
      }
      const missing = validateContact(contact({ topic, meeting: undefined }))
      expect(!missing.ok && missing.errors.meeting, topic).toBe(MESSAGES.meetingRequired)
      const wrong = validateContact(contact({ topic, meeting: 'wysylka' }))
      expect(!wrong.ok && wrong.errors.meeting, topic).toBe(MESSAGES.choice)
    }
  })

  it('przy naprawie (usługa na miejscu) pole jest pomijane, także błędne', () => {
    for (const meeting of [undefined, 'zdalnie', 'wysylka']) {
      const result = validateContact(contact({ topic: 'naprawa', meeting }))
      expect(result.ok && result.value.meeting, String(meeting)).toBe('')
    }
  })

  it('wybór trafia do podsumowania; przy rozmowie zdalnej rozmiar mierzy jubiler w okolicy klienta', () => {
    const remote = validateContact(contact({ meeting: 'zdalnie', ringSizeKnown: 'unknown' }))
    if (!remote.ok) throw new Error('niepoprawne dane testu')
    const text = rowsToText(describeContact(remote.value))
    expect(text).toContain('Rozmowa: Telefonicznie – mieszkam dalej')
    expect(text).toContain('Rozmiar: nie zna, zmierzy u jubilera w swojej okolicy')
    expect(text).not.toMatch(/wysył|miark/i)
    const local = validateContact(contact({ meeting: 'pracownia', ringSizeKnown: 'unknown' }))
    if (!local.ok) throw new Error('niepoprawne dane testu')
    expect(rowsToText(describeContact(local.value))).toContain(
      'Rozmiar: nie zna, zmierzymy w pracowni',
    )
  })
})

describe('Jak się z Tobą skontaktować?', () => {
  it('telefon, SMS albo e-mail; brak odpowiedzi = telefon; inne wartości to błąd', () => {
    for (const preference of ['telefon', 'sms', 'email']) {
      const result = validateContact(
        contact({ contactPreference: preference, email: 'anna@example.pl' }),
      )
      expect(result.ok && result.value.contactPreference, preference).toBe(preference)
    }
    const missing = validateContact(contact({ contactPreference: undefined }))
    expect(missing.ok && missing.value.contactPreference).toBe('telefon')
    const wrong = validateContact(contact({ contactPreference: 'golab' }))
    expect(!wrong.ok && wrong.errors.contactPreference).toBe(MESSAGES.choice)
  })

  it('przy „E-mail” adres jest wymagany; telefon jest wymagany zawsze', () => {
    const noEmail = validateContact(contact({ contactPreference: 'email', email: '' }))
    expect(!noEmail.ok && noEmail.errors.email).toBe(MESSAGES.emailRequired)
    const badEmail = validateContact(contact({ contactPreference: 'email', email: 'anna' }))
    expect(!badEmail.ok && badEmail.errors.email).toBe(MESSAGES.email)
    const ok = validateContact(contact({ contactPreference: 'email', email: 'Anna@Example.pl' }))
    expect(ok.ok && ok.value.email).toBe('anna@example.pl')
    for (const contactPreference of ['telefon', 'sms', 'email']) {
      const noPhone = validateContact(
        contact({ contactPreference, email: 'anna@example.pl', phone: '' }),
      )
      expect(!noPhone.ok && noPhone.errors.phone, contactPreference).toBe(MESSAGES.phoneRequired)
    }
    // przy telefonie i SMS-ie e-mail zostaje opcjonalny
    expect(validateContact(contact({ contactPreference: 'sms', email: '' })).ok).toBe(true)
  })

  it('preferencja trafia do podsumowania (karta w panelu i mail)', () => {
    const result = validateContact(contact({ contactPreference: 'sms' }))
    if (!result.ok) throw new Error('niepoprawne dane testu')
    expect(rowsToText(describeContact(result.value))).toContain('Preferowany kontakt: SMS')
  })
})
