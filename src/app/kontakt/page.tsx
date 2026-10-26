import React from 'react'
import ContactForm from '@/components/ContactForm'
import PageHero from '@/components/ui/PageHero'
import { FACEBOOK_URL, INSTAGRAM_URL, PHONE_NUMBER, EMAIL_ADDRESS, ADDRESS, MAP_URL } from '@/lib/socials'

export const metadata = {
  title: 'Kontakt',
  description: 'Skontaktuj się z pracownią złotniczą Michała Nowaka w Busku-Zdroju. Rozmowa o projekcie pierścionka nic nie kosztuje i do niczego nie zobowiązuje.',
}

export default function ContactPage() {
  const telHref = `tel:${PHONE_NUMBER.replace(/[^+\d]/g, '')}`

  const rows: Array<[string, React.ReactNode]> = [
    ['Pracownia', ADDRESS],
    ['Telefon', <a key="t" href={telHref} className="link-subtle-hover">{PHONE_NUMBER}</a>],
    ['E-mail', <a key="e" href={`mailto:${EMAIL_ADDRESS}`} className="link-subtle-hover">{EMAIL_ADDRESS}</a>],
    ['Godziny', 'Pon–Pt 8:00–16:00 · Sob 10:00–16:00'],
    ['Social', (
      <span key="s" className="flex gap-5">
        <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="link-subtle-hover">Facebook</a>
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="link-subtle-hover">Instagram</a>
      </span>
    )],
  ]

  return (
    <>
      <PageHero
        eyebrow="Kontakt"
        title={<>Porozmawiajmy o <em>Twoim projekcie.</em></>}
        lead="Napisz lub zadzwoń. Pierwsza rozmowa niczego nie zobowiązuje — pomoże nam zrozumieć, czego szukasz, a Tobie poznać, jak pracujemy."
      />

      <section className="pb-[var(--space-section-md)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-20 hairline-t pt-14">
            {/* LEWA: dane + mapa */}
            <div className="lg:col-span-5">
              <dl>
                {rows.map(([label, value]) => (
                  <div key={label as string} className="py-5 flex items-baseline gap-8 hairline-b">
                    <dt className="w-28 shrink-0 text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-[var(--ink-faint)]">
                      {label}
                    </dt>
                    <dd className="text-base font-light text-[var(--ink)]">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-10">
                <div className="relative aspect-[4/3] overflow-hidden border border-[var(--hairline)]">
                  <iframe
                    src={MAP_URL}
                    title="Mapa dojazdu — Pracownia Złotnicza Michał Nowak"
                    className="absolute inset-0 h-full w-full grayscale-[0.85] contrast-[0.95] transition-[filter] duration-500 hover:grayscale-0"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>

            {/* PRAWA: formularz */}
            <div className="lg:col-span-7">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
