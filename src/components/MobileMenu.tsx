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
      /*
        Mobile-only, w przepływie dokumentu pod headerem.
        Animuje max-height, co płynnie spycha treść w dół.
      */
      className={[
        'md:hidden overflow-hidden bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm',
        'transition-[max-height,opacity] ease-in-out',
        'motion-safe:duration-200 motion-reduce:transition-none',
        isOpen ? 'max-h-[var(--mobile-menu-height)] opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
      ].join(' ')}
      aria-hidden={!isOpen}
      onClick={onClose}
    >
      <nav
        id="mobile-menu"
        aria-label="Główne menu"
        className="min-h-[240px] flex flex-col items-center justify-between px-8 pb-10"
      >
        <div className="flex flex-col items-center gap-10 mt-6">
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
                "text-2xl transition-colors py-3 px-6 w-full text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-sm",
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
        </div>
        <div className="flex items-center gap-10">
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="p-2 text-gray-700 dark:text-gray-200 hover:text-brand-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <FaFacebook className="h-[38px] w-[38px]" aria-hidden="true" />
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="p-2 text-gray-700 dark:text-gray-200 hover:text-brand-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <FaInstagram className="h-[38px] w-[38px]" aria-hidden="true" />
          </a>
        </div>
      </nav>
    </div>
  )
}

export default MobileMenu
