import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import NotFoundContent from '@/components/NotFoundContent'
import type { PublicSiteContent } from '@/lib/public-products'
import './(frontend)/globals.css'

export const metadata: Metadata = {
  title: '404 — nie znaleziono strony | Pracownia Złotnicza Michał Nowak',
  description: 'Ten adres nie prowadzi do strony w katalogu Pracowni Złotniczej Michała Nowaka.',
}

const fallbackSiteContent: PublicSiteContent = {
  aboutHeading: null,
  aboutText: null,
  address: null,
  email: null,
  homeHeading: null,
  homeLead: null,
  openingHours: null,
  phone: null,
}

export default function GlobalNotFound() {
  return (
    <html lang="pl">
      <body>
        <a href="#main" className="skip-link">
          Przejdź do treści
        </a>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main id="main" className="flex-1">
            <NotFoundContent />
          </main>
          <Footer siteContent={fallbackSiteContent} />
        </div>
      </body>
    </html>
  )
}
