'use client'
import React, { useRef, useState } from 'react'
import Button from './Button'
import ContactMessage from './ContactMessage'
const PHP_ENDPOINT = process.env.NEXT_PUBLIC_PHP_ENDPOINT || 'https://serwer1542079.home.pl/autoinstalator/pznowak/send-contact.php'

export default function ContactForm() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: '',
    website: '', // honeypot
  })
  const [status, setStatus] = useState<'idle'|'sending'|'success'|'error'>('idle')
  const [showModal, setShowModal] = useState(false)
  const [modalSuccess, setModalSuccess] = useState<boolean|undefined>(undefined)
  const [modalError, setModalError] = useState<string|null>(null)
  const submitButtonRef = useRef<HTMLButtonElement | null>(null)
  const [ackOk, setAckOk] = useState<boolean | undefined>(undefined)

  const [errors, setErrors] = useState<{ [k: string]: string }>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const validate = () => {
    const next: { [k: string]: string } = {}
    if (!form.email) {
      next.email = 'Podaj adres e-mail.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Wpisz poprawny adres e-mail.'
    }
    if (!form.message) {
      next.message = 'Napisz kilka słów wiadomości.'
    } else if (form.message.trim().length < 10) {
      next.message = 'Wiadomość powinna mieć min. 10 znaków.'
    }
    return next
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setStatus('error')
      return
    }
    setStatus('sending')
    try {
      const body = new URLSearchParams()
      body.append('name', (form.firstName + ' ' + form.lastName).trim())
      body.append('email', form.email)
      body.append('subject', 'Wiadomość z formularza pznowak.pl')
      body.append('message', form.message)
      body.append('website', form.website)
      body.append('phone', form.phone)
      const res = await fetch(PHP_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
      type ContactResponse = { ok: boolean; error?: string; ack_ok?: boolean }
      const data: ContactResponse = await res.json()
      if (data.ok) {
        setStatus('success')
        setForm({ firstName:'', lastName:'', email:'', phone:'', message:'', website:'' })
        setModalSuccess(true)
        setModalError(null)
        setAckOk(Boolean(data.ack_ok))
        setShowModal(true)
      } else {
        setStatus('error')
        setModalSuccess(false)
        setModalError(data.error || 'Wystąpił błąd serwera.')
        setAckOk(undefined)
        setShowModal(true)
      }
    } catch {
      setStatus('error')
      setModalSuccess(false)
      setModalError('Wystąpił błąd sieci.')
      setAckOk(undefined)
      setShowModal(true)
    }
  }

  return (
    <>
      {/* Live status region (a11y) */}
      <div role="status" aria-live="polite" className="sr-only">
        {status === 'sending' && 'Wysyłanie wiadomości...'}
        {status === 'success' && 'Wiadomość została wysłana.'}
        {status === 'error' && 'Wystąpił błąd wysyłki.'}
      </div>
      <form onSubmit={handleSubmit} className="space-y-9">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-9">
          <div>
            <label htmlFor="firstName" className="field-label">Imię</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              placeholder="Opcjonalnie"
              className="field-line mt-1"
              value={form.firstName}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="field-label">Nazwisko</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              placeholder="Opcjonalnie"
              className="field-line mt-1"
              value={form.lastName}
              onChange={handleChange}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-9">
          <div>
            <label htmlFor="email" className="field-label">E-mail *</label>
            <input
              type="email"
              id="email"
              name="email"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="ty@przyklad.pl"
              className="field-line mt-1"
              value={form.email}
              onChange={handleChange}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="mt-2 text-sm font-light text-[#a23b2e]">{errors.email}</p>
            )}
          </div>
          <div>
            <label htmlFor="phone" className="field-label">Telefon</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              autoComplete="tel"
              inputMode="tel"
              placeholder="Opcjonalnie"
              className="field-line mt-1"
              value={form.phone}
              onChange={handleChange}
            />
          </div>
        </div>
        <div>
          <label htmlFor="message" className="field-label">Wiadomość *</label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            placeholder="Opowiedz o okazji, pomyśle, kamieniu, budżecie — o czymkolwiek, od czego chcesz zacząć."
            className="field-line mt-1 resize-y"
            value={form.message}
            onChange={handleChange}
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? 'message-error' : 'message-help'}
          />
          {errors.message ? (
            <p id="message-error" className="mt-2 text-sm font-light text-[#a23b2e]">{errors.message}</p>
          ) : (
            <p id="message-help" className="mt-2 text-sm font-light text-[var(--ink-faint)]">
              Odpowiadamy zwykle w ciągu 1–2 dni roboczych.
            </p>
          )}
        </div>
        {/* Honeypot (pole ukryte) */}
        <div style={{ display: 'none' }} aria-hidden="true">
          <label htmlFor="website">Zostaw to pole puste</label>
          <input
            type="text"
            id="website"
            name="website"
            autoComplete="off"
            tabIndex={-1}
            value={form.website}
            onChange={handleChange}
          />
        </div>
        <Button
          ref={submitButtonRef}
          type="submit"
          disabled={status === 'sending'}
          className="w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
          variant="primary"
        >
          {status === 'sending' ? 'Wysyłanie…' : 'Wyślij wiadomość'}
        </Button>
      </form>
      {showModal && (
        <ContactMessage
          success={modalSuccess}
          error={modalError}
          ackOk={ackOk}
          onClose={() => {
            setShowModal(false)
            setAckOk(undefined)
            setTimeout(() => submitButtonRef.current?.focus(), 0)
          }}
        />
      )}
    </>
  )
}
