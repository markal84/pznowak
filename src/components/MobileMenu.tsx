'use client'
import React, { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaFacebook, FaInstagram, FaPhone, FaEnvelope } from 'react-icons/fa'
import { FACEBOOK_URL, INSTAGRAM_URL, PHONE_NUMBER, EMAIL_ADDRESS, OPENING_HOURS } from '@/lib/socials'
import { isActivePath } from './Header'

interface Props {
  open: boolean
  onClose: () => void
  links: { href: string; label: string }[]
}

/**
 * Menu mobilne jako warstwa fixed pod nagłówkiem. Nie spycha treści strony,
 * animuje tylko opacity/transform.
 */
export default function MobileMenu({ open, onClose, links }: Props) {
  const pathname = usePathname()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  const telHref = `tel:${PHONE_NUMBER.replace(/[^+\d]/g, '')}`

  return (
    <div
      id="mobile-menu"
      className={[
        'md:hidden fixed inset-x-0 top-[var(--header-height)] bottom-0 z-40 bg-ivory overflow-y-auto',
        'transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
        open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none',
      ].join(' ')}
      aria-hidden={!open}
    >
      <nav aria-label="Menu główne" className="container-x pt-4 pb-[calc(var(--action-bar-height)+2rem)] flex flex-col min-h-full">
        <ul className="divide-y divide-line border-y border-line">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={onClose}
                aria-current={isActivePath(pathname, l.href) ? 'page' : undefined}
                className={[
                  'flex items-center justify-between py-4 font-display text-[1.75rem] leading-none',
                  isActivePath(pathname, l.href) ? 'text-gold' : 'text-ink',
                ].join(' ')}
              >
                {l.label}
                <span aria-hidden className="text-gold text-xl">→</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 grid grid-cols-1 gap-3">
          <a href={telHref} className="inline-flex items-center gap-3 h-14 px-5 rounded bg-ink text-ivory font-semibold">
            <FaPhone className="h-5 w-5 text-gold-2" aria-hidden /> {PHONE_NUMBER}
          </a>
          <a href={`mailto:${EMAIL_ADDRESS}`} className="inline-flex items-center gap-3 h-14 px-5 rounded border border-line-strong text-ink font-semibold">
            <FaEnvelope className="h-5 w-5 text-gold" aria-hidden /> {EMAIL_ADDRESS}
          </a>
        </div>

        <div className="mt-8 text-sm muted">
          <p className="eyebrow mb-2">Godziny otwarcia</p>
          {OPENING_HOURS.map((h) => (
            <p key={h.days} className="flex justify-between border-b border-line py-1.5">
              <span>{h.days}</span><span className="text-ink font-medium">{h.hours}</span>
            </p>
          ))}
        </div>

        <div className="mt-auto pt-8 flex items-center gap-6">
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-ink-2 hover:text-gold"><FaFacebook className="h-7 w-7" /></a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-ink-2 hover:text-gold"><FaInstagram className="h-7 w-7" /></a>
        </div>
      </nav>
    </div>
  )
}
