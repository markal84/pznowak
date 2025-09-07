import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FaPhone, FaEnvelope, FaFacebook, FaInstagram } from 'react-icons/fa'
import { FACEBOOK_URL, INSTAGRAM_URL, PHONE_NUMBER, EMAIL_ADDRESS } from '@/lib/socials'
import Container from './ui/Container'

const navLinks = [
  { href: '/', label: 'Główna' },
  { href: '/katalog', label: 'Katalog' },
  { href: '/o-nas', label: 'O nas' },
  { href: '/galeria', label: 'Galeria' },
  { href: '/kontakt', label: 'Kontakt' },
]

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-10 bg-[--color-surface] dark:bg-[#0d0d0e] border-t border-[color:rgba(184,134,11,0.20)] text-gray-700 dark:text-gray-300">
      <Container className="py-10">
        {/* Górna część: trzy sekcje jak w compare */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 text-center sm:text-left">
          {/* Logo + opis */}
          <div>
            <div className="flex items-center gap-3 mb-3 justify-center sm:justify-start">
              <Image src="/logo.png" alt="Logo Michał Nowak" width={140} height={40} className="h-auto w-[140px] dark:invert dark:hue-rotate-180" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xs mx-auto sm:mx-0">
              Rzemiosło tworzone przez pokolenia. Biżuteria personalizowana z dbałością o każdy detal.
            </p>
          </div>

          {/* Szybkie linki */}
          <div>
            <h4 className="font-serif text-base text-[var(--color-brand-gold)] mb-3">Szybkie linki</h4>
            <nav aria-label="Szybkie linki">
              <ul className="list-none space-y-2 sm:space-y-1">
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="link-subtle-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-[2px]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Kontakt */}
          <div>
            <h4 className="font-serif text-base text-[var(--color-brand-gold)] mb-3">Kontakt</h4>
            <ul className="list-none space-y-2 text-sm">
              <li>
                <a href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`} className="flex items-center gap-2 justify-center sm:justify-start mx-auto sm:mx-0 hover:text-brand-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-sm">
                  <FaPhone className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                  <span>{PHONE_NUMBER}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${EMAIL_ADDRESS}`} className="flex items-center gap-2 justify-center sm:justify-start mx-auto sm:mx-0 hover:text-brand-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-sm">
                  <FaEnvelope className="h-5 w-5 text-gray-400 dark:text-gray-500" aria-hidden="true" />
                  <span>{EMAIL_ADDRESS}</span>
                </a>
              </li>
              <li>
                <div className="flex items-center gap-4 pt-1 justify-center sm:justify-start">
                  <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="p-1 hover:text-brand-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-sm">
                    <FaFacebook className="h-6 w-6" />
                  </a>
                  <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-1 hover:text-brand-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-sm">
                    <FaInstagram className="h-6 w-6" />
                  </a>
                </div>
              </li>
            </ul>
          </div>

          {/* Godziny otwarcia */}
          <div>
            <h4 className="font-serif text-base text-[var(--color-brand-gold)] mb-3">Godziny otwarcia</h4>
            <ul className="list-none space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li><span className="text-gray-600 dark:text-gray-400">Poniedziałek–Piątek:</span> 8:00–16:00</li>
              <li><span className="text-gray-600 dark:text-gray-400">Sobota:</span> 10:00–16:00</li>
            </ul>
          </div>
        </div>

        {/* Dolna belka */}
        <div className="pt-6 border-t border-[color:rgba(184,134,11,0.10)] text-center text-xs text-gray-600 dark:text-gray-400">
          &copy; {currentYear} Michał Nowak Pracownia Złotnicza. Wszelkie prawa zastrzeżone.
        </div>
      </Container>
    </footer>
  )
}

export default Footer
