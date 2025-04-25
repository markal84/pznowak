'use client'
import React, { useState } from 'react'
import Button from './Button'

// Podaj pełny URL do pliku send-contact.php na serwerze home.pl
const PHP_ENDPOINT = 'http://serwer1542079.home.pl/autoinstalator/wordpress/send-contact.php' // <-- UZUPEŁNIJ TEN ADRES

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' }) // website = honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    try {
      // Przygotuj dane jako application/x-www-form-urlencoded
      const formData = new URLSearchParams()
      Object.entries(form).forEach(([key, value]) => formData.append(key, value))
      const res = await fetch(PHP_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('success')
        setForm({ name: '', email: '', subject: '', message: '', website: '' })
      } else {
        setStatus('error')
        setError(data.error || 'Wystąpił błąd.')
      }
    } catch {
      setStatus('error')
      setError('Wystąpił błąd sieci.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">Imię i nazwisko</label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className="block w-full rounded border-gray-300 dark:border-gray-700 focus:border-brand-gold focus:ring-brand-gold dark:bg-gray-900 dark:text-white"
          value={form.name}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className="block w-full rounded border-gray-300 dark:border-gray-700 focus:border-brand-gold focus:ring-brand-gold dark:bg-gray-900 dark:text-white"
          value={form.email}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-medium mb-1">Temat</label>
        <input
          type="text"
          id="subject"
          name="subject"
          required
          className="block w-full rounded border-gray-300 dark:border-gray-700 focus:border-brand-gold focus:ring-brand-gold dark:bg-gray-900 dark:text-white"
          value={form.subject}
          onChange={handleChange}
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1">Wiadomość</label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="block w-full rounded border-gray-300 dark:border-gray-700 focus:border-brand-gold focus:ring-brand-gold dark:bg-gray-900 dark:text-white"
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
        className="w-full"
        variant="primary"
      >
        {status === 'sending' ? 'Wysyłanie...' : 'Wyślij wiadomość'}
      </Button>
      {status === 'success' && <p className="text-green-600 mt-2">Wiadomość została wysłana!</p>}
      {status === 'error' && <p className="text-red-600 mt-2">{error || 'Wystąpił błąd.'}</p>}
    </form>
  )
}
