'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { SITE } from '@/lib/site'

const noopSubscribe = () => () => {}

function prefersAppleMaps() {
  const { userAgent, maxTouchPoints } = navigator
  // iPadOS udaje Maca, ale ma ekran dotykowy.
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
}

/**
 * Link „Prowadź do pracowni”: otwiera nawigację w aplikacji Mapy (iPhone, iPad) albo w Mapach Google (reszta).
 * Zwykły link bez skryptów i bez ciasteczek; na serwerze i bez JS działa wersja Google.
 */
export default function NavigateLink({ className, children }: { className?: string; children: ReactNode }) {
  const href = useSyncExternalStore(
    noopSubscribe,
    () => (prefersAppleMaps() ? SITE.mapsAppleUrl : SITE.mapsUrl),
    () => SITE.mapsUrl,
  )
  return (
    <a className={className} href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  )
}
