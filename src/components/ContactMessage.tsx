import React, { useEffect, useRef } from 'react'

interface Props { success?: boolean; error?: string | null; ackOk?: boolean; onClose: () => void }

const ContactMessage: React.FC<Props> = ({ success, error, ackOk, onClose }) => {
  const okButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    okButtonRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'Tab') { e.preventDefault(); okButtonRef.current?.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-labelledby="contact-message-title" aria-describedby="contact-message-desc"
        className="bg-paper rounded-lg shadow-lg p-8 w-full max-w-md text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <span className={['mx-auto h-12 w-12 rounded-full flex items-center justify-center', success ? 'bg-gold-soft text-gold' : 'bg-red-50 text-red-700'].join(' ')} aria-hidden>
          {success ? '✓' : '!'}
        </span>
        {success ? (
          <>
            <h2 id="contact-message-title" className="mt-4 text-2xl">Dziękujemy, wiadomość dotarła</h2>
            <p id="contact-message-desc" className="mt-2 muted">Odpowiemy najszybciej, jak to możliwe, zwykle w ciągu jednego dnia roboczego.</p>
            {ackOk && <p className="mt-2 text-sm muted">Wysłaliśmy potwierdzenie na Twój e-mail.</p>}
          </>
        ) : (
          <>
            <h2 id="contact-message-title" className="mt-4 text-2xl">Nie udało się wysłać</h2>
            <p id="contact-message-desc" className="mt-2 muted">{error || 'Wystąpił błąd podczas wysyłania wiadomości.'}</p>
          </>
        )}
        <button ref={okButtonRef} onClick={onClose} className="mt-6 h-12 px-8 rounded bg-ink text-ivory font-semibold hover:bg-graphite-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold">
          Zamknij
        </button>
      </div>
    </div>
  )
}

export default ContactMessage
