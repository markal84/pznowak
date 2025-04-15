'use client' // Needed for useState

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import MobileMenu from './MobileMenu' // Import MobileMenu

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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <>
      <header className='bg-white shadow-md sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-6 py-4 flex items-center justify-between'>
          {/* Logo */}
          <Link href="/" className='flex items-center'>
            <Image
              src="/logo.png"
              alt="Logo Michał Nowak"
              width={120}
              height={40}
              priority
            />
          </Link>

          {/* Desktop Navigation (Hidden on Mobile) */}
          <nav className='hidden md:block'>
            <ul className='flex space-x-6 text-base font-medium tracking-wide font-serif'>
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