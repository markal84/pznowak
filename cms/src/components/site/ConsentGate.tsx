'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { hasConsent, subscribeConsent, type ConsentCategory } from '@/lib/cookie-consent'

/** Czy użytkownik zgodził się na kategorię opcjonalną; na serwerze i podczas hydracji zawsze `false`. */
export function useConsent(category: ConsentCategory): boolean {
  return useSyncExternalStore(
    subscribeConsent,
    () => hasConsent(category),
    () => false,
  )
}

/**
 * Jedyne miejsce, w którym wolno podpiąć skrypt lub osadzenie z kategorii opcjonalnej (statystyki, marketing, mapy).
 * Dzieci renderują się dopiero po zgodzie i znikają po jej wycofaniu (po wycofaniu zgody odśwież stronę, żeby
 * już załadowany skrypt przestał działać).
 *
 *   <ConsentGate category="analytics">
 *     <Script src="https://www.googletagmanager.com/gtag/js?id=…" strategy="afterInteractive" />
 *   </ConsentGate>
 *
 * Nowe narzędzie dopisz też w banerze (CookieBanner.tsx) i podnieś CONSENT_VERSION, jeśli pojawia się nowa kategoria.
 */
export default function ConsentGate({
  category,
  children,
  fallback = null,
}: {
  category: ConsentCategory
  children: ReactNode
  fallback?: ReactNode
}) {
  return useConsent(category) ? <>{children}</> : <>{fallback}</>
}
