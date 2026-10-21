'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_OPEN_EVENT,
  parseConsent,
  readConsentRaw,
  writeConsent,
} from '@/lib/cookie-consent'

/**
 * Pasek zgody na cookies przyklejony do dołu ekranu, nie blokuje strony (bez nakładki i bez pułapki fokusu).
 * Odrzucenie jest tak samo łatwe jak akceptacja (dwa równorzędne przyciski w pierwszej warstwie),
 * pola opcjonalne są domyślnie wyłączone, a wybór można zmienić z poziomu stopki.
 */

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, onChange)
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange)
}

export default function CookieBanner() {
  // null na serwerze i podczas hydracji: pasek nie trafia do HTML, więc nie ma rozjazdu serwer/klient.
  const raw = useSyncExternalStore(subscribe, readConsentRaw, () => null)
  const consent = parseConsent(raw)
  const [reopened, setReopened] = useState(false)
  const [detail, setDetail] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const root = useRef<HTMLElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    function onOpen() {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setAnalytics(parseConsent(readConsentRaw())?.analytics ?? false)
      setDetail(true)
      setReopened(true)
    }
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen)
  }, [])

  const visible = raw !== null && (reopened || !consent)

  useEffect(() => {
    if (reopened) root.current?.focus()
  }, [reopened])

  if (!visible) return null

  function decide(choice: { analytics: boolean }) {
    writeConsent(choice)
    setReopened(false)
    setDetail(false)
    returnFocus.current?.focus()
    returnFocus.current = null
  }

  return (
    <section aria-labelledby="cookie-title" className="cookie-banner" ref={root} tabIndex={-1}>
      <div className="cookie-in">
        <div className="cookie-copy">
          <h2 className="cookie-title" id="cookie-title">
            Pliki cookies
          </h2>
          <p>
            Używamy niezbędnych plików cookies: zapamiętują Twój wybór i chronią formularze przed spamem.
            Opcjonalne, na przykład statystyki odwiedzin, włączamy tylko za Twoją zgodą. Wybór zmienisz w
            każdej chwili w stopce strony.
            {/* [do uzupełnienia] link do polityki prywatności, gdy pracownia dostarczy treść */}
          </p>
          {detail && (
            <div className="cookie-cats">
              <label className="check cookie-cat">
                <input checked disabled type="checkbox" />
                <span>
                  <strong>Niezbędne</strong>
                  <span className="cookie-cat-note">
                    Zapamiętanie wyboru cookies oraz ochrona formularzy (Cloudflare Turnstile). Działają zawsze,
                    bo bez nich strona nie spełni swojej funkcji.
                  </span>
                </span>
              </label>
              <label className="check cookie-cat">
                <input
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  type="checkbox"
                />
                <span>
                  <strong>Statystyki</strong>
                  <span className="cookie-cat-note">
                    Anonimowe zliczanie odwiedzin, żeby wiedzieć, co na stronie jest przydatne. Obecnie strona nie
                    korzysta z takich narzędzi.
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>
        <div className="cookie-actions">
          <button className="btn" onClick={() => decide({ analytics: false })} type="button">
            Odrzuć opcjonalne
          </button>
          <button className="btn" onClick={() => decide({ analytics: true })} type="button">
            Akceptuj wszystkie
          </button>
          {detail ? (
            <button className="btn btn-line" onClick={() => decide({ analytics })} type="button">
              Zapisz wybór
            </button>
          ) : (
            <button
              aria-expanded={false}
              className="btn btn-line"
              onClick={() => setDetail(true)}
              type="button"
            >
              Dostosuj
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
