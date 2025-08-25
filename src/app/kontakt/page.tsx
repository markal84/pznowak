import React from 'react'
import {
  FaPhone,
  FaEnvelope,
  FaFacebook,
  FaInstagram,
  FaMapMarkerAlt
} from 'react-icons/fa'
import ContactForm from '@/components/ContactForm'
import Container from '@/components/ui/Container'
import SectionTitle from '@/components/ui/SectionTitle'
import { FACEBOOK_URL, INSTAGRAM_URL, PHONE_NUMBER, EMAIL_ADDRESS, ADDRESS, MAP_URL } from '@/lib/socials'

export default function ContactPage() {
  const telHref = `tel:${PHONE_NUMBER.replace(/[^+\d]/g, '')}`
  return (
    <section className="relative bg-[--color-bg]">
      <Container as="div" max="2xl" className="py-[var(--space-section-md)]">
        <SectionTitle title="Skontaktuj się z nami" size="md" center className="mb-3" />
        <p className="text-center text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10">
          Masz pytania lub pomysł na biżuterię? Wypełnij formularz lub skorzystaj z poniższych danych.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* LEWA KOLUMNA: dane + mapa */}
          <div className="bg-[--color-surface-muted] dark:bg-[--color-surface] border border-[--color-border] rounded-xl px-6 py-8 sm:p-8">
            <address className="not-italic">
              <dl className="space-y-6">
                <div className="flex items-start">
                  <dt className="sr-only">Adres</dt>
                  <dd className="flex items-center text-base text-gray-700 dark:text-gray-300">
                    <FaMapMarkerAlt className="h-6 w-6 flex-shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                    <span className="ml-3">{ADDRESS}</span>
                  </dd>
                </div>
                <div className="flex items-center">
                  <dt className="sr-only">Telefon</dt>
                  <dd>
                    <a
                      href={telHref}
                      className="inline-flex items-center gap-3 text-base font-medium text-gray-800 dark:text-gray-100 hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded"
                    >
                      <FaPhone className="h-6 w-6 flex-shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                      <span>{PHONE_NUMBER}</span>
                    </a>
                  </dd>
                </div>
                <div className="flex items-center">
                  <dt className="sr-only">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${EMAIL_ADDRESS}`}
                      className="inline-flex items-center gap-3 text-base font-medium text-gray-800 dark:text-gray-100 hover:text-brand-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded"
                    >
                      <FaEnvelope className="h-6 w-6 flex-shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                      <span>{EMAIL_ADDRESS}</span>
                    </a>
                  </dd>
                </div>
              </dl>
            </address>

            {/* Mapa: responsywna, z borderem i zaokrągleniem */}
            <div className="mt-8 rounded-xl overflow-hidden border border-[--color-border]">
              <div className="aspect-video">
                <iframe
                  src={MAP_URL}
                  title="Mapa dojazdu – PZ Nowak"
                  className="w-full h-full"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            {/* Social */}
            <div className="flex items-center gap-6 mt-8 justify-center">
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="p-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 text-gray-600 dark:text-gray-300 hover:text-brand-gold transition-colors"
              >
                <FaFacebook className="h-7 w-7" />
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="p-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 text-gray-600 dark:text-gray-300 hover:text-brand-gold transition-colors"
              >
                <FaInstagram className="h-7 w-7" />
              </a>
            </div>
          </div>

          {/* PRAWA KOLUMNA: formularz */}
          <div className="bg-[--color-surface] border border-[--color-border] rounded-xl px-6 py-8 sm:px-8 shadow-md">
            <ContactForm />
          </div>
        </div>
      </Container>
    </section>
  )
}
