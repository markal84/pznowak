import Image from 'next/image'
import Link from 'next/link'
import CookieSettingsButton from '@/components/site/CookieSettingsButton'
import { SITE } from '@/lib/site'
import DoUzupelnienia from './DoUzupelnienia'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-in">
        <div className="footer-cols">
          <div className="footer-col">
            <Image alt={SITE.name} className="footer-logo" height={79} src="/logo.png" width={150} />
            <span className="footer-muted" style={{ lineHeight: 1.55 }}>
              Rodzinna pracownia złotnicza. Pierścionki i obrączki na zamówienie, naprawy i przeróbki. Na miejscu
              sklep z gotową biżuterią.
            </span>
          </div>
          <div className="footer-col">
            <span className="label">Adres</span>
            <address>
              {SITE.street}
              <br />
              {SITE.city}
            </address>
            <span className="footer-muted">
              Pon.–pt. 8:00–16:00
              <br />
              Sobota 10:00–16:00
            </span>
          </div>
          <div className="footer-col">
            <span className="label">Kontakt</span>
            <a href={SITE.phoneHref}>{SITE.phone}</a>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            <a href={SITE.instagram} rel="noreferrer" target="_blank">
              Instagram
            </a>
            <a href={SITE.facebook} rel="noreferrer" target="_blank">
              Facebook
            </a>
          </div>
          <nav aria-label="Menu w stopce" className="footer-col">
            <span className="label">Strona</span>
            <Link href="/pierscionki">Pierścionki</Link>
            <Link href="/obraczki">Obrączki</Link>
            <Link href="/na-zamowienie">Na zamówienie</Link>
            <Link href="/naprawy">Naprawy i przeróbki</Link>
            <Link href="/realizacje">Realizacje</Link>
            <Link href="/pracownia">Pracownia</Link>
            <Link href="/kontakt">Umów wizytę</Link>
          </nav>
        </div>
        <div className="footer-base">
          <span>© 2026 Pracownia Złotnicza Michał Nowak</span>
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            {/* Treść polityki prywatności i regulaminu dostarcza pracownia; do tego czasu stopka pokazuje je tylko na podglądzie. */}
            <DoUzupelnienia>
              <span style={{ display: 'flex', gap: 24 }}>
                <span>Polityka prywatności [wkrótce]</span>
                <span>Regulamin [wkrótce]</span>
              </span>
            </DoUzupelnienia>
            <CookieSettingsButton />
          </span>
        </div>
      </div>
    </footer>
  )
}
