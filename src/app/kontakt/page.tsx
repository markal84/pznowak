'use client'
import React from 'react'
import {
  FaPhone,
  FaEnvelope,
  FaFacebook,
  FaInstagram,
  FaMapMarkerAlt
} from 'react-icons/fa'
import ContactForm from '@/components/ContactForm'
import { FACEBOOK_URL, INSTAGRAM_URL, PHONE_NUMBER, EMAIL_ADDRESS, ADDRESS, MAP_URL } from '@/lib/socials'

export default function ContactPage() {
  return (
    <section className="relative bg-white dark:bg-gray-900">
      <div className="relative max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* LEWA KOLUMNA */}
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-10 sm:p-10 lg:py-24 lg:px-8 sm:rounded-xl">
            <h2 className="text-3xl font-serif tracking-tight text-gray-900 dark:text-white">
              Skontaktuj się z nami
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
              Masz pytania lub pomysł na biżuterię? Wypełnij formularz lub skorzystaj z poniższych danych.
            </p>
            <dl className="mt-8 space-y-6">
              <div className="flex items-start">
                <dt className="sr-only">Adres</dt>
                <dd className="flex items-center text-base text-gray-500 dark:text-gray-400">
                  <FaMapMarkerAlt className="h-6 w-6 flex-shrink-0 text-gray-400" aria-hidden="true" />
                  <span className="ml-3">
                    {ADDRESS}
                  </span>
                </dd>
              </div>
              <div className="flex items-center">
                <dt className="sr-only">Telefon</dt>
                <dd>
                  <a
                    href="tel:+48501321347"
                    className="flex items-center text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <FaPhone className="h-6 w-6 flex-shrink-0 text-gray-400" aria-hidden="true" />
                    <span className="ml-3">{PHONE_NUMBER}</span>
                  </a>
                </dd>
              </div>
              <div className="flex items-center">
                <dt className="sr-only">Email</dt>
                <dd>
                  <a
                    href={`mailto:${EMAIL_ADDRESS}`}
                    className="flex items-center text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <FaEnvelope className="h-6 w-6 flex-shrink-0 text-gray-400" aria-hidden="true" />
                    <span className="ml-3">{EMAIL_ADDRESS}</span>
                  </a>
                </dd>
              </div>
                {/* Miejsce pod mapkę */}
                <div className="mt-4 flex justify-center">
                  <iframe src={MAP_URL} width="400" height="300"  allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                </div>
            </dl>
            <div className="flex items-center gap-8 mt-8 justify-center">
              <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-brand-gold transition-colors">
                <FaFacebook className="h-7 w-7" />
              </a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-brand-gold transition-colors">
                <FaInstagram className="h-7 w-7" />
              </a>
            </div>
          </div>

          {/* PRAWA KOLUMNA */}
          <div className="bg-white dark:bg-gray-800 px-6 py-10 sm:px-10 shadow-lg ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl lg:px-8">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  )
}
