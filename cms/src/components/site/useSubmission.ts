'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { ResponseCode, SubmissionResponse } from '@/lib/submissions/handler'
import type { FormKind } from '@/lib/submissions/options'
import type { FieldErrors } from '@/lib/submissions/validation'
import type { TurnstileHandle } from './Turnstile'

/**
 * Wysyłka kreatora i formularza kontaktowego do /api/zgloszenia.
 * Pobiera podpisany token otwarcia formularza, czeka na token Turnstile i na minimalny czas wypełnienia
 * (człowiek tego nie zauważy), a po odpowiedzi serwera pokazuje komunikat lub błędy pól.
 * Gdy Turnstile nie da tokenu, zgłoszenie i tak idzie z flagą `turnstileUnavailable`: serwer sprawdza,
 * czy Cloudflare naprawdę nie działa (wtedy kwarantanna), a jeśli działa, odpowiada `verification_failed`.
 */

export type Notice = { text: string; tone: 'error' | 'info'; contact: boolean }

type FormToken = { token: string; receivedAt: number; minMs: number; maxAgeMs: number }

const TURNSTILE_WAIT_MS = 15_000
// Po błędzie widżetu (np. zablokowany skrypt) nie każemy człowiekowi czekać 15 s na nic.
const TURNSTILE_WAIT_AFTER_ERROR_MS = 4_000
const REFRESH_MARGIN_MS = 10 * 60 * 1000

const CLIENT_MESSAGES = {
  network:
    'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie albo zadzwoń lub napisz:',
  unknown: 'Coś poszło nie tak po naszej stronie. Zadzwoń lub napisz:',
}

// Przy tych odpowiedziach numer telefonu i e-mail pod komunikatem nic nie wnoszą.
const NO_CONTACT: ResponseCode[] = ['invalid', 'too_fast', 'expired']

/** Serwer odpowiedział komunikatem dla człowieka (np. wysyłka wyłączona), a nie zabrakło sieci. */
class ServerMessage extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function useSubmission(form: FormKind, enabled: boolean) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const turnstile = useRef<TurnstileHandle>(null)
  const turnstileToken = useRef<string | null>(null)
  const turnstileFailed = useRef(false)
  const waiters = useRef<Array<(token: string | null) => void>>([])
  const formToken = useRef<FormToken | null>(null)
  const focusInvalid = useRef(false)

  // Po pokazaniu błędów fokus przechodzi do pierwszego błędnego pola (klawiatura, czytnik ekranu).
  useEffect(() => {
    if (!focusInvalid.current) return
    focusInvalid.current = false
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [fieldErrors])

  const showErrors = useCallback((errors: FieldErrors) => {
    focusInvalid.current = true
    setFieldErrors(errors)
  }, [])

  const fetchFormToken = useCallback(async () => {
    const response = await fetch(`/api/zgloszenia?form=${form}`, { cache: 'no-store' })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as SubmissionResponse | null
      throw new ServerMessage(body?.message ?? CLIENT_MESSAGES.unknown)
    }
    const data = (await response.json()) as { token: string; minMs: number; maxAgeMs: number }
    formToken.current = { ...data, receivedAt: Date.now() }
    return formToken.current
  }, [form])

  useEffect(() => {
    if (enabled) fetchFormToken().catch(() => undefined)
  }, [enabled, fetchFormToken])

  const onTurnstileToken = useCallback((token: string | null) => {
    turnstileToken.current = token
    if (!token) return
    turnstileFailed.current = false
    waiters.current.splice(0).forEach((resolve) => resolve(token))
  }, [])

  const onTurnstileError = useCallback(() => {
    turnstileFailed.current = true
    waiters.current.splice(0).forEach((resolve) => resolve(null))
  }, [])

  const waitForTurnstile = () =>
    turnstileToken.current
      ? Promise.resolve(turnstileToken.current)
      : new Promise<string | null>((resolve) => {
          const done = (token: string | null) => {
            clearTimeout(timer)
            resolve(token)
          }
          const timer = setTimeout(
            () => {
              waiters.current = waiters.current.filter((w) => w !== done)
              resolve(null)
            },
            turnstileFailed.current ? TURNSTILE_WAIT_AFTER_ERROR_MS : TURNSTILE_WAIT_MS,
          )
          waiters.current.push(done)
        })

  /** Zwraca true, gdy pracownia przyjęła zgłoszenie. */
  const submit = async (data: Record<string, unknown>, honeypot: string): Promise<boolean> => {
    if (sending) return false
    setSending(true)
    setNotice(null)
    setFieldErrors({})
    try {
      let token = formToken.current
      if (!token || Date.now() - token.receivedAt > token.maxAgeMs - REFRESH_MARGIN_MS)
        token = await fetchFormToken()

      const turnstileValue = await waitForTurnstile()
      const wait = token.minMs + 300 - (Date.now() - token.receivedAt)
      if (wait > 0) await sleep(wait)

      const response = await fetch('/api/zgloszenia', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          form,
          formToken: token.token,
          turnstileToken: turnstileValue ?? '',
          ...(turnstileValue ? {} : { turnstileUnavailable: true }),
          honeypot,
          data,
        }),
      })
      const body = (await response.json().catch(() => null)) as SubmissionResponse | null
      if (response.status === 201 && body?.ok) {
        turnstileToken.current = null
        setSent(true)
        return true
      }
      // Błąd pól nie zużywa tokenu Turnstile; każda inna odpowiedź mogła go zużyć.
      if (body?.code !== 'invalid') turnstile.current?.reset()
      if (body?.code === 'expired') formToken.current = null
      if (body?.fields) showErrors(body.fields)
      setNotice({
        text: body?.message ?? CLIENT_MESSAGES.unknown,
        tone: 'error',
        contact: !body || !NO_CONTACT.includes(body.code),
      })
      return false
    } catch (error) {
      turnstile.current?.reset()
      setNotice({
        text: error instanceof ServerMessage ? error.message : CLIENT_MESSAGES.network,
        tone: 'error',
        contact: true,
      })
      return false
    } finally {
      setSending(false)
    }
  }

  const reset = () => {
    setSent(false)
    setNotice(null)
    setFieldErrors({})
    fetchFormToken().catch(() => undefined)
  }

  return {
    sending,
    sent,
    notice,
    setNotice,
    fieldErrors,
    setFieldErrors,
    showErrors,
    submit,
    reset,
    turnstileProps: {
      ref: turnstile,
      action: form,
      onToken: onTurnstileToken,
      onError: onTurnstileError,
    },
  }
}
