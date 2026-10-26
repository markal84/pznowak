'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useConsent } from '@/components/site/ConsentGate'
import NavigateLink from '@/components/site/NavigateLink'
import { openConsentSettings, writeConsent } from '@/lib/cookie-consent'
import { COOKIE_BANNER_ENABLED, SITE } from '@/lib/site'

/**
 * Mapa dojazdu na stronie „Kontakt” (zlecenie J, pkt 4a). Domyślnie statyczny obrazek z pinezką (public/mapa-pracowni.webp,
 * generowany skryptem scripts/generate-contact-map.ts): bez zapytań do Google i bez ciasteczek. Interaktywna mapa Google
 * wczytuje się dopiero po zgodzie na kategorię „mapy”: od razu, jeśli zgoda już jest, albo po kliknięciu linku, które
 * zapisuje ją w pn_consent. Przy wyłączonym pasku zgody kliknięcie działa tylko na tej wizycie.
 * Obrazek jest w całości linkiem do nawigacji (jak „Prowadź do pracowni”), a podpis pod nim mówi, że to zdjęcie mapy.
 * Używane na stronach „Kontakt” i „Pracownia”.
 */
export default function ContactMap() {
  const consented = useConsent('maps')
  const [shownOnce, setShownOnce] = useState(false)
  const interactive = consented || shownOnce

  function showInteractive() {
    setShownOnce(true)
    if (COOKIE_BANNER_ENABLED) writeConsent({ maps: true })
  }

  return (
    <div className="map-block">
      <div className="map-frame">
        {interactive ? (
          <iframe
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={SITE.mapsEmbedUrl}
            title={`Mapa Google: pracownia, ${SITE.street}, ${SITE.city}`}
          />
        ) : (
          <NavigateLink className="map-link" label="Otwórz nawigację do pracowni">
            <Image
              alt={`Mapa okolicy z pinezką: pracownia przy ul. ${SITE.street}, ${SITE.city}`}
              height={640}
              sizes="(max-width: 1100px) 100vw, 1100px"
              src="/mapa-pracowni.webp"
              width={1200}
            />
          </NavigateLink>
        )}
      </div>
      {!interactive && (
        <div className="map-note">
          <p className="small">
            To zdjęcie mapy
            {COOKIE_BANNER_ENABLED ? ' – interaktywna mapa Google pojawi się po akceptacji plików cookies. ' : '. '}
            {COOKIE_BANNER_ENABLED && (
              <button className="linkbtn map-show" onClick={openConsentSettings} type="button">
                Zmień ustawienia
              </button>
            )}
          </p>
          <p className="small">
            <button className="linkbtn map-show" onClick={showInteractive} type="button">
              Pokaż interaktywną mapę
            </button>{' '}
            (załaduje mapę Google, która zapisuje własne pliki cookies)
          </p>
        </div>
      )}
    </div>
  )
}
