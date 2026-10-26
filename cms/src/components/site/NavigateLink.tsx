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
export default function NavigateLink({
  className,
  children,
  label,
}: {
  className?: string
  children: ReactNode
  /** Nazwa linku dla czytników ekranu, gdy w środku jest sam obrazek. */
  label?: string
}) {
  const href = useSyncExternalStore(
    noopSubscribe,
    () => (prefersAppleMaps() ? SITE.mapsAppleUrl : SITE.mapsUrl),
    () => SITE.mapsUrl,
  )
  return (
    <a aria-label={label} className={className} href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  )
}
