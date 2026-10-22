import type { CutId, GemId, MetalId, PaveId, SettingId, WidthId } from '../ring-geometry'
import {
  BUDGETS,
  CONTACT_TOPICS,
  CUT_IDS,
  GEM_IDS,
  LIMITS,
  METALS,
  OCCASIONS,
  PAVES,
  RING_DETAIL_TOPICS,
  RING_SIZES,
  RING_SIZE_KNOWN,
  SETTINGS,
  WIDTHS,
  type ContactTopicId,
  type OccasionId,
  type RingSizeKnownId,
} from './options'

/**
 * Walidacja zgłoszeń z kreatora i formularza kontaktowego. Ten sam kod sprawdza dane w przeglądarce
 * (podpowiedzi przy polach, bez zużywania tokenu Turnstile) i na serwerze (jedyna wiążąca kontrola).
 */

export type FieldErrors = Record<string, string>
export type Validation<T> = { ok: true; value: T } | { ok: false; errors: FieldErrors }

export type CreatorSubmission = {
  occasion: OccasionId
  when: string
  gem: GemId
  cut: CutId
  setting: SettingId
  metal: MetalId
  width: WidthId
  pave: PaveId
  engraving: string
  name: string
  /** Znormalizowany: „+48 501 321 347” albo zagraniczny „+49 30 1234 5678”. */
  phone: string
  notes: string
  consent: true
}

export type ContactSubmission = {
  topic: ContactTopicId
  occasionText: string
  when: string
  budget: string
  project: string
  weddingDate: string
  bandChoice: string
  /** Grawer i rozmiar tylko przy tematach z RING_DETAIL_TOPICS; przy innych puste. */
  engraving: string
  ringSizeKnown: RingSizeKnownId | ''
  /** Polska skala (RING_SIZES); pusty, gdy klient nie zna rozmiaru. */
  ringSize: string
  message: string
  name: string
  phone: string
  email: string
  consent: true
}

// Znaki sterujące, odwracanie kierunku tekstu (bidi) i znaki z zakresu C1. Zwykłe emoji przechodzą.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F‪-‮⁦-⁩]/
const LINE_BREAK = /[\t\r\n]/
const HTML = /<\s*\/?\s*[a-z!?]/i
const LINK =
  /(?:[a-z][a-z0-9+.-]*:\/\/|\b(?:javascript|data|vbscript):|www\.|\b[\p{L}\p{N}-]+\.(?:pl|com|net|org|eu|io|info|biz|xyz|ru|de|uk|co|me|app|link|site|online|shop|top|store|click)\b|[^\s@]+@[^\s@]+\.[^\s@]+)/iu
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} '’.-]*$/u
const ENGRAVING = /^[\p{L}\p{M}\p{N} &.,\-'’+!?:()♥∞]*$/u
const EMAIL = /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]{2,}$/
const PHONE_CHARS = /^[+\d\s().\/-]+$/

export const MESSAGES = {
  type: 'Nieprawidłowa wartość.',
  choice: 'Wybierz jedną z opcji.',
  tooLong: (max: number) => `Maksymalnie ${max} znaków.`,
  control: 'Pole zawiera niedozwolone znaki.',
  html: 'Usuń znaczniki HTML.',
  link: 'W tym polu nie może być linków ani adresów e-mail.',
  nameRequired: 'Podaj imię.',
  nameInvalid: 'Wpisz imię literami (bez cyfr i znaków specjalnych).',
  phoneRequired: 'Podaj numer telefonu.',
  phoneInvalid:
    'Sprawdź numer telefonu, np. 501 321 347. Zagraniczny wpisz z kierunkowym, np. +49 30 1234 5678.',
  email: 'Sprawdź adres e-mail.',
  engraving: "Grawer może mieć litery, cyfry, spacje i znaki: & . , - ' + ! ? : ( ) ♥ ∞",
  consent: 'Zaznacz zgodę na kontakt, żebyśmy mogli oddzwonić.',
  messageRequired: 'Napisz, w czym możemy pomóc.',
  ringSizeRequired: 'Wybierz rozmiar albo zaznacz „Nie znam”.',
  ringSize: `Wybierz rozmiar z listy (polska skala ${RING_SIZES[0]}–${RING_SIZES[RING_SIZES.length - 1]}).`,
} as const

const length = (value: string) => [...value].length

type TextRule = { max: number; multiline?: boolean; links?: boolean }

/** Zwraca oczyszczony tekst albo komunikat błędu. Pusta wartość to pusty tekst (wymagalność sprawdza wywołujący). */
function text(raw: unknown, rule: TextRule): { value: string } | { error: string } {
  if (raw === undefined || raw === null) return { value: '' }
  if (typeof raw !== 'string') return { error: MESSAGES.type }
  let value = raw.normalize('NFC').trim()
  if (rule.multiline) {
    value = value.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n')
  } else if (LINE_BREAK.test(value)) {
    return { error: MESSAGES.control }
  } else {
    value = value.replace(/\s+/g, ' ')
  }
  if (CONTROL.test(value)) return { error: MESSAGES.control }
  if (length(value) > rule.max) return { error: MESSAGES.tooLong(rule.max) }
  if (HTML.test(value)) return { error: MESSAGES.html }
  if (!rule.links && LINK.test(value)) return { error: MESSAGES.link }
  return { value }
}

function choice<T extends string>(raw: unknown, allowed: readonly T[]): T | null {
  return typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? (raw as T) : null
}

/** Polski numer (bez kierunkowego albo z +48) lub zagraniczny z kierunkowym kraju. */
export function normalizePhone(raw: string): string | null {
  return normalizePolishPhone(raw) ?? normalizeForeignPhone(raw)
}

/**
 * Numer zagraniczny: „+” albo „00”, kierunkowy kraju i razem 8–15 cyfr (E.164); separatory jak w polskim,
 * „(0)” po kierunkowym (np. Wielka Brytania) jest pomijane. +48 sprawdza wyłącznie reguła polska.
 * Zwraca „+” i cyfry w grupach wpisanych przez klienta, np. „+49 151 2345 6789”, albo null.
 */
export function normalizeForeignPhone(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || length(trimmed) > LIMITS.phone || !PHONE_CHARS.test(trimmed)) return null
  const spaced = trimmed
    .replace(/\(0\)/g, ' ')
    .replace(/[\s().\/-]+/g, ' ')
    .trim()
  const match = /^(?:\+|0 ?0) ?([1-9][\d ]*)$/.exec(spaced)
  if (!match) return null
  const digits = match[1].replace(/ /g, '')
  if (digits.length < 8 || digits.length > 15 || digits.startsWith('48')) return null
  return `+${match[1]}`
}

/**
 * Polski numer: 9 cyfr, opcjonalnie +48 / 0048 / dawne 0 na początku; spacje, myślniki i nawiasy są dozwolone.
 * Zwraca postać „+48 501 321 347” albo null.
 */
export function normalizePolishPhone(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || length(trimmed) > LIMITS.phone || !PHONE_CHARS.test(trimmed)) return null
  const compact = trimmed.replace(/[\s().\/-]/g, '')
  const match = /^(?:\+48|0048|0)?([1-9]\d{8})$/.exec(compact)
  if (!match) return null
  const d = match[1]
  return `+48 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`
}

/** Grawer: ta sama reguła w kreatorze i w formularzu kontaktowym (limit znaków, bez linków i HTML, dozwolone znaki). */
function engravingField(raw: unknown, errors: FieldErrors): string {
  const engraving = text(raw, { max: LIMITS.engraving })
  if ('error' in engraving) errors.engraving = engraving.error
  else if (!ENGRAVING.test(engraving.value)) errors.engraving = MESSAGES.engraving
  else return engraving.value
  return ''
}

function asRecord(input: unknown): Record<string, unknown> | null {
  return input && typeof input === 'object' && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : null
}

/** Imię, telefon i zgoda: wspólne dla obu formularzy. */
function contactFields(data: Record<string, unknown>, errors: FieldErrors) {
  const name = text(data.name, { max: LIMITS.name })
  let nameValue = ''
  if ('error' in name) errors.name = name.error
  else if (!name.value) errors.name = MESSAGES.nameRequired
  else if (length(name.value) < 2 || !NAME.test(name.value)) errors.name = MESSAGES.nameInvalid
  else nameValue = name.value

  let phoneValue = ''
  if (data.phone !== undefined && data.phone !== null && typeof data.phone !== 'string')
    errors.phone = MESSAGES.type
  else if (!String(data.phone ?? '').trim()) errors.phone = MESSAGES.phoneRequired
  else {
    const normalized = normalizePhone(String(data.phone))
    if (normalized) phoneValue = normalized
    else errors.phone = MESSAGES.phoneInvalid
  }

  if (data.consent !== true) errors.consent = MESSAGES.consent
  return { name: nameValue, phone: phoneValue }
}

export function validateCreator(input: unknown): Validation<CreatorSubmission> {
  const data = asRecord(input)
  if (!data) return { ok: false, errors: { form: MESSAGES.type } }
  const errors: FieldErrors = {}

  const occasion = choice(
    data.occasion,
    OCCASIONS.map((o) => o.id),
  )
  const gem = choice(data.gem, GEM_IDS)
  const cut = choice(data.cut, CUT_IDS)
  const setting = choice(
    data.setting,
    SETTINGS.map((s) => s.id),
  )
  const metal = choice(
    data.metal,
    METALS.map((m) => m.id),
  )
  const width = choice(
    data.width,
    WIDTHS.map((w) => w.id),
  )
  const pave = choice(
    data.pave,
    PAVES.map((p) => p.id),
  )
  for (const [key, value] of Object.entries({ occasion, gem, cut, setting, metal, width, pave })) {
    if (!value) errors[key] = MESSAGES.choice
  }

  const when = text(data.when, { max: LIMITS.when })
  if ('error' in when) errors.when = when.error

  const engraving = engravingField(data.engraving, errors)

  const notes = text(data.notes, { max: LIMITS.notes, multiline: true, links: true })
  if ('error' in notes) errors.notes = notes.error

  const person = contactFields(data, errors)

  if (Object.keys(errors).length) return { ok: false, errors }
  return {
    ok: true,
    value: {
      occasion: occasion!,
      when: 'value' in when ? when.value : '',
      gem: gem!,
      cut: cut!,
      setting: setting!,
      metal: metal!,
      width: width!,
      pave: pave!,
      engraving,
      name: person.name,
      phone: person.phone,
      notes: 'value' in notes ? notes.value : '',
      consent: true,
    },
  }
}

export function validateContact(input: unknown): Validation<ContactSubmission> {
  const data = asRecord(input)
  if (!data) return { ok: false, errors: { form: MESSAGES.type } }
  const errors: FieldErrors = {}

  const topic = choice(
    data.topic,
    CONTACT_TOPICS.map((t) => t.id),
  )
  if (!topic) errors.topic = MESSAGES.choice

  // Pola zależne od tematu; pola innych tematów są pomijane, nawet jeśli przyszły w żądaniu.
  const pick = (key: string, active: boolean, max: number) => {
    if (!active) return ''
    const result = text(data[key], { max })
    if ('error' in result) {
      errors[key] = result.error
      return ''
    }
    return result.value
  }
  const occasionText = pick('occasionText', topic === 'nowy', LIMITS.occasionText)
  const when = pick('when', topic === 'nowy', LIMITS.when)
  const project = pick('project', topic === 'kolekcja', LIMITS.project)
  const weddingDate = pick('weddingDate', topic === 'obraczki', LIMITS.weddingDate)
  const bandChoice = pick('bandChoice', topic === 'obraczki', LIMITS.bandChoice)

  // Grawer i rozmiar: tylko przy pierścionku lub obrączkach do wykonania. Brak odpowiedzi o rozmiar = „nie znam”.
  const ringDetails = topic !== null && RING_DETAIL_TOPICS.includes(topic)
  const engraving = ringDetails ? engravingField(data.engraving, errors) : ''
  let ringSizeKnown: RingSizeKnownId | '' = ''
  let ringSize = ''
  if (ringDetails) {
    const raw =
      data.ringSizeKnown === undefined || data.ringSizeKnown === null || data.ringSizeKnown === ''
        ? 'unknown'
        : data.ringSizeKnown
    const known = choice(
      raw,
      RING_SIZE_KNOWN.map((o) => o.id),
    )
    if (!known) errors.ringSizeKnown = MESSAGES.choice
    else {
      ringSizeKnown = known
      if (known === 'known') {
        const size = choice(data.ringSize, RING_SIZES)
        if (size) ringSize = size
        else
          errors.ringSize =
            data.ringSize === undefined || data.ringSize === null || data.ringSize === ''
              ? MESSAGES.ringSizeRequired
              : MESSAGES.ringSize
      }
    }
  }

  let budget = ''
  if (topic === 'nowy') {
    const raw =
      data.budget === undefined || data.budget === null || data.budget === ''
        ? BUDGETS[0]
        : data.budget
    const value = choice(raw, BUDGETS)
    if (value) budget = value
    else errors.budget = MESSAGES.choice
  }

  const message = text(data.message, { max: LIMITS.message, multiline: true, links: true })
  let messageValue = ''
  if ('error' in message) errors.message = message.error
  else if (!message.value && (topic === 'naprawa' || topic === 'inne'))
    errors.message = MESSAGES.messageRequired
  else messageValue = message.value

  const email = text(data.email, { max: LIMITS.email, links: true })
  let emailValue = ''
  if ('error' in email) errors.email = email.error
  else if (email.value && !EMAIL.test(email.value)) errors.email = MESSAGES.email
  else emailValue = email.value.toLowerCase()

  const person = contactFields(data, errors)

  if (Object.keys(errors).length) return { ok: false, errors }
  return {
    ok: true,
    value: {
      topic: topic!,
      occasionText,
      when,
      budget,
      project,
      weddingDate,
      bandChoice,
      engraving,
      ringSizeKnown,
      ringSize,
      message: messageValue,
      name: person.name,
      phone: person.phone,
      email: emailValue,
      consent: true,
    },
  }
}
