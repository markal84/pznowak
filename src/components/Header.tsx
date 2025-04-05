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
      <header className='bg-white text-gray-800 shadow-sm sticky top-0 z-50'>
        <div className='container mx-auto px-4 h-16 flex justify-between items-center'> {/* Fixed height */}
          {/* Logo */}
          <Link href="/" className='flex items-center'>
            <Image
              src="/logo.png" // Make sure logo.png is in /public
              alt="Michał Nowak Pracownia Złotnicza Logo"
              width={120} // Adjusted size
              height={120} // Adjusted size (assuming ~3:1 ratio)
              priority
            />
          </Link>

          {/* Desktop Navigation (Hidden on Mobile) */}
          <nav className='hidden md:block'>
            <ul className='flex space-x-6'>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className='text-sm font-medium hover:text-blue-600 transition-colors'>
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