'use client'
import React, { useState } from 'react'
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
  const [error, setError] = useState<string|null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalSuccess, setModalSuccess] = useState<boolean|undefined>(undefined)
  const [modalError, setModalError] = useState<string|null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setError(null)
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
      if (data.ok) {
        setStatus('success')
        setForm({ firstName:'', lastName:'', email:'', phone:'', message:'', website:'' })
        setModalSuccess(true)
        setModalError(null)
        setShowModal(true)
      } else {
        setStatus('error')
        setError(data.error || 'Wystąpił błąd serwera.')
        setModalSuccess(false)
        setModalError(data.error || 'Wystąpił błąd serwera.')
        setShowModal(true)
      }
    } catch {
      setStatus('error')
      setError('Wystąpił błąd sieci.')
      setModalSuccess(false)
      setModalError('Wystąpił błąd sieci.')
      setShowModal(true)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-xl shadow-md border border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Imię</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              placeholder="Podaj imię (opcjonalnie)"
              className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
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
              className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
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
            placeholder="you@example.com"
            className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            value={form.email}
            onChange={handleChange}
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-200">Telefon</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            autoComplete="tel"
            placeholder="(opcjonalnie)"
            className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
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
            className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 px-3 py-2"
            value={form.message}
            onChange={handleChange}
          />
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
          type="submit"
          disabled={status === 'sending'}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200"
          variant="primary"
        >
          {status === 'sending' ? 'Wysyłanie...' : 'Wyślij wiadomość'}
        </Button>
      </form>
      {showModal && (
        <ContactMessage
          success={modalSuccess}
          error={modalError}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}