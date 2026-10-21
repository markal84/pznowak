'use client'

import { openConsentSettings } from '@/lib/cookie-consent'

/** Przycisk w stopce: ponowne otwarcie ustawień cookies (wycofanie zgody ma być tak proste jak jej udzielenie). */
export default function CookieSettingsButton() {
  return (
    <button className="linkbtn cookie-settings-btn" onClick={openConsentSettings} type="button">
      Ustawienia cookies
    </button>
  )
}
