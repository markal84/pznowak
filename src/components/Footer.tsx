import React from 'react'
import { FaPhone, FaEnvelope, FaFacebook, FaInstagram } from 'react-icons/fa'
import { FACEBOOK_URL, INSTAGRAM_URL, PHONE_NUMBER, EMAIL_ADDRESS } from '@/lib/socials'

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm mt-10">
      <div className="container mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left font-serif text-xs">
          &copy; {currentYear} Michał Nowak Pracownia Złotnicza. Wszelkie prawa zastrzeżone.
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
          <a href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`} className="flex items-center gap-2 hover:text-brand-gold transition-colors">
            <FaPhone className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            <span>{PHONE_NUMBER}</span>
          </a>
          <a href={`mailto:${EMAIL_ADDRESS}`} className="flex items-center gap-2 hover:text-brand-gold transition-colors">
            <FaEnvelope className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            <span>{EMAIL_ADDRESS}</span>
          </a>
        </div>
        <div className="flex items-center gap-6 md:gap-4">
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-brand-gold transition-colors">
            <FaFacebook className="h-6 w-6" />
          </a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-brand-gold transition-colors">
            <FaInstagram className="h-6 w-6" />
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer