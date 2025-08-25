'use client'
import React, { useRef, useState } from 'react'
import Button from './Button'
import ContactMessage from './ContactMessage'
const PHP_ENDPOINT = 'http://serwer1542079.home.pl/autoinstalator/wordpress/send-contact.php'

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
    // Email
    if (!form.email) {
      next.email = 'Podaj adres e-mail.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Wpisz poprawny adres e-mail.'
    }
    // Wiadomość
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
      // Połącz firstName i lastName w jedno pole name
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
        const data = await res.json()
        if (typeof window !== 'undefined') {
          // Prosty log diagnostyczny: status ack_ok z backendu (jeśli wdrożony)
          // Uwaga: pojawi się tylko, jeśli skrypt PHP zwraca 'ack_ok'
          // (wgrana aktualna wersja na serwer).
          // eslint-disable-next-line no-console
          console.log('[contact] response', data)
        }
        if (data.ok) {
          setStatus('success')
          setForm({ firstName:'', lastName:'', email:'', phone:'', message:'', website:'' })
          setModalSuccess(true)
          setModalError(null)
          setAckOk(Boolean((data as any).ack_ok))
          setShowModal(true)
          // focus zostanie przeniesiony do modala; po zamknięciu wróci na przycisk
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
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Imię</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              placeholder="Podaj imię (opcjonalnie)"
              className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--color-brand-gold)] focus:border-[var(--color-brand-gold)] px-3 py-3"
              value={form.firstName}
              onChange={handleChange}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Nazwisko</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              placeholder="Podaj nazwisko (opcjonalnie)"
              className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--color-brand-gold)] focus:border-[var(--color-brand-gold)] px-3 py-3"
              value={form.lastName}
              onChange={handleChange}
            />
          </div>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Email <span className="text-red-500">*</span></label>
          <input
            type="email"
            id="email"
            name="email"
            required
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="you@example.com"
            className={["block w-full rounded-md px-3 py-3",
              errors.email ?
                "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" :
                "border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--color-brand-gold)] focus:border-[var(--color-brand-gold)]"
            ].join(' ')}
            value={form.email}
            onChange={handleChange}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
          )}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Wykorzystamy tylko do kontaktu w sprawie Twojej wiadomości.</p>
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Telefon</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            autoComplete="tel"
            inputMode="tel"
            placeholder="(opcjonalnie)"
            className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--color-brand-gold)] focus:border-[var(--color-brand-gold)] px-3 py-3"
            value={form.phone}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Wiadomość <span className="text-red-500">*</span></label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            placeholder="Treść wiadomości..."
            className={["block w-full rounded-md px-3 py-3",
              errors.message ?
                "border-red-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" :
                "border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--color-brand-gold)] focus:border-[var(--color-brand-gold)]"
            ].join(' ')}
            value={form.message}
            onChange={handleChange}
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? 'message-error' : 'message-help'}
          />
          {errors.message ? (
            <p id="message-error" className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.message}</p>
          ) : (
            <p id="message-help" className="mt-1 text-sm text-gray-500 dark:text-gray-400">Napisz, czego potrzebujesz lub jaki masz pomysł.</p>
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
          className="w-full py-3 text-base disabled:opacity-70 disabled:cursor-not-allowed"
          variant="primary"
        >
          {status === 'sending' ? 'Wysyłanie...' : 'Wyślij wiadomość'}
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
            // przywróć focus na przycisk wyślij
            setTimeout(() => submitButtonRef.current?.focus(), 0)
          }}
        />
      )}
    </>
  )
}
