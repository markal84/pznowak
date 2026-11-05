'use client'

import { useEffect, useRef, useState } from 'react'
import { ATTACHMENTS_ENABLED, PREVIEW_NOTICE, RESPONSE_TIME, SITE, SUBMISSIONS_ENABLED, TURNSTILE_SITE_KEY } from '@/lib/site'
import {
  BUDGETS,
  BUDGET_AMOUNT,
  CONTACT_PREFERENCES,
  CONTACT_TOPICS as TOPICS,
  LIMITS,
  MEETING_MODES,
  MEETING_TOPICS,
  RING_DETAIL_TOPICS,
  RING_SIZES,
  RING_SIZE_KNOWN,
  ringSizeLabel,
  type BudgetId,
  type ContactPreferenceId,
  type ContactTopicId as TopicId,
  type RingSizeKnownId,
} from '@/lib/submissions/options'
import { validateContact } from '@/lib/submissions/validation'
import Attachments, { AttachmentsNote } from './Attachments'
import { effectiveMeeting, useContactPlan } from './ContactPlan'
import { FieldError, FormNotice, Honeypot, invalidProps } from './FormParts'
import Turnstile from './Turnstile'
import { useSubmission } from './useSubmission'

const MESSAGES: Record<TopicId, [string, string]> = {
  nowy: ['Opisz, czego szukasz', 'Opisz pierścionek lub obrączki: kamień, kolor złota, styl, dla kogo. Zdjęcie z internetu? Wklej link.'],
  kolekcja: ['Co chcesz zmienić w projekcie?', 'np. inny kamień, białe złoto, rozmiar do sprawdzenia'],
  obraczki: ['Coś jeszcze o obrączkach?', 'np. chcemy różne szerokości, grawer z datą, złoto po dziadkach'],
  naprawa: ['Co trzeba zrobić?', 'np. zmniejszyć pierścionek po babci i sprawdzić oprawę kamienia'],
  inne: ['Twoja wiadomość', 'W czym możemy pomóc?'],
}

const text = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

export default function ContactForm({
  initialTopic,
  project,
  choice,
  consentText,
}: {
  /** Temat na starcie (`initialContactTopic` z adresu strony). */
  initialTopic: TopicId
  project?: string
  choice?: string
  /** Treść zgody (z serwera; ta sama trafia do zapisu zgłoszenia). */
  consentText: string
}) {
  // Temat i forma rozmowy są wspólne ze stroną (kroki „Co dalej” w kolumnie obok): ContactPlan.tsx.
  const { topic, setTopic, meeting, setMeeting } = useContactPlan(initialTopic)
  const [sizeKnown, setSizeKnown] = useState<RingSizeKnownId>('unknown')
  const [budget, setBudget] = useState<BudgetId>(BUDGETS[0].id)
  const [contactBy, setContactBy] = useState<ContactPreferenceId>(CONTACT_PREFERENCES[0].id)
  const honeypot = useRef<HTMLInputElement>(null)
  const { sending, sent, notice, setNotice, fieldErrors, setFieldErrors, showErrors, submit, reset, attachmentsRef, attachmentsResult, turnstileProps } =
    useSubmission('kontakt', SUBMISSIONS_ENABLED)
  const [label, hint] = MESSAGES[topic]
  const ringDetails = RING_DETAIL_TOPICS.includes(topic)
  const asksMeeting = MEETING_TOPICS.includes(topic)
  const remote = effectiveMeeting(topic, meeting) === 'zdalnie'
  const emailRequired = contactBy === 'email'

  // Po wysłaniu przewijamy do karty „Wiadomość wysłana”, a po „Napisz kolejną” – na początek formularza.
  // Bez tego na telefonie karta zostaje ~1800 px nad ekranem i klient widzi stopkę.
  const cardRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const wasSent = useRef(sent)
  useEffect(() => {
    if (wasSent.current === sent) return
    wasSent.current = sent
    const target = sent ? cardRef.current : formRef.current
    if (!target) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' })
    // Fokus na karcie: czytnik ekranu ogłosi „Wiadomość wysłana”. preventScroll – przewinięcie już jest.
    if (sent) cardRef.current?.focus({ preventScroll: true })
  }, [sent])

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!SUBMISSIONS_ENABLED) {
      setNotice({ text: PREVIEW_NOTICE, tone: 'info', contact: true })
      return
    }
    const form = new FormData(event.currentTarget)
    const data = {
      topic,
      ...(asksMeeting ? { meeting } : {}),
      contactPreference: contactBy,
      occasionText: text(form, 'okazja'),
      when: text(form, 'data'),
      budget: topic === 'nowy' ? budget : '',
      budgetAmount: topic === 'nowy' && budget === 'kwota' ? text(form, 'kwota') : '',
      project: text(form, 'projekt'),
      weddingDate: text(form, 'slub'),
      bandChoice: text(form, 'wybor'),
      engraving: text(form, 'grawer'),
      ringSizeKnown: sizeKnown,
      ringSize: text(form, 'rozmiar'),
      message: text(form, 'wiadomosc'),
      name: text(form, 'imie'),
      phone: text(form, 'telefon'),
      email: text(form, 'email'),
      consent: form.get('zgoda') === 'on',
    }
    const checked = validateContact(data)
    if (!checked.ok) {
      showErrors(checked.errors)
      setNotice({ text: 'Sprawdź zaznaczone pola.', tone: 'error', contact: false })
      return
    }
    await submit(data, honeypot.current?.value ?? '')
  }

  const clearError = (key: string) => {
    if (!fieldErrors[key]) return
    const { [key]: _removed, ...rest } = fieldErrors
    setFieldErrors(rest)
  }

  if (sent) {
    return (
      <div className="sent-card" ref={cardRef} role="status" tabIndex={-1}>
        <span aria-hidden="true" className="hole" />
        <h2 className="h2" style={{ fontSize: 44, lineHeight: 1.05 }}>Wiadomość wysłana</h2>
        <p className="text" style={{ maxWidth: '32em' }}>
          Dziękujemy. Odezwiemy się {CONTACT_PREFERENCES.find((c) => c.id === contactBy)?.sent}, żeby ustalić
          termin rozmowy. {RESPONSE_TIME}
        </p>
        {/* ZLECENIE-B: wynik dołączania zdjęć (pusty, gdy klient ich nie dodawał). */}
        <AttachmentsNote result={attachmentsResult} />
        <button className="linkbtn" onClick={reset} style={{ alignSelf: 'flex-start' }} type="button">
          Napisz kolejną wiadomość
        </button>
      </div>
    )
  }

  const err = (key: string, id: string) => invalidProps(id, fieldErrors[key])

  return (
    <form
      aria-label="Formularz kontaktowy"
      className="stack contact-form"
      ref={formRef}
      noValidate
      onChange={(e) => clearError((e.target as unknown as HTMLElement).dataset.field ?? '')}
      onSubmit={onSubmit}
      style={{ gap: 36 }}
    >
      <fieldset className="plain">
        <legend>W jakiej sprawie piszesz?</legend>
        <div className="topics">
          {TOPICS.map((t) => (
            <label className={`topic${topic === t.id ? ' is-checked' : ''}`} key={t.id}>
              <input checked={topic === t.id} name="temat" onChange={() => setTopic(t.id)} type="radio" value={t.id} />
              <span className="t">{t.label}</span>
              <span className="h">{t.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {asksMeeting ? (
        <fieldset className="field">
          <legend className="lbl">Jak wolisz porozmawiać?</legend>
          <div className="choice-row">
            {MEETING_MODES.map((m) => (
              <label className="check" key={m.id}>
                <input checked={meeting === m.id} data-field="meeting" name="rozmowa" onChange={() => setMeeting(m.id)} type="radio" value={m.id} {...err('meeting', 'k-rozmowa-err')} />
                <span>{m.label}</span>
              </label>
            ))}
          </div>
          <FieldError id="k-rozmowa-err" message={fieldErrors.meeting} />
        </fieldset>
      ) : null}

      {topic === 'nowy' ? (
        <div className="form-grid">
          <div className="field">
            <label htmlFor="k-okazja">Okazja</label>
            <input className="fld" data-field="occasionText" id="k-okazja" maxLength={LIMITS.occasionText} name="okazja" placeholder="np. zaręczyny, rocznica" type="text" {...err('occasionText', 'k-okazja-err')} />
            <FieldError id="k-okazja-err" message={fieldErrors.occasionText} />
          </div>
          <div className="field">
            <label htmlFor="k-data">Na kiedy <span className="opt-note">(opcjonalnie)</span></label>
            <input className="fld" data-field="when" id="k-data" maxLength={LIMITS.when} name="data" placeholder="np. koniec czerwca" type="text" {...err('when', 'k-data-err')} />
            <FieldError id="k-data-err" message={fieldErrors.when} />
          </div>
          <div className="field">
            <label htmlFor="k-budzet">Budżet <span className="opt-note">(opcjonalnie)</span></label>
            <select className="fld" data-field="budget" id="k-budzet" name="budzet" onChange={(e) => setBudget(e.target.value as BudgetId)} value={budget} {...err('budget', 'k-budzet-err')}>
              {BUDGETS.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
            <FieldError id="k-budzet-err" message={fieldErrors.budget} />
          </div>
          {budget === 'kwota' ? (
            <div className="field">
              <label htmlFor="k-kwota">Kwota w złotych</label>
              <input autoComplete="off" className="fld" data-field="budgetAmount" id="k-kwota" inputMode="numeric" maxLength={BUDGET_AMOUNT.maxDigits + 2} name="kwota" pattern="[0-9 ]*" placeholder="np. 6000" type="text" {...err('budgetAmount', 'k-kwota-err')} />
              <span className="field-hint">Same cyfry, bez groszy.</span>
              <FieldError id="k-kwota-err" message={fieldErrors.budgetAmount} />
            </div>
          ) : null}
        </div>
      ) : null}

      {topic === 'kolekcja' ? (
        <div className="field" style={{ maxWidth: 420 }}>
          <label htmlFor="k-projekt">Który projekt Cię interesuje?</label>
          <input className="fld" data-field="project" defaultValue={project ?? ''} id="k-projekt" maxLength={LIMITS.project} name="projekt" placeholder="np. Phoebe" type="text" {...err('project', 'k-projekt-err')} />
          <span className="field-hint">Z karty pierścionka nazwa i wybrany kamień wpiszą się same.</span>
          <FieldError id="k-projekt-err" message={fieldErrors.project} />
        </div>
      ) : null}

      {topic === 'obraczki' ? (
        <div className="form-grid">
          <div className="field">
            <label htmlFor="k-slub">Data ślubu</label>
            <input className="fld" data-field="weddingDate" id="k-slub" maxLength={LIMITS.weddingDate} name="slub" placeholder="np. 14 czerwca" type="text" {...err('weddingDate', 'k-slub-err')} />
            <FieldError id="k-slub-err" message={fieldErrors.weddingDate} />
          </div>
          <div className="field">
            <label htmlFor="k-wybor">Wstępny wybór <span className="opt-note">(opcjonalnie)</span></label>
            <input className="fld" data-field="bandChoice" defaultValue={choice ?? ''} id="k-wybor" maxLength={LIMITS.bandChoice} name="wybor" placeholder="np. półokrągłe, 5 mm, żółte złoto" type="text" {...err('bandChoice', 'k-wybor-err')} />
            <FieldError id="k-wybor-err" message={fieldErrors.bandChoice} />
          </div>
        </div>
      ) : null}

      {topic === 'naprawa' ? (
        <p className="notice">
          Z naprawą możesz przyjść w godzinach otwarcia: od poniedziałku do piątku {SITE.hours[0].time}, w soboty {SITE.hours[1].time}.
          Formularz przyda się, jeśli chcesz najpierw zapytać o wycenę.
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="k-wiad">{label}</label>
        <textarea className="fld" data-field="message" id="k-wiad" maxLength={LIMITS.message} name="wiadomosc" placeholder={hint} rows={6} style={{ resize: 'vertical', lineHeight: 1.55 }} {...err('message', 'k-wiad-err')} />
        {topic === 'nowy' && !ATTACHMENTS_ENABLED ? (
          <span className="field-hint">
            Własne zdjęcie albo szkic wyślij na <a href={`mailto:${SITE.email}`}>{SITE.email}</a> i podpisz imieniem
            z formularza.
          </span>
        ) : null}
        <FieldError id="k-wiad-err" message={fieldErrors.message} />
      </div>

      {/* ZLECENIE-B: zdjęcia i szkice od klienta (przełącznik ATTACHMENTS_ENABLED). Jedyne miejsce, w którym
          formularz dotyka plików; obsługa wysyłki: useSubmission + components/site/Attachments.tsx. */}
      {ATTACHMENTS_ENABLED ? (
        <Attachments disabled={sending} error={fieldErrors.attachments} ref={attachmentsRef} />
      ) : null}

      {ringDetails ? (
        <div className="form-grid">
          <div className="field">
            <label htmlFor="k-grawer">Grawer <span className="opt-note">(opcjonalnie)</span></label>
            <input className="fld" data-field="engraving" id="k-grawer" maxLength={LIMITS.engraving} name="grawer" placeholder="np. A & M 14.06.2027" type="text" {...err('engraving', 'k-grawer-err')} />
            <span className="field-hint">Do {LIMITS.engraving} znaków, po wewnętrznej stronie.</span>
            <FieldError id="k-grawer-err" message={fieldErrors.engraving} />
          </div>
          <fieldset className="field">
            <legend className="lbl">Rozmiar</legend>
            <div className="choice-row">
              {RING_SIZE_KNOWN.map((o) => (
                <label className="check" key={o.id}>
                  <input checked={sizeKnown === o.id} data-field="ringSizeKnown" name="rozmiar_znany" onChange={() => setSizeKnown(o.id)} type="radio" value={o.id} />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
            {sizeKnown === 'known' ? (
              <>
                <select aria-label="Rozmiar w polskiej skali" className="fld" data-field="ringSize" defaultValue="" id="k-rozmiar" name="rozmiar" {...err('ringSize', 'k-rozmiar-err')}>
                  <option value="">Wybierz rozmiar</option>
                  {RING_SIZES.map((size) => (
                    <option key={size} value={size}>{ringSizeLabel(size)}</option>
                  ))}
                </select>
                <FieldError id="k-rozmiar-err" message={fieldErrors.ringSize} />
              </>
            ) : (
              <span className="field-hint">
                {remote
                  ? 'Nic nie szkodzi. Rozmiar zmierzy bez problemu każdy jubiler w Twojej okolicy, a przy niespodziance podpowiemy, jak sprawdzić go po cichu.'
                  : 'Nic nie szkodzi. Zmierzymy palec w pracowni, a przy niespodziance podpowiemy, jak sprawdzić rozmiar po cichu.'}
              </span>
            )}
            <FieldError id="k-rozmiar-znany-err" message={fieldErrors.ringSizeKnown} />
          </fieldset>
        </div>
      ) : null}

      <fieldset className="field">
        <legend className="lbl">Jak się z Tobą skontaktować?</legend>
        <div className="choice-row">
          {CONTACT_PREFERENCES.map((c) => (
            <label className="check" key={c.id}>
              <input checked={contactBy === c.id} data-field="contactPreference" name="kontakt" onChange={() => {
                setContactBy(c.id)
                // „Podaj e-mail” dotyczyło wyboru „E-mail”; po zmianie wyboru komunikat znika.
                clearError('email')
              }} type="radio" value={c.id} />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
        <FieldError id="k-kontakt-err" message={fieldErrors.contactPreference} />
      </fieldset>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="k-imie">Imię</label>
          <input autoComplete="given-name" className="fld" data-field="name" id="k-imie" maxLength={LIMITS.name} name="imie" type="text" {...err('name', 'k-imie-err')} />
          <FieldError id="k-imie-err" message={fieldErrors.name} />
        </div>
        <div className="field">
          <label htmlFor="k-tel">Telefon</label>
          <input autoComplete="tel" className="fld" data-field="phone" id="k-tel" maxLength={LIMITS.phone} name="telefon" type="tel" {...err('phone', 'k-tel-err')} />
          <FieldError id="k-tel-err" message={fieldErrors.phone} />
        </div>
        <div className="field">
          <label htmlFor="k-mail">E-mail{emailRequired ? null : <> <span className="opt-note">(opcjonalnie)</span></>}</label>
          <input aria-required={emailRequired || undefined} autoComplete="email" className="fld" data-field="email" id="k-mail" maxLength={LIMITS.email} name="email" type="email" {...err('email', 'k-mail-err')} />
          <FieldError id="k-mail-err" message={fieldErrors.email} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label className="check">
          <input data-field="consent" name="zgoda" type="checkbox" {...err('consent', 'k-zgoda-err')} />
          <span>{consentText}</span>
        </label>
        <FieldError id="k-zgoda-err" message={fieldErrors.consent} />
        {/* Widżet pojawia się tu tylko wtedy, gdy Cloudflare poprosi człowieka o interakcję. */}
        {SUBMISSIONS_ENABLED ? <Turnstile siteKey={TURNSTILE_SITE_KEY} {...turnstileProps} /> : null}
      </div>

      <Honeypot id="k-kontrolne" inputRef={honeypot} />

      <div className="row" style={{ gap: '14px 24px' }}>
        <button className="btn" disabled={sending} type="submit">
          {sending ? 'Wysyłanie…' : 'Wyślij wiadomość'}
        </button>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>{RESPONSE_TIME}</span>
      </div>
      <FormNotice notice={notice} />
    </form>
  )
}
