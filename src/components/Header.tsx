'use client' // Needed for useState

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import MobileMenu from './MobileMenu' // Import MobileMenu
import { useWindowScroll } from '@uidotdev/usehooks'

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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <>
      <header
        className={`bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50 transition-all duration-300 ease-in-out ${isScrolled ? 'py-2' : 'py-4'}`}
      >
        <div className={`max-w-7xl mx-auto px-6 flex items-center justify-between transition-all duration-300 ease-in-out ${isScrolled ? 'py-2' : 'py-4'}`}>
          {/* Logo */}
          <Link href="/" className='flex items-center'>
            <Image
              src="/logo.png"
              alt="Logo Michał Nowak"
              width={isScrolled ? 90 : 140}
              height={isScrolled ? 90 : 140}
              priority
              className={
                `h-auto transition-all duration-300 ${isScrolled ? '' : ''} dark:invert dark:hue-rotate-180`
              }
            />
          </Link>

          {/* Desktop Navigation (Hidden on Mobile) */}
          <nav className='hidden md:block'>
            <ul className='flex space-x-6 text-base font-medium tracking-wide font-serif text-gray-900 dark:text-white'>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="nav-link-hover"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Hamburger Menu Button (Mobile Only) */}
          <div className='md:hidden'>
            <button
              onClick={toggleMenu}
              className='p-2 focus:outline-none'
              aria-label='Toggle menu'
            >
              {/* Animated Hamburger/Close Icon */}
              <div className='w-6 h-5 flex flex-col justify-between items-center relative'>
                <span className={`block w-full h-0.5 bg-gray-800 rounded-full transition-transform duration-300 ease-in-out ${isMenuOpen ? 'rotate-45 translate-y-[9px]' : ''}`}></span>
                <span className={`block w-full h-0.5 bg-gray-800 rounded-full transition-opacity duration-300 ease-in-out ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block w-full h-0.5 bg-gray-800 rounded-full transition-transform duration-300 ease-in-out ${isMenuOpen ? '-rotate-45 -translate-y-[9px]' : ''}`}></span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <MobileMenu isOpen={isMenuOpen} onClose={toggleMenu} links={navLinks} />
    </>
  )
}

export default Header