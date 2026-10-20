'use client'

import { useState } from 'react'
import { PREVIEW_NOTICE, SITE, SUBMISSIONS_ENABLED } from '@/lib/site'

const TOPICS = [
  { id: 'nowy', label: 'Nowy pierścionek', hint: 'Projekt od podstaw' },
  { id: 'kolekcja', label: 'Projekt z kolekcji', hint: 'W Twoim rozmiarze lub z innym kamieniem' },
  { id: 'obraczki', label: 'Obrączki ślubne', hint: 'Przymiarka dla Was dwojga' },
  { id: 'naprawa', label: 'Naprawa lub przeróbka', hint: 'Rozmiar, oprawa, rodzinne złoto' },
  { id: 'inne', label: 'Inne pytanie', hint: 'Wszystko, czego nie ma wyżej' },
] as const

type TopicId = (typeof TOPICS)[number]['id']

const MESSAGES: Record<TopicId, [string, string]> = {
  nowy: ['Opowiedz o pomyśle', 'Dla kogo jest pierścionek? Co ta osoba lubi nosić? Masz zdjęcia inspiracji? Dołączysz je przy rozmowie.'],
  kolekcja: ['Co chcesz zmienić w projekcie?', 'np. inny kamień, białe złoto, rozmiar do sprawdzenia'],
  obraczki: ['Coś jeszcze o obrączkach?', 'np. chcemy różne szerokości, grawer z datą, złoto po dziadkach'],
  naprawa: ['Co trzeba zrobić?', 'np. zmniejszyć pierścionek po babci i sprawdzić oprawę kamienia'],
  inne: ['Twoja wiadomość', 'W czym możemy pomóc?'],
}

function isTopic(value: string | undefined): value is TopicId {
  return TOPICS.some((t) => t.id === value)
}

export default function ContactForm({
  initialTopic,
  project,
  choice,
}: {
  initialTopic?: string
  project?: string
  choice?: string
}) {
  const [topic, setTopic] = useState<TopicId>(isTopic(initialTopic) ? initialTopic : project ? 'kolekcja' : 'nowy')
  const [notice, setNotice] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [label, hint] = MESSAGES[topic]

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!SUBMISSIONS_ENABLED) {
      setNotice(PREVIEW_NOTICE)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="sent-card" role="status">
        <span aria-hidden="true" className="hole" />
        <h2 className="h2" style={{ fontSize: 44, lineHeight: 1.05 }}>Wiadomość wysłana</h2>
        <p className="text" style={{ maxWidth: '32em' }}>
          Dziękujemy. Oddzwonimy w godzinach pracy pracowni, żeby ustalić termin rozmowy.
        </p>
        <button className="linkbtn" onClick={() => setSent(false)} style={{ alignSelf: 'flex-start' }} type="button">
          Napisz kolejną wiadomość
        </button>
      </div>
    )
  }

  return (
    <form aria-label="Formularz kontaktowy" className="stack" onSubmit={onSubmit} style={{ gap: 36 }}>
      <fieldset className="plain">
        <legend>W jakiej sprawie piszesz?</legend>
        <div className="topics">
          {TOPICS.map((t) => (
            <label className="topic" key={t.id}>
              <input checked={topic === t.id} name="temat" onChange={() => setTopic(t.id)} type="radio" value={t.id} />
              <span className="t">{t.label}</span>
              <span className="h">{t.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {topic === 'nowy' ? (
        <div className="form-grid">
          <div className="field">
            <label htmlFor="k-okazja">Okazja</label>
            <input className="fld" id="k-okazja" name="okazja" placeholder="np. zaręczyny, rocznica" type="text" />
          </div>
          <div className="field">
            <label htmlFor="k-data">Na kiedy <span className="opt-note">(opcjonalnie)</span></label>
            <input className="fld" id="k-data" name="data" placeholder="np. koniec czerwca" type="text" />
          </div>
          <div className="field">
            <label htmlFor="k-budzet">Budżet <span className="opt-note">(opcjonalnie)</span></label>
            <select className="fld" id="k-budzet" name="budzet">
              <option>Jeszcze nie wiem</option>
              <option>[przedział 1]</option>
              <option>[przedział 2]</option>
              <option>[przedział 3]</option>
            </select>
          </div>
        </div>
      ) : null}

      {topic === 'kolekcja' ? (
        <div className="field" style={{ maxWidth: 420 }}>
          <label htmlFor="k-projekt">Który projekt Cię interesuje?</label>
          <input className="fld" defaultValue={project ?? ''} id="k-projekt" name="projekt" placeholder="np. Phoebe" type="text" />
          <span className="field-hint">Z karty pierścionka nazwa wpisze się sama.</span>
        </div>
      ) : null}

      {topic === 'obraczki' ? (
        <div className="form-grid">
          <div className="field">
            <label htmlFor="k-slub">Data ślubu</label>
            <input className="fld" id="k-slub" name="slub" placeholder="np. 14 czerwca" type="text" />
          </div>
          <div className="field">
            <label htmlFor="k-wybor">Wstępny wybór <span className="opt-note">(opcjonalnie)</span></label>
            <input className="fld" defaultValue={choice ?? ''} id="k-wybor" name="wybor" placeholder="np. komfort, 5 mm, matowe, żółte złoto" type="text" />
          </div>
        </div>
      ) : null}

      {topic === 'naprawa' ? (
        <p className="notice">
          Z naprawą możesz przyjść w godzinach otwarcia: od poniedziałku do piątku 8:00–16:00, w soboty 10:00–16:00.
          Formularz przyda się, jeśli chcesz najpierw zapytać o wycenę.
        </p>
      ) : null}

      <div className="field">
        <label htmlFor="k-wiad">{label}</label>
        <textarea className="fld" id="k-wiad" name="wiadomosc" placeholder={hint} rows={6} style={{ resize: 'vertical', lineHeight: 1.55 }} />
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="k-imie">Imię</label>
          <input autoComplete="given-name" className="fld" id="k-imie" name="imie" type="text" />
        </div>
        <div className="field">
          <label htmlFor="k-tel">Telefon</label>
          <input autoComplete="tel" className="fld" id="k-tel" name="telefon" type="tel" />
        </div>
        <div className="field">
          <label htmlFor="k-mail">E-mail <span className="opt-note">(opcjonalnie)</span></label>
          <input autoComplete="email" className="fld" id="k-mail" name="email" type="email" />
        </div>
      </div>

      <label className="check">
        <input name="zgoda" type="checkbox" />
        <span>Zgadzam się na kontakt w sprawie mojej wiadomości. Dane przetwarzamy tylko w tym celu. Polityka prywatności [wkrótce]</span>
      </label>

      <div className="row" style={{ gap: '14px 24px' }}>
        <button className="btn" type="submit">Wyślij wiadomość</button>
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>Oddzwonimy w godzinach pracy pracowni.</span>
      </div>
      {notice ? (
        <p className="notice notice-preview" role="status">
          {notice} <a href={SITE.phoneHref}>{SITE.phone}</a> · <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>
      ) : null}
    </form>
  )
}
