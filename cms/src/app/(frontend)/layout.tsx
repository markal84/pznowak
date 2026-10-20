import type { Metadata } from 'next'
import './globals.css'
import HydrationFlag from '@/components/site/HydrationFlag'
import SiteHeader from '@/components/site/SiteHeader'
import SiteFooter from '@/components/site/SiteFooter'
import { fontClassName } from '@/lib/fonts'
import { isIndexable } from '@/lib/indexing'

export const metadata: Metadata = {
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
        <HydrationFlag />
      </body>
    </html>
  )
}
