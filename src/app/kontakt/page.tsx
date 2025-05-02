'use client'
import React from 'react'
import {
  BuildingOffice2Icon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import ContactForm from '@/components/ContactForm'

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
                  <BuildingOffice2Icon className="h-6 w-6 flex-shrink-0 text-gray-400" aria-hidden="true" />
                  <span className="ml-3">
                    Kilińskiego 12<br />
                    Busko-Zdrój, Polska
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
                    <PhoneIcon className="h-6 w-6 flex-shrink-0 text-gray-400" aria-hidden="true" />
                    <span className="ml-3">+48 501 321 347</span>
                  </a>
                </dd>
              </div>
              <div className="flex items-center">
                <dt className="sr-only">Email</dt>
                <dd>
                  <a
                    href="mailto:info@pznowak.pl"
                    className="flex items-center text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <EnvelopeIcon className="h-6 w-6 flex-shrink-0 text-gray-400" aria-hidden="true" />
                    <span className="ml-3">info@pznowak.pl</span>
                  </a>
                </dd>
              </div>
                {/* Miejsce pod mapkę */}
                <div className="mt-4 flex justify-center">
                  <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d159.35864762218392!2d20.7162737763192!3d50.46997271013973!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4717c37651ccfa81%3A0xcd63b70b2296c1f4!2sPhotogold.%20bar.%20Nowak%20M.!5e0!3m2!1spl!2spl!4v1746112420405!5m2!1spl!2spl" width="400" height="300"  allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                </div>
            </dl>
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
