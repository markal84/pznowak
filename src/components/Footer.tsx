import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FaPhone, FaEnvelope, FaFacebook, FaInstagram, FaMapMarkerAlt } from 'react-icons/fa'
import { FACEBOOK_URL, INSTAGRAM_URL, PHONE_NUMBER, EMAIL_ADDRESS, ADDRESS, MAP_LINK, OPENING_HOURS } from '@/lib/socials'

const navLinks = [
  { href: '/', label: 'Strona główna' },
  { href: '/katalog', label: 'Katalog' },
  { href: '/o-nas', label: 'O pracowni' },
  { href: '/galeria', label: 'Galeria' },
  { href: '/kontakt', label: 'Kontakt' },
]

const Footer = () => {
  const year = new Date().getFullYear()
  const telHref = `tel:${PHONE_NUMBER.replace(/[^+\d]/g, '')}`
  const link = 'inline-flex items-center gap-3 py-1 text-[#f3efe6]/85 hover:text-gold-2 transition-colors'

  return (
    <footer className="section-dark">
      <div className="container-x pt-14 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          <div className="lg:col-span-4">
            <Image src="/logo.png" alt="Michał Nowak – logo" width={200} height={106} className="h-auto w-[150px] invert" />
            <p className="mt-5 max-w-xs muted text-[15px] leading-relaxed">
              Rodzinna pracownia złotnicza. Od 1890 roku wykonujemy biżuterię ręcznie, według indywidualnych projektów.
            </p>
            <div className="mt-5 flex items-center gap-4">
              <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-[#f3efe6]/80 hover:text-gold-2 transition-colors"><FaFacebook className="h-6 w-6" /></a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-[#f3efe6]/80 hover:text-gold-2 transition-colors"><FaInstagram className="h-6 w-6" /></a>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h2 className="eyebrow font-sans mb-4">Nawigacja</h2>
            <ul className="space-y-1.5">
              {navLinks.map((l) => (
                <li key={l.href}><Link href={l.href} className={link}>{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h2 className="eyebrow font-sans mb-4">Kontakt</h2>
            <ul className="space-y-2">
              <li><a href={telHref} className={link}><FaPhone className="h-4 w-4 text-gold-2 shrink-0" aria-hidden />{PHONE_NUMBER}</a></li>
              <li><a href={`mailto:${EMAIL_ADDRESS}`} className={link}><FaEnvelope className="h-4 w-4 text-gold-2 shrink-0" aria-hidden />{EMAIL_ADDRESS}</a></li>
              <li><a href={MAP_LINK} target="_blank" rel="noopener noreferrer" className={link}><FaMapMarkerAlt className="h-4 w-4 text-gold-2 shrink-0" aria-hidden />{ADDRESS}</a></li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h2 className="eyebrow font-sans mb-4">Godziny otwarcia</h2>
            <dl className="space-y-2">
              {OPENING_HOURS.map((h) => (
                <div key={h.days} className="flex justify-between gap-4 border-b hairline pb-2">
                  <dt className="muted">{h.days}</dt>
                  <dd className="font-medium">{h.hours}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t hairline flex flex-col sm:flex-row gap-2 justify-between text-sm muted">
          <span>© {year} Michał Nowak Pracownia Złotnicza. Wszelkie prawa zastrzeżone.</span>
          <span>Busko-Zdrój, ul. Kilińskiego 12</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
