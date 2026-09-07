'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import MobileMenu from './MobileMenu'
import { FaPhone } from 'react-icons/fa'
import { PHONE_NUMBER } from '@/lib/socials'

export const navLinks = [
  { href: '/', label: 'Strona główna' },
  { href: '/katalog', label: 'Katalog' },
  { href: '/o-nas', label: 'O pracowni' },
  { href: '/galeria', label: 'Galeria' },
  { href: '/kontakt', label: 'Kontakt' },
]

export function isActivePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')
}

/**
 * Nagłówek o STAŁEJ wysokości (--header-height). Zmienia się tylko tło/cień po przewinięciu,
 * więc treść pod nim nigdy nie „skacze”. Na stronie głównej leży na hero (przezroczysty),
 * po przewinięciu staje się jasny.
 */
const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const onHero = pathname === '/' && !scrolled && !menuOpen

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const close = useCallback(() => setMenuOpen(false), [])
  const telHref = `tel:${PHONE_NUMBER.replace(/[^+\d]/g, '')}`

  return (
    <>
      <header
        className={[
          'fixed top-0 inset-x-0 z-50 h-[var(--header-height)] transition-[background-color,box-shadow,border-color] duration-300',
          onHero
            ? 'header-on-hero bg-transparent border-b border-transparent'
            : 'bg-ivory/95 backdrop-blur border-b border-line',
          menuOpen ? 'bg-ivory' : '',
        ].join(' ')}
      >
        <div className="container-x h-full flex items-center justify-between gap-6">
          <Link href="/" className="flex items-center shrink-0" aria-label="Pracownia Złotnicza Michał Nowak – strona główna">
            <Image
              src="/logo.png"
              alt="Michał Nowak – logo"
              width={200}
              height={106}
              priority
              className={['h-auto w-[132px] md:w-[150px] transition-[filter] duration-300', onHero ? 'invert' : ''].join(' ')}
            />
          </Link>

          <nav className="hidden md:block" aria-label="Menu główne">
            <ul className="flex items-center gap-7 lg:gap-9">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="nav-link" aria-current={isActivePath(pathname, l.href) ? 'page' : undefined}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <a
            href={telHref}
            className={[
              'hidden md:inline-flex items-center gap-2 h-11 px-4 rounded border text-sm font-semibold tracking-wide transition-colors',
              onHero
                ? 'border-white/40 text-white hover:bg-white/10'
                : 'border-line-strong text-ink hover:border-gold hover:text-gold',
            ].join(' ')}
          >
            <FaPhone className="h-4 w-4" aria-hidden />
            {PHONE_NUMBER}
          </a>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={['md:hidden inline-flex items-center gap-2 h-11 px-2 -mr-2', onHero ? 'text-white' : 'text-ink'].join(' ')}
            aria-label={menuOpen ? 'Zamknij menu' : 'Otwórz menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <span className="text-xs font-semibold tracking-[0.18em] uppercase">{menuOpen ? 'Zamknij' : 'Menu'}</span>
            <span className="relative w-6 h-5 block" aria-hidden>
              <span className={`absolute left-0 top-0 h-[2px] w-full bg-current rounded transition-transform duration-300 ${menuOpen ? 'translate-y-[9px] rotate-45' : ''}`} />
              <span className={`absolute left-0 top-[9px] h-[2px] w-full bg-current rounded transition-opacity duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`absolute left-0 bottom-0 h-[2px] w-full bg-current rounded transition-transform duration-300 ${menuOpen ? '-translate-y-[9px] -rotate-45' : ''}`} />
            </span>
          </button>
        </div>
      </header>

      {/* Rezerwacja miejsca pod nagłówkiem na podstronach (na stronie głównej hero wchodzi pod nagłówek) */}
      {pathname !== '/' && <div aria-hidden className="h-[var(--header-height)]" />}

      <MobileMenu open={menuOpen} onClose={close} links={navLinks} />
    </>
  )
}

export default Header
