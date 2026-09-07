import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { FaPhone, FaEnvelope, FaFacebook, FaInstagram, FaMapMarkerAlt, FaClock } from 'react-icons/fa'
import ContactForm from '@/components/ContactForm'
import SectionTitle from '@/components/ui/SectionTitle'
import { FACEBOOK_URL, INSTAGRAM_URL, PHONE_NUMBER, EMAIL_ADDRESS, ADDRESS, MAP_URL, MAP_LINK, OPENING_HOURS } from '@/lib/socials'

export const metadata: Metadata = {
  title: 'Kontakt',
  description: 'Zadzwoń, napisz lub odwiedź pracownię w Busku-Zdroju, ul. Kilińskiego 12.',
}

export default function ContactPage() {
  const telHref = `tel:${PHONE_NUMBER.replace(/[^+\d]/g, '')}`
  const row = 'flex items-start gap-4 py-4 border-b border-line'
  const icon = 'h-5 w-5 text-gold shrink-0 mt-1'

  return (
    <>
      <section className="pt-10 md:pt-16 pb-8 md:pb-10 border-b border-line">
        <div className="container-x">
          <SectionTitle as="h1" size="lg" eyebrow="Kontakt" title="Porozmawiajmy o Twoim pierścionku" lead="Najszybciej przez telefon. Jeśli wolisz napisać, odpowiadamy w ciągu jednego dnia roboczego. Do pracowni warto umówić się wcześniej." />
        </div>
      </section>

      <section className="section pt-10 md:pt-14">
        <div className="container-x grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-5 reveal">
            <a href={telHref} className="flex items-center gap-4 rounded-lg bg-ink text-ivory p-5 md:p-6 hover:bg-graphite-2 transition-colors">
              <span className="h-12 w-12 rounded-full bg-gold-2/20 text-gold-2 flex items-center justify-center shrink-0"><FaPhone className="h-5 w-5" aria-hidden /></span>
              <span>
                <span className="block text-xs uppercase tracking-[0.18em] text-gold-2 font-semibold">Zadzwoń</span>
                <span className="block font-display text-3xl leading-tight">{PHONE_NUMBER}</span>
              </span>
            </a>

            <dl className="mt-6">
              <div className={row}>
                <FaEnvelope className={icon} aria-hidden />
                <div><dt className="text-sm muted">E-mail</dt><dd><a href={`mailto:${EMAIL_ADDRESS}`} className="font-medium hover:text-gold">{EMAIL_ADDRESS}</a></dd></div>
              </div>
              <div className={row}>
                <FaMapMarkerAlt className={icon} aria-hidden />
                <div><dt className="text-sm muted">Adres pracowni</dt><dd className="font-medium">{ADDRESS}</dd><dd><a href={MAP_LINK} target="_blank" rel="noopener noreferrer" className="text-sm text-gold hover:underline underline-offset-4">Otwórz w Mapach Google →</a></dd></div>
              </div>
              <div className={row}>
                <FaClock className={icon} aria-hidden />
                <div>
                  <dt className="text-sm muted">Godziny otwarcia</dt>
                  {OPENING_HOURS.map((h) => <dd key={h.days} className="font-medium">{h.days}: {h.hours}</dd>)}
                </div>
              </div>
            </dl>

            <div className="mt-6 flex items-center gap-5">
              <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="inline-flex items-center gap-2 text-ink-2 hover:text-gold"><FaFacebook className="h-6 w-6" /> Facebook</a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="inline-flex items-center gap-2 text-ink-2 hover:text-gold"><FaInstagram className="h-6 w-6" /> Instagram</a>
            </div>

            <div className="mt-8 rounded-lg overflow-hidden border border-line bg-ivory-2">
              <div className="relative aspect-[4/3] sm:aspect-video">
                <iframe src={MAP_URL} title="Mapa dojazdu do pracowni" className="absolute inset-0 w-full h-full" loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 reveal" data-delay="1">
            <div className="rounded-lg bg-paper border border-line p-5 sm:p-8 md:p-10">
              <h2 className="text-[1.9rem] md:text-[2.2rem]">Napisz do nas</h2>
              <p className="mt-2 muted">Wystarczy e-mail i kilka zdań. Resztę ustalimy w rozmowie.</p>
              <div className="mt-6">
                <Suspense fallback={null}>
                  <ContactForm />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
