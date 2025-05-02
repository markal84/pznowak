import React, { useEffect } from 'react'

interface ContactMessageProps {
  success?: boolean
  error?: string | null
  onClose: () => void
}

const ContactMessage: React.FC<ContactMessageProps> = ({ success, error, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-sm text-center">
        {success ? (
          <>
            <div className="text-green-600 text-lg font-semibold mb-2">Wiadomość została wysłana!</div>
            <div className="text-gray-700 dark:text-gray-200 mb-4">Dziękujemy za kontakt. Odpowiemy najszybciej jak to możliwe.</div>
          </>
        ) : (
          <>
            <div className="text-red-600 text-lg font-semibold mb-2">Wystąpił błąd</div>
            <div className="text-gray-700 dark:text-gray-200 mb-4">{error || 'Wystąpił błąd podczas wysyłania wiadomości.'}</div>
          </>
        )}
        <button
          onClick={onClose}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  )
}

export default ContactMessage
