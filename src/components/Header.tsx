'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import MobileMenu from './MobileMenu'
import { useWindowScroll } from '@uidotdev/usehooks'
import { usePathname } from 'next/navigation'

const navLinks = [
  { href: '/', label: 'Główna' },
  { href: '/katalog', label: 'Katalog' },
  { href: '/o-nas', label: 'O nas' },
  { href: '/galeria', label: 'Galeria' },
  { href: '/kontakt', label: 'Kontakt' },
]

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [{ y }] = useWindowScroll()
  const isScrolled = (y ?? 0) > 8
  const pathname = usePathname()
  // Strony z ciemnym hero — header w wersji jasnej, dopóki nie przewinięto
  const normalizedPath = pathname !== '/' ? pathname.replace(/\/$/, '') : '/'
  const hasDarkHero = normalizedPath === '/' || normalizedPath === '/o-nas'
  const onDark = isMenuOpen || (hasDarkHero && !isScrolled)

  // Zamknij menu przy zmianie ścieżki
  useEffect(() => { setIsMenuOpen(false) }, [pathname])

  // Escape zamyka menu (a11y) + blokada scrolla pod pełnoekranowym menu
  useEffect(() => {
    if (!isMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.documentElement.style.overflow = ''
    }
  }, [isMenuOpen])

  return (
    <>
      <header
        className={[
          'fixed top-0 inset-x-0 z-50 transition-all duration-300',
          onDark ? 'header-on-dark' : '',
          isMenuOpen
            ? 'bg-transparent'
            : isScrolled
              ? 'bg-[color:rgba(246,243,236,0.92)] backdrop-blur-md hairline-b'
              : 'bg-transparent',
        ].join(' ')}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div
            className={[
              'flex items-center justify-between transition-all duration-300',
              isScrolled ? 'h-16 md:h-[68px]' : 'h-[76px] md:h-[84px]',
            ].join(' ')}
          >
            {/* Logotyp tekstowy */}
            <Link
              href="/"
              className={[
                'group flex flex-col leading-none focus-visible:outline-none',
                onDark ? 'text-[var(--cream)]' : 'text-[var(--ink)]',
              ].join(' ')}
              aria-label="Michał Nowak — Pracownia Złotnicza, strona główna"
            >
              <span className="font-display text-[1.45rem] md:text-2xl tracking-[0.02em]">
                Michał&nbsp;Nowak
              </span>
              <span
                className={[
                  'mt-1 text-[0.56rem] font-medium uppercase tracking-[0.42em]',
                  onDark ? 'text-[var(--gold-soft)]' : 'text-[var(--gold)]',
                ].join(' ')}
              >
                Pracownia Złotnicza
              </span>
            </Link>

            {/* Nawigacja desktop */}
            <nav className="hidden md:block" aria-label="Nawigacja główna">
              <ul className="flex items-center gap-9">
                {navLinks.map((link) => {
                  const isActive = link.href === '/'
                    ? pathname === '/'
                    : pathname === link.href || pathname.startsWith(link.href + '/')
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={['nav-link-hover', isActive ? 'nav-link-active' : ''].join(' ')}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {link.label}
                      </Link>
                    </li>
                  )
                })}
                <li>
                  <Link href="/kontakt" className="btn btn-outline !px-6 !py-3 text-[0.6875rem]">
                    Umów rozmowę
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Przycisk menu (mobile) */}
            <button
              onClick={() => setIsMenuOpen((v) => !v)}
              className={[
                'md:hidden relative z-50 flex items-center gap-3 p-2 focus-visible:outline-none',
                onDark ? 'text-[var(--cream)]' : 'text-[var(--ink)]',
              ].join(' ')}
              aria-label={isMenuOpen ? 'Zamknij menu' : 'Otwórz menu'}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className="text-[0.6875rem] font-medium uppercase tracking-[0.3em]">
                {isMenuOpen ? 'Zamknij' : 'Menu'}
              </span>
              <span className="flex w-6 flex-col gap-[6px]" aria-hidden="true">
                <span className={`block h-px w-full bg-current transition-transform duration-300 ${isMenuOpen ? 'translate-y-[3.5px] rotate-45' : ''}`} />
                <span className={`block h-px w-full bg-current transition-transform duration-300 ${isMenuOpen ? '-translate-y-[3.5px] -rotate-45' : ''}`} />
              </span>
            </button>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} links={navLinks} />
    </>
  )
}

export default Header
