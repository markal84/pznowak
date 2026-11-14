'use client'

import { useEffect } from 'react'
import { classifyLink, track } from '@/lib/analytics'

/**
 * Jeden nasłuch na całej stronie: klik w link tel:, mailto:, mapy, wizytówkę Google albo Facebook/Instagram
 * wysyła zdarzenie do Umami. Miejsce kliknięcia (`miejsce`) to najbliższy przodek z `data-miejsce`
 * (nagłówek, stopka) albo „treść”; adres podstrony Umami zapisuje sam.
 * Faza przechwytywania i `auxclick`: liczy też kliknięcia środkowym przyciskiem i te, które komponent zatrzymał.
 */
export default function AnalyticsClicks() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.type === 'auxclick' && event.button !== 1) return
      const target = event.target instanceof Element ? event.target : null
      const link = target?.closest<HTMLAnchorElement>('a[href]')
      if (!link) return
      const hit = classifyLink(link.href)
      if (!hit) return
      const place = link.closest<HTMLElement>('[data-miejsce]')?.dataset.miejsce ?? 'treść'
      track(hit.event, { ...hit.data, miejsce: place })
    }
    document.addEventListener('click', onClick, true)
    document.addEventListener('auxclick', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('auxclick', onClick, true)
    }
  }, [])
  return null
}
