import ArrowIcon from '@/components/ArrowIcon'
import type { PublicSiteContent } from '@/lib/public-products'
import { FACEBOOK_URL, INSTAGRAM_URL } from '@/lib/socials'
import Link from 'next/link'

export default function Footer({ siteContent }: { siteContent: PublicSiteContent }) {
  const phone = siteContent.phone || '+48 501 321 347'
  const email = siteContent.email || 'kontakt@pznowak.pl'
  const address = siteContent.address || 'Kilińskiego 12, 28-100 Busko-Zdrój'
  const hours = siteContent.openingHours || 'Poniedziałek–piątek: 8:00–16:00\nSobota: 10:00–16:00'

  return (
    <>
      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-grid">
            <div>
              <div className="footer-brand">Michał Nowak</div>
              <p style={{ marginTop: 16 }}>
                Pracownia złotnicza w Busku-Zdroju.<br />Biżuteria dopasowana do osoby.
              </p>
              <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Instagram <ArrowIcon /></a>
                <a href={FACEBOOK_URL} target="_blank" rel="noreferrer">Facebook <ArrowIcon /></a>
              </div>
            </div>
            <div>
              <div className="footer-label">Odwiedź pracownię</div>
              <p>{address === 'Kilińskiego 12, 28-100 Busko-Zdrój'
                ? <>ul. Kilińskiego 12<br />28-100 Busko-Zdrój</>
                : address}</p>
              <p style={{ marginTop: 16, whiteSpace: 'pre-line' }}>
                {hours === 'Poniedziałek–piątek: 8:00–16:00\nSobota: 10:00–16:00'
                  ? <>Pon.–pt. 8:00–16:00<br />Sobota 10:00–16:00</>
                  : hours}
              </p>
            </div>
            <div>
              <div className="footer-label">Zacznijmy od rozmowy</div>
              <a href={`tel:${phone.replace(/[\s()-]/g, '')}`}>{phone}</a>
              <a href={`mailto:${email}`}>{email}</a>
              <Link href="/kontakt">Wszystkie dane kontaktowe <ArrowIcon /></Link>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Michał Nowak. Pracownia Złotnicza.</span>
            <span>Rzemiosło, które zostaje.</span>
          </div>
        </div>
      </footer>
      <div className="mobile-call" aria-label="Szybki kontakt">
        <a href={`tel:${phone.replace(/[\s()-]/g, '')}`}>Zadzwoń do pracowni</a>
        <Link href="/kontakt">Zapytaj o projekt <ArrowIcon /></Link>
      </div>
    </>
  )
}
