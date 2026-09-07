'use client'
import React, { useRef, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Button from './Button'
import ContactMessage from './ContactMessage'

const PHP_ENDPOINT = process.env.NEXT_PUBLIC_PHP_ENDPOINT || 'http://serwer1542079.home.pl/autoinstalator/pznowak/send-contact.php'

const field =
  'block w-full rounded border border-line-strong bg-paper text-ink text-base px-4 py-3.5 placeholder:text-ink-3 focus:border-gold focus:ring-2 focus:ring-gold/40 focus:outline-none'
const fieldError = 'border-red-600 focus:border-red-600 focus:ring-red-600/30'
const label = 'block text-sm font-semibold mb-1.5'

export default function ContactForm() {
  const params = useSearchParams()
  const projekt = params.get('projekt')

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', message: '', website: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [showModal, setShowModal] = useState(false)
  const [modalSuccess, setModalSuccess] = useState<boolean | undefined>(undefined)
  const [modalError, setModalError] = useState<string | null>(null)
  const [ackOk, setAckOk] = useState<boolean | undefined>(undefined)
  const [errors, setErrors] = useState<{ [k: string]: string }>({})
  const submitButtonRef = useRef<HTMLButtonElement | null>(null)

  // Prefill wiadomości, gdy użytkownik przyszedł z karty produktu
  useEffect(() => {
    if (projekt) {
      setForm((f) => (f.message ? f : { ...f, message: `Dzień dobry, interesuje mnie pierścionek „${projekt}”. ` }))
    }
  }, [projekt])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (errors[e.target.name]) setErrors((er) => ({ ...er, [e.target.name]: '' }))
  }

  const validate = () => {
    const next: { [k: string]: string } = {}
    if (!form.email) next.email = 'Podaj adres e-mail, żebyśmy mogli odpowiedzieć.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Ten adres e-mail wygląda na niepoprawny.'
    if (!form.message) next.message = 'Napisz kilka słów o tym, czego szukasz.'
    else if (form.message.trim().length < 10) next.message = 'Wiadomość powinna mieć co najmniej 10 znaków.'
    return next
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setStatus('error')
      const first = Object.keys(nextErrors)[0]
      document.getElementById(first)?.focus()
      return
    }
    setStatus('sending')
    try {
      const body = new URLSearchParams()
      body.append('name', (form.firstName + ' ' + form.lastName).trim())
      body.append('email', form.email)
      body.append('subject', projekt ? `Zapytanie o pierścionek ${projekt} (pznowak.pl)` : 'Wiadomość z formularza pznowak.pl')
      body.append('message', form.message)
      body.append('website', form.website)
      body.append('phone', form.phone)
      const res = await fetch(PHP_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
      type ContactResponse = { ok: boolean; error?: string; ack_ok?: boolean }
      const data: ContactResponse = await res.json()
      if (data.ok) {
        setStatus('success')
        setForm({ firstName: '', lastName: '', email: '', phone: '', message: '', website: '' })
        setModalSuccess(true); setModalError(null); setAckOk(Boolean(data.ack_ok)); setShowModal(true)
      } else {
        setStatus('error'); setModalSuccess(false); setModalError(data.error || 'Wystąpił błąd serwera.'); setAckOk(undefined); setShowModal(true)
      }
    } catch {
      setStatus('error'); setModalSuccess(false); setModalError('Nie udało się wysłać wiadomości. Zadzwoń do nas lub spróbuj ponownie za chwilę.'); setAckOk(undefined); setShowModal(true)
    }
  }

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">
        {status === 'sending' && 'Wysyłanie wiadomości...'}
        {status === 'success' && 'Wiadomość została wysłana.'}
        {status === 'error' && 'Formularz zawiera błędy lub wysyłka się nie powiodła.'}
      </div>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="firstName" className={label}>Imię <span className="font-normal muted">(opcjonalnie)</span></label>
            <input type="text" id="firstName" name="firstName" autoComplete="given-name" className={field} value={form.firstName} onChange={handleChange} />
          </div>
          <div>
            <label htmlFor="lastName" className={label}>Nazwisko <span className="font-normal muted">(opcjonalnie)</span></label>
            <input type="text" id="lastName" name="lastName" autoComplete="family-name" className={field} value={form.lastName} onChange={handleChange} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="email" className={label}>E-mail <span className="text-red-600" aria-hidden>*</span></label>
            <input
              type="email" id="email" name="email" required autoComplete="email" inputMode="email" autoCapitalize="none" autoCorrect="off"
              placeholder="np. anna@poczta.pl"
              className={[field, errors.email ? fieldError : ''].join(' ')}
              value={form.email} onChange={handleChange}
              aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && <p id="email-error" className="mt-1.5 text-sm text-red-700">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="phone" className={label}>Telefon <span className="font-normal muted">(opcjonalnie)</span></label>
            <input type="tel" id="phone" name="phone" autoComplete="tel" inputMode="tel" placeholder="np. 600 000 000" className={field} value={form.phone} onChange={handleChange} />
          </div>
        </div>
        <div>
          <label htmlFor="message" className={label}>Wiadomość <span className="text-red-600" aria-hidden>*</span></label>
          <textarea
            id="message" name="message" required rows={6}
            placeholder="Dla kogo ma być pierścionek, jaki styl, jaki budżet. Może być krótko."
            className={[field, errors.message ? fieldError : ''].join(' ')}
            value={form.message} onChange={handleChange}
            aria-invalid={!!errors.message} aria-describedby={errors.message ? 'message-error' : 'message-help'}
          />
          {errors.message ? (
            <p id="message-error" className="mt-1.5 text-sm text-red-700">{errors.message}</p>
          ) : (
            <p id="message-help" className="mt-1.5 text-sm muted">Nie musisz znać się na kamieniach. Opowiedz, co jest dla Ciebie ważne.</p>
          )}
        </div>
        <div style={{ display: 'none' }} aria-hidden="true">
          <label htmlFor="website">Zostaw to pole puste</label>
          <input type="text" id="website" name="website" autoComplete="off" tabIndex={-1} value={form.website} onChange={handleChange} />
        </div>
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
          <Button ref={submitButtonRef} type="submit" size="lg" disabled={status === 'sending'} className="w-full sm:w-auto">
            {status === 'sending' ? 'Wysyłanie…' : 'Wyślij wiadomość'}
          </Button>
          <p className="text-sm muted">Twoje dane wykorzystamy tylko, aby odpowiedzieć na wiadomość.</p>
        </div>
      </form>
      {showModal && (
        <ContactMessage
          success={modalSuccess}
          error={modalError}
          ackOk={ackOk}
          onClose={() => { setShowModal(false); setAckOk(undefined); setTimeout(() => submitButtonRef.current?.focus(), 0) }}
        />
      )}
    </>
  )
}
