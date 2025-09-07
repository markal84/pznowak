
'use client' // Needed for useState

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import MobileMenu from './MobileMenu' // Import MobileMenu
import { useWindowScroll } from '@uidotdev/usehooks'
import { usePathname } from 'next/navigation'
import Container from './ui/Container'
import { FaFacebook, FaInstagram } from 'react-icons/fa'
import { FACEBOOK_URL, INSTAGRAM_URL } from '@/lib/socials'

// Define navigation links
const navLinks = [
  { href: '/', label: 'GŁÓWNA' },
  { href: '/katalog', label: 'KATALOG' },
  { href: '/o-nas', label: 'O NAS' },
  { href: '/galeria', label: 'GALERIA' },
  { href: '/kontakt', label: 'KONTAKT' },
]

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [{ y }] = useWindowScroll()
  const isScrolled = (y ?? 0) > 4 // Adjust this value to control when the header changes
  const pathname = usePathname()
  const headerRef = useRef<HTMLElement | null>(null)

  // Aktualizuj CSS var --header-height na podstawie realnej wysokości headera
  useEffect(() => {
    const rafMeasure = () =>
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const h = headerRef.current?.offsetHeight ?? 64
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--header-height', `${h}px`)
        }
      }))

    rafMeasure()

    const onResize = () => rafMeasure()
    const onScroll = () => rafMeasure()
    const onOrientation = () => rafMeasure()
    const onTransitionEnd = () => rafMeasure()

    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onOrientation)
    window.addEventListener('scroll', onScroll, { passive: true })
    const el = headerRef.current
    el?.addEventListener('transitionend', onTransitionEnd)

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onOrientation)
      window.removeEventListener('scroll', onScroll)
      el?.removeEventListener('transitionend', onTransitionEnd)
    }
  }, [])

  // Dodatkowo mierz po zmianie stanów (scroll/menu), by złapać initial/threshold zmiany
  useEffect(() => {
    const h = headerRef.current?.offsetHeight ?? 64
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--header-height', `${h}px`)
    }
  }, [isScrolled, isMenuOpen])

  const toggleMenu = () => {
    const willOpen = !isMenuOpen
    setIsMenuOpen(willOpen)
    if (willOpen && typeof window !== 'undefined') {
      // Jeśli otwieramy menu na mobile i jesteśmy przewinięci w dół,
      // przesuń widok do góry, aby menu było widoczne (push-down UX).
      const isMobile = window.matchMedia('(max-width: 767px)').matches
      if (isMobile) {
        // Zmień przewijanie na natychmiastowe (znacznie szybsze niż domyślne smooth)
        window.scrollTo({ top: 0, behavior: 'auto' })
      }
    }
  }

  // Zamknij menu klawiszem Escape (a11y)
  useEffect(() => {
    if (!isMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMenuOpen])

  return (
    <>
      <header
        ref={headerRef}
        className={[
          'sticky top-0 inset-x-0 z-50 transition-all duration-300 ease-in-out',
          // Minimalna, spójna przezroczystość i blur z tokenów (light/dark, mobile/desktop)
          'bg-[color:var(--header-bg-light)] dark:bg-[color:var(--header-bg-dark)] backdrop-blur-[var(--header-blur)]',
          isScrolled ? 'py-2' : 'py-4',
          // Bez specjalnego trybu transparent na desktop — ujednolicone wartości
        ].join(' ')}
      >
        <Container max="7xl" className={`px-6 flex items-center justify-between transition-all duration-300 ease-in-out ${isScrolled ? 'py-2' : 'py-4'}`}>
          {/* Logo */}
          <Link href="/" className='flex items-center'>
            <Image
              src="/logo.png"
              alt="Logo Michał Nowak"
              width={200}
              height={200}
              priority
              className={
                `h-auto transition-all duration-300 dark:invert dark:hue-rotate-180 ${
                  isScrolled ? 'w-[176px] md:w-[160px]' : 'w-[220px] md:w-[200px]'
                }`
              }
            />
          </Link>

          {/* Desktop Navigation (Hidden on Mobile) */}
          <nav className='hidden md:block'>
            <ul className='flex items-center gap-8 text-base font-medium tracking-wide font-serif text-gray-900 dark:text-white'>
              {navLinks.map((link) => {
                const isActive = link.href === '/'
                  ? pathname === '/'
                  : pathname === link.href || pathname.startsWith(link.href + '/')
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={["nav-link-hover", isActive ? "nav-link-active" : ""].join(" ")}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              })}
              {/* Social icons (desktop) */}
              <li className='ml-4 flex items-center gap-4'>
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label='Facebook'
                  className='social-link text-gray-700 dark:text-gray-200 hover:text-brand-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-sm'
                >
                  <FaFacebook className='h-6 w-6' aria-hidden='true' />
                </a>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label='Instagram'
                  className='social-link text-gray-700 dark:text-gray-200 hover:text-brand-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-sm'
                >
                  <FaInstagram className='h-6 w-6' aria-hidden='true' />
                </a>
              </li>
            </ul>
          </nav>

          {/* Hamburger Menu Button (Mobile Only) */}
          <div className='md:hidden'>
            <button
              onClick={toggleMenu}
              className='p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-sm'
              aria-label='Toggle menu'
              aria-expanded={isMenuOpen}
              aria-controls='mobile-menu'
            >
              {/* Animated Hamburger/Close Icon */}
              <div className='w-6 h-5 flex flex-col justify-between items-center relative'>
                <span className={`block w-full h-0.5 bg-gray-800 dark:bg-gray-100 rounded-full transition-transform duration-300 ease-in-out ${isMenuOpen ? 'rotate-45 translate-y-[9px]' : ''}`}></span>
                <span className={`block w-full h-0.5 bg-gray-800 dark:bg-gray-100 rounded-full transition-opacity duration-300 ease-in-out ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block w-full h-0.5 bg-gray-800 dark:bg-gray-100 rounded-full transition-transform duration-300 ease-in-out ${isMenuOpen ? '-rotate-45 -translate-y-[9px]' : ''}`}></span>
              </div>
            </button>
          </div>
        </Container>
      </header>

      {/* Mobile Menu Overlay */}
      <MobileMenu isOpen={isMenuOpen} onClose={toggleMenu} links={navLinks} />
    </>
  )
}

export default Header
