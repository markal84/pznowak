import React from 'react'
import Link from 'next/link'

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
  return (
    <div
      className={`fixed inset-0 bg-white z-40 flex flex-col items-center justify-center transition-opacity duration-300 ease-in-out md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={onClose} // Close on overlay click
    >
      {/* Optional: Add a close button inside the menu */}
      {/* <button onClick={onClose} className="absolute top-4 right-4 text-3xl text-gray-700">&times;</button> */}

      <nav className="flex flex-col items-center space-y-8">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-2xl text-gray-800 hover:text-blue-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation(); // Prevent closing from link click itself
              onClose(); // Close the menu when a link is clicked
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

export default MobileMenu 