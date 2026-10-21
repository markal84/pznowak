'use client'

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'

/**
 * Cloudflare Turnstile w trybie zarządzanym, widoczny tylko wtedy, gdy Cloudflare poprosi o interakcję
 * (`appearance: interaction-only`). Skrypt ładuje się dopiero, gdy formularz jest na ekranie.
 */

type RenderOptions = {
  sitekey: string
  action: string
  appearance: 'always' | 'execute' | 'interaction-only'
  language: string
  theme: 'light' | 'dark' | 'auto'
  size: 'normal' | 'flexible' | 'compact'
  'refresh-expired': 'auto' | 'manual' | 'never'
  'response-field': boolean
  callback: (token: string) => void
  'expired-callback': () => void
  'timeout-callback': () => void
  'error-callback': (code: string) => void
}

type TurnstileApi = {
  render: (container: HTMLElement, options: RenderOptions) => string | undefined
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise: Promise<TurnstileApi> | null = null

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.onload = () =>
        window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile'))
      script.onerror = () => {
        scriptPromise = null
        script.remove()
        reject(new Error('turnstile-script'))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

export type TurnstileHandle = { reset: () => void }

export default function Turnstile({
  siteKey,
  action,
  onToken,
  onError,
  ref,
}: {
  siteKey: string
  action: string
  onToken: (token: string | null) => void
  onError: (code: string) => void
  ref?: Ref<TurnstileHandle>
}) {
  const container = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const callbacks = useRef({ onToken, onError })

  useEffect(() => {
    callbacks.current = { onToken, onError }
  }, [onToken, onError])

  useEffect(() => {
    let cancelled = false
    loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current) return
        widgetId.current =
          api.render(container.current, {
            sitekey: siteKey,
            action,
            appearance: 'interaction-only',
            language: 'pl',
            theme: 'light',
            size: 'flexible',
            'refresh-expired': 'auto',
            'response-field': false,
            callback: (token) => callbacks.current.onToken(token),
            'expired-callback': () => callbacks.current.onToken(null),
            'timeout-callback': () => callbacks.current.onToken(null),
            'error-callback': (code) => {
              callbacks.current.onToken(null)
              callbacks.current.onError(String(code))
            },
          }) ?? null
      })
      .catch(() => {
        if (!cancelled) callbacks.current.onError('script')
      })
    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
      // Usunięty widżet nie odświeża tokenu, więc stary token nie może zostać użyty.
      callbacks.current.onToken(null)
    }
  }, [siteKey, action])

  useImperativeHandle(ref, () => ({
    reset() {
      callbacks.current.onToken(null)
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current)
    },
  }))

  return <div className="turnstile" data-turnstile-action={action} ref={container} />
}
