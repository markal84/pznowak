import type { Metadata } from 'next'
import HydrationFlag from '@/components/site/HydrationFlag'
import SiteHeader from '@/components/site/SiteHeader'
import SiteFooter from '@/components/site/SiteFooter'
import NotFoundContent from '@/components/site/NotFoundContent'
import { fontClassName } from '@/lib/fonts'
import './(frontend)/globals.css'

export const metadata: Metadata = {
  title: '404 — nie znaleziono strony | Pracownia Złotnicza Michał Nowak',
  description: 'Ten adres nie prowadzi do strony Pracowni Złotniczej Michała Nowaka.',
  robots: { index: false, follow: false },
}

export default function GlobalNotFound() {
  return (
    <html lang="pl" className={fontClassName}>
      <body>
        <a className="skip-link" href="#main">
          Przejdź do treści
        </a>
        <SiteHeader />
        <main id="main">
          <NotFoundContent />
        </main>
        <SiteFooter />
        <HydrationFlag />
      </body>
    </html>
  )
}
