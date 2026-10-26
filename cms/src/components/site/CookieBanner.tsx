'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  CONSENT_OPEN_EVENT,
  NO_OPTIONAL,
  parseConsent,
  readConsentRaw,
  subscribeConsent,
  writeConsent,
  type ConsentCategory,
  type ConsentChoice,
} from '@/lib/cookie-consent'
import { COOKIE_BANNER_ENABLED } from '@/lib/site'

/**
 * Pasek zgody na cookies przyklejony do dołu ekranu, nie blokuje strony (bez nakładki i bez pułapki fokusu).
 * Odrzucenie jest tak samo łatwe jak akceptacja (dwa równorzędne przyciski w pierwszej warstwie),
 * pola opcjonalne są domyślnie wyłączone, a wybór można zmienić z poziomu stopki.
 */

const ALL_OPTIONAL: ConsentChoice = { maps: true, analytics: true, marketing: true }

/** Kategorie opcjonalne w drugiej warstwie. Nowe narzędzie dopisz tutaj i w ConsentGate, a przy nowej kategorii podnieś CONSENT_VERSION. */
const OPTIONAL: readonly { id: ConsentCategory; title: string; note: string }[] = [
  {
    id: 'maps',
    title: 'Mapy',
    note: 'Interaktywna mapa Google na stronie „Kontakt”. Google zapisuje wtedy własne pliki cookies. Bez zgody pokazujemy prostą mapę i przycisk z nawigacją.',
  },
  {
    id: 'analytics',
    title: 'Statystyki',
    note: 'Anonimowe zliczanie odwiedzin, żeby wiedzieć, co na stronie jest przydatne. Obecnie strona nie korzysta z takich narzędzi.',
  },
  {
    id: 'marketing',
    title: 'Marketing',
    note: 'Piksele reklamowe, na przykład Meta, do mierzenia reklam pracowni. Obecnie strona nie korzysta z takich narzędzi.',
  },
]

export default function CookieBanner() {
  // null na serwerze i podczas hydracji: pasek nie trafia do HTML, więc nie ma rozjazdu serwer/klient.
  const raw = useSyncExternalStore(subscribeConsent, readConsentRaw, () => null)
  const consent = parseConsent(raw)
  const [reopened, setReopened] = useState(false)
  const [detail, setDetail] = useState(false)
  const [choice, setChoice] = useState<ConsentChoice>(NO_OPTIONAL)
  const root = useRef<HTMLElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    function onOpen() {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setChoice(parseConsent(readConsentRaw()) ?? NO_OPTIONAL)
      setDetail(true)
      setReopened(true)
    }
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen)
  }, [])

  const visible = COOKIE_BANNER_ENABLED && raw !== null && (reopened || !consent)

  useEffect(() => {
    if (reopened) root.current?.focus()
  }, [reopened])

  if (!visible) return null

  function decide(next: ConsentChoice) {
    writeConsent(next)
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
            Opcjonalne, czyli interaktywną mapę Google, a w przyszłości statystyki i reklamę, włączamy tylko za
            Twoją zgodą. Wybór zmienisz w każdej chwili w stopce strony.
            {/* [do uzupełnienia] link do polityki prywatności, gdy pracownia dostarczy treść */}
          </p>
          {detail && (
            <div className="cookie-cats">
              <label className="check cookie-cat">
                <input checked disabled type="checkbox" />
                <span>
                  <strong>Niezbędne</strong>
                  <span className="cookie-cat-note">
                    Zapamiętanie wyboru cookies oraz ochrona formularzy przed spamem (Cloudflare Turnstile, tylko przy
                    formularzu). Działają zawsze, bo bez nich strona nie spełni swojej funkcji.
                  </span>
                </span>
              </label>
              {OPTIONAL.map((category) => (
                <label className="check cookie-cat" key={category.id}>
                  <input
                    checked={choice[category.id]}
                    onChange={(e) => setChoice((current) => ({ ...current, [category.id]: e.target.checked }))}
                    type="checkbox"
                  />
                  <span>
                    <strong>{category.title}</strong>
                    <span className="cookie-cat-note">{category.note}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="cookie-actions">
          <button className="btn" onClick={() => decide(NO_OPTIONAL)} type="button">
            Odrzuć opcjonalne
          </button>
          <button className="btn" onClick={() => decide(ALL_OPTIONAL)} type="button">
            Akceptuj wszystkie
          </button>
          {detail ? (
            <button className="btn btn-line" onClick={() => decide(choice)} type="button">
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
