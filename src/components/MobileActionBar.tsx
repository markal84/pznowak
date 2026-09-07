'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa'
import { PHONE_NUMBER, MAP_LINK } from '@/lib/socials'

/**
 * Stały pasek akcji na telefonie: zadzwoń / napisz / dojazd.
 * Pozycja fixed, wysokość stała – rezerwujemy pod niego miejsce w <main>,
 * więc nie zasłania treści i nie przesuwa układu.
 */
export default function MobileActionBar() {
  const pathname = usePathname()
  const telHref = `tel:${PHONE_NUMBER.replace(/[^+\d]/g, '')}`
  const item =
    'flex-1 flex flex-col items-center justify-center gap-1 h-full text-[11px] font-semibold tracking-wide uppercase text-ink hover:text-gold transition-colors'
  return (
    <nav
      aria-label="Szybki kontakt"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 h-[var(--action-bar-height)] bg-paper/95 backdrop-blur border-t border-line pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex h-full">
        <a href={telHref} className={item}>
          <FaPhone className="h-5 w-5 text-gold" aria-hidden />
          Zadzwoń
        </a>
        <Link href="/kontakt" className={item} aria-current={pathname === '/kontakt' ? 'page' : undefined}>
          <FaEnvelope className="h-5 w-5 text-gold" aria-hidden />
          Napisz
        </Link>
        <a href={MAP_LINK} target="_blank" rel="noopener noreferrer" className={item}>
          <FaMapMarkerAlt className="h-5 w-5 text-gold" aria-hidden />
          Dojazd
        </a>
      </div>
    </nav>
  )
}
