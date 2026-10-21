'use client'

import type { Ref } from 'react'
import { SITE } from '@/lib/site'
import type { Notice } from './useSubmission'

/** Komunikat pod formularzem; przy błędach, których nie da się poprawić na stronie, dopisuje telefon i e-mail. */
export function FormNotice({ notice }: { notice: Notice | null }) {
  if (!notice) return null
  return (
    <p
      className={`notice ${notice.tone === 'error' ? 'notice-error' : 'notice-preview'}`}
      role={notice.tone === 'error' ? 'alert' : 'status'}
    >
      {notice.text}
      {notice.contact ? (
        <>
          {' '}
          <a href={SITE.phoneHref}>{SITE.phone}</a> ·{' '}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </>
      ) : null}
    </p>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <span className="field-error" id={id}>
      {message}
    </span>
  )
}

/** Atrybuty pola z błędem: czytnik ekranu odczyta komunikat razem z polem. */
export function invalidProps(id: string, message?: string) {
  return message ? { 'aria-invalid': true as const, 'aria-describedby': id } : {}
}

/**
 * Pole-pułapka (honeypot): niewidoczne, poza kolejnością tabulacji i niedostępne dla czytników ekranu.
 * Człowiek go nie wypełni; bot wypełniający wszystkie pola zostanie odrzucony przez serwer.
 */
export function Honeypot({ id, inputRef }: { id: string; inputRef: Ref<HTMLInputElement> }) {
  return (
    <div aria-hidden="true" className="hp-field" inert>
      <label htmlFor={id}>Zostaw to pole puste</label>
      <input
        autoComplete="off"
        defaultValue=""
        id={id}
        name="pole_kontrolne"
        ref={inputRef}
        tabIndex={-1}
        type="text"
      />
    </div>
  )
}
