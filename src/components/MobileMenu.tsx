"use client"
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaFacebook, FaInstagram } from 'react-icons/fa'
import { FACEBOOK_URL, INSTAGRAM_URL } from '@/lib/socials'

interface NavLink {
  href: string
  label: string
}

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  links: NavLink[]
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, links }) => {
  const pathname = usePathname()
  return (
    <div
      className={`fixed inset-0 bg-white dark:bg-gray-800 z-40 flex flex-col items-center justify-center transition-opacity duration-300 ease-in-out md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose} // Close on overlay click
    >
      {/* Optional: Add a close button inside the menu */}
      {/* <button onClick={onClose} className="absolute top-4 right-4 text-3xl text-gray-700">&times;</button> */}

      <nav id="mobile-menu" className=" pt-12 flex flex-col items-center space-y-12">
        {links.map((link) => {
          const isActive = link.href === '/'
            ? pathname === '/'
            : pathname === link.href || pathname.startsWith(link.href + '/')
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? 'page' : undefined}
              className={[
                "text-2xl transition-colors py-4 px-8 w-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-sm",
                isActive ? "text-brand-gold" : "text-gray-800 dark:text-gray-100 hover:text-[#B8860B] dark:hover:text-[#BFA181]",
              ].join(" ")}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              {link.label}
            </Link>
          )
        })}
        <div className="flex items-center gap-8 pt-4">
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="text-gray-700 dark:text-gray-200 hover:text-brand-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <FaFacebook className="h-7 w-7" aria-hidden="true" />
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-gray-700 dark:text-gray-200 hover:text-brand-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <FaInstagram className="h-7 w-7" aria-hidden="true" />
          </a>
        </div>
      </nav>
    </div>
  )
}

export default MobileMenu
