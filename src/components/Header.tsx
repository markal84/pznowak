'use client' // Needed for useState

import React, { useState } from 'react'
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
  const isHome = pathname === '/'
  const isTransparentDesktop = isHome && !isScrolled

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <>
      <header
        className={[
          'fixed top-0 inset-x-0 z-50 transition-all duration-300 ease-in-out',
          // Mobile: zawsze półprzezroczysty z lekkim blur
          isHome ? 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm' : 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm',
          // Desktop: na homepage przed scrollem w 100% transparent (bez blur); po scrolu lub poza homepage półprzezroczysty + blur
          isHome && !isScrolled
            ? 'md:bg-transparent md:dark:bg-transparent md:backdrop-blur-0'
            : 'md:bg-white/50 md:dark:bg-gray-900/50 md:backdrop-blur-sm',
          isScrolled ? 'py-2' : 'py-4',
          isTransparentDesktop ? 'header--transparent' : ''
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
            <ul className='flex items-center gap-6 text-base font-medium tracking-wide font-serif text-gray-900 dark:text-white'>
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
