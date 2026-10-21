'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { CREATOR_LINK, NAV, SITE } from '@/lib/site'

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export default function SiteHeader() {
  const pathname = usePathname() ?? '/'
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const kontaktCurrent = pathname === '/kontakt'
  const kreatorCurrent = isCurrent(pathname, CREATOR_LINK.href)

  return (
    <header className="site-header">
      <div className="site-header-in">
        <Link
          aria-label={`${SITE.name}, pracownia złotnicza — strona główna`}
          className="brand"
          href="/"
          onClick={close}
        >
          <Image alt="" height={62} priority src="/logo.png" width={118} />
          <span aria-hidden="true" className="brand-rule" />
          <span className="brand-text">
            <span>Pracownia złotnicza</span>
            <span>Busko-Zdrój, od {SITE.since}</span>
          </span>
        </Link>
        <nav aria-label="Menu główne" className="main-nav">
          {NAV.map((item) => (
            <Link
              aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
              className="navl"
              href={item.href}
              key={item.id}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link
            aria-current={kreatorCurrent ? 'page' : undefined}
            className="btn btn-line header-cta header-cta-creator"
            href={CREATOR_LINK.href}
          >
            {CREATOR_LINK.label}
          </Link>
          <Link aria-current={kontaktCurrent ? 'page' : undefined} className="btn header-cta" href="/kontakt">
            Umów wizytę
          </Link>
        </div>
        <button
          aria-controls="mobile-menu"
          aria-expanded={open}
          aria-label={open ? 'Zamknij menu' : 'Otwórz menu'}
          className="menu-btn"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          <svg aria-hidden="true" height="20" viewBox="0 0 20 20" width="20">
            {open ? (
              <path d="M4 4 L16 16 M16 4 L4 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
            ) : (
              <path d="M3 6 H17 M3 14 H17" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
            )}
          </svg>
        </button>
      </div>
      <nav aria-label="Menu mobilne" className="mobile-nav" hidden={!open} id="mobile-menu">
        {NAV.map((item) => (
          <Link
            aria-current={isCurrent(pathname, item.href) ? 'page' : undefined}
            className="m"
            href={item.href}
            key={item.id}
            onClick={close}
          >
            {item.label}
          </Link>
        ))}
        <Link
          aria-current={kreatorCurrent ? 'page' : undefined}
          className="m m-creator"
          href={CREATOR_LINK.href}
          onClick={close}
        >
          {CREATOR_LINK.label}
        </Link>
        <Link aria-current={kontaktCurrent ? 'page' : undefined} className="m" href="/kontakt" onClick={close}>
          Umów wizytę
        </Link>
        <div className="m-info">
          <span>
            {SITE.street}, Busko-Zdrój
          </span>
          <span>Pon.–pt. 8:00–16:00, sob. 10:00–16:00</span>
        </div>
      </nav>
    </header>
  )
}
