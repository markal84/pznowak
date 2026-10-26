import React from 'react'
import Link from 'next/link'
import { FACEBOOK_URL, INSTAGRAM_URL, PHONE_NUMBER, EMAIL_ADDRESS, ADDRESS } from '@/lib/socials'

const navLinks = [
  { href: '/katalog', label: 'Katalog' },
  { href: '/o-nas', label: 'O nas' },
  { href: '/galeria', label: 'Galeria' },
  { href: '/kontakt', label: 'Kontakt' },
]

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="on-noir mt-[var(--space-section-md)]">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        {/* Górny pas: logotyp + zaproszenie */}
        <div className="py-16 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="flex flex-col leading-none">
              <span className="font-display text-3xl md:text-4xl text-[var(--cream)]">Michał Nowak</span>
              <span className="mt-2 text-[0.6rem] font-medium uppercase tracking-[0.42em] text-[var(--gold-soft)]">
                Pracownia Złotnicza
              </span>
            </div>
            <p className="mt-6 max-w-sm text-sm font-light leading-relaxed text-[var(--cream-dim)]">
              Pierścionki i biżuteria projektowane oraz wykonywane ręcznie,
              na indywidualne zamówienie — od rozmowy o pomyśle po gotowe dzieło.
            </p>
          </div>

          {/* Nawigacja */}
          <nav className="lg:col-span-2" aria-label="Stopka — nawigacja">
            <h4 className="eyebrow mb-5 !text-[var(--gold-soft)]">Menu</h4>
            <ul className="space-y-3 text-sm font-light text-[var(--cream-dim)]">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-subtle-hover">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Kontakt */}
          <div className="lg:col-span-3">
            <h4 className="eyebrow mb-5 !text-[var(--gold-soft)]">Kontakt</h4>
            <ul className="space-y-3 text-sm font-light text-[var(--cream-dim)]">
              <li>{ADDRESS}</li>
              <li>
                <a href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`} className="link-subtle-hover">{PHONE_NUMBER}</a>
              </li>
              <li>
                <a href={`mailto:${EMAIL_ADDRESS}`} className="link-subtle-hover">{EMAIL_ADDRESS}</a>
              </li>
              <li className="flex gap-5 pt-2 text-[0.6875rem] font-medium uppercase tracking-[0.24em]">
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="link-subtle-hover">Facebook</a>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="link-subtle-hover">Instagram</a>
              </li>
            </ul>
          </div>

          {/* Godziny */}
          <div className="lg:col-span-2">
            <h4 className="eyebrow mb-5 !text-[var(--gold-soft)]">Pracownia</h4>
            <ul className="space-y-3 text-sm font-light text-[var(--cream-dim)]">
              <li>Pon–Pt: 8:00–16:00</li>
              <li>Sobota: 10:00–16:00</li>
            </ul>
          </div>
        </div>

        {/* Dolna belka */}
        <div className="hairline-t py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[0.6875rem] font-light tracking-[0.08em] text-[var(--cream-dim)]">
          <span>&copy; {currentYear} Michał Nowak — Pracownia Złotnicza</span>
          <span className="uppercase tracking-[0.28em]">Busko-Zdrój</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
