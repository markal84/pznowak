import React, { useEffect, useRef } from 'react'

interface ContactMessageProps {
  success?: boolean
  error?: string | null
  onClose: () => void
}

const ContactMessage: React.FC<ContactMessageProps> = ({ success, error, onClose }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const okButtonRef = useRef<HTMLButtonElement | null>(null)
  const lastActive = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // zapamiętaj poprzedni fokus i przenieś do modala
    lastActive.current = (document.activeElement as HTMLElement) || null
    okButtonRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Tab') {
        // prosty focus trap: tylko element OK jest fokusowalny
        e.preventDefault()
        okButtonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // przywróć fokus
      lastActive.current?.focus()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-message-title"
        aria-describedby="contact-message-desc"
        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-sm text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {success ? (
          <>
            <div id="contact-message-title" className="text-green-600 text-lg font-semibold mb-2">Wiadomość została wysłana!</div>
            <div id="contact-message-desc" className="text-gray-700 dark:text-gray-200 mb-4">Dziękujemy za kontakt. Odpowiemy najszybciej jak to możliwe.</div>
          </>
        ) : (
          <>
            <div id="contact-message-title" className="text-red-600 text-lg font-semibold mb-2">Wystąpił błąd</div>
            <div id="contact-message-desc" className="text-gray-700 dark:text-gray-200 mb-4">{error || 'Wystąpił błąd podczas wysyłania wiadomości.'}</div>
          </>
        )}
        <button
          ref={okButtonRef}
          onClick={onClose}
          className="mt-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60"
          autoFocus
        >
          OK
        </button>
      </div>
    </div>
  )
}

export default ContactMessage
