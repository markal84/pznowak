import type { Metadata } from 'next'
import './globals.css'
import CookieBanner from '@/components/site/CookieBanner'
import HydrationFlag from '@/components/site/HydrationFlag'
import SiteHeader from '@/components/site/SiteHeader'
import SiteFooter from '@/components/site/SiteFooter'
import { fontClassName } from '@/lib/fonts'
import { isIndexable } from '@/lib/indexing'
import { siteUrl } from '@/lib/seo'

export const metadata: Metadata = {
  // Adres bazowy dla względnych adresów kanonicznych i obrazów Open Graph (SITE_URL, domyślnie https://pznowak.pl).
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Michał Nowak — pracownia złotnicza w Busku-Zdroju',
    template: '%s — Michał Nowak',
  },
  description:
    'Rodzinna pracownia złotnicza w Busku-Zdroju. Pierścionki zaręczynowe i obrączki na zamówienie, naprawy i przeróbki biżuterii.',
  // Wersje podglądowe (preview, lokalnie) nie mogą trafić do Google. Indeksowanie włącza dopiero produkcja.
  robots: isIndexable() ? { index: true, follow: true } : { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={fontClassName}>
      <body>
        <a className="skip-link" href="#main">
          Przejdź do treści
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <CookieBanner />
        <HydrationFlag />
      </body>
    </html>
  )
}
