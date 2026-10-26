"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FACEBOOK_URL, INSTAGRAM_URL, PHONE_NUMBER, EMAIL_ADDRESS } from '@/lib/socials'

interface NavLink {
  href: string
  label: string
}

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  links: NavLink[]
}

/** Pełnoekranowe menu w tonacji noir — duże serifowe pozycje, numeracja, kontakt na dole. */
const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, links }) => {
  const pathname = usePathname()

  return (
    <div
      id="mobile-menu"
      className={[
        'md:hidden fixed inset-0 z-40 on-noir flex flex-col',
        'transition-[opacity,visibility] duration-500 ease-[var(--ease-smooth)]',
        isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none',
      ].join(' ')}
      aria-hidden={!isOpen}
    >
      <nav
        aria-label="Menu główne"
        className="flex-1 flex flex-col justify-center px-8 pt-20"
      >
        <ul className="space-y-1">
          {links.map((link, i) => {
            const isActive = link.href === '/'
              ? pathname === '/'
              : pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <li
                key={link.href}
                className={[
                  'hairline-b transition-all duration-500 ease-[var(--ease-smooth)]',
                  isOpen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
                ].join(' ')}
                style={{ transitionDelay: isOpen ? `${120 + i * 70}ms` : '0ms' }}
              >
                <Link
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={onClose}
                  className="group flex items-baseline justify-between py-4 focus-visible:outline-none"
                >
                  <span
                    className={[
                      'font-display text-4xl font-light tracking-wide transition-colors',
                      isActive ? 'text-[var(--gold-soft)] italic' : 'text-[var(--cream)] group-hover:text-[var(--gold-soft)]',
                    ].join(' ')}
                  >
                    {link.label}
                  </span>
                  <span className="text-[0.625rem] font-medium tracking-[0.3em] text-[var(--cream-dim)]">
                    0{i + 1}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div
        className={[
          'px-8 pb-10 space-y-4 transition-all duration-500 ease-[var(--ease-smooth)]',
          isOpen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        ].join(' ')}
        style={{ transitionDelay: isOpen ? '520ms' : '0ms' }}
      >
        <div className="flex flex-col gap-1 text-sm font-light text-[var(--cream-dim)]">
          <a href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`} className="link-subtle-hover w-fit">{PHONE_NUMBER}</a>
          <a href={`mailto:${EMAIL_ADDRESS}`} className="link-subtle-hover w-fit">{EMAIL_ADDRESS}</a>
        </div>
        <div className="flex items-center gap-6 text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-[var(--cream-dim)]">
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="link-subtle-hover">Facebook</a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="link-subtle-hover">Instagram</a>
        </div>
      </div>
    </div>
  )
}

export default MobileMenu
