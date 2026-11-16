'use client'

import { useEffect, useState } from 'react'
import { VariantInquiryLink } from './StoneVariants'

/**
 * Pasek z dwoma przyciskami przy dolnej krawędzi ekranu na karcie pierścionka (telefon i tablet). Na wąskim ekranie
 * przyciski „Zapytaj” i „Zadzwoń” stoją dopiero pod zdjęciami, parametrami i opisem, więc przy przeglądaniu zdjęć
 * nie ma jak zapytać bez przewijania. Pasek pojawia się po pierwszym przewinięciu i chowa się, gdy na ekranie są
 * główne przyciski karty albo stopka (żeby nie dublować ani nie zasłaniać). Na komputerze nie jest potrzebny:
 * kolumna z przyciskami jest widoczna obok galerii.
 */
export default function ProductStickyCta({ projectName, phoneHref }: { projectName: string; phoneHref: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const targets = [document.querySelector('.product-cta'), document.querySelector('.site-footer')].filter(
      (el): el is Element => Boolean(el),
    )
    const onScreen = new Set<Element>()
    let scrolled = window.scrollY > 240
    const update = () => setVisible(scrolled && onScreen.size === 0)
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target)
        else onScreen.delete(entry.target)
      }
      update()
    })
    targets.forEach((el) => io.observe(el))
    const onScroll = () => {
      const next = window.scrollY > 240
      if (next !== scrolled) {
        scrolled = next
        update()
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <div aria-hidden={!visible} className="product-sticky" data-visible={visible ? 'true' : 'false'}>
      <VariantInquiryLink className="btn" projectName={projectName} tabIndex={visible ? undefined : -1}>
        Zapytaj o {projectName}
      </VariantInquiryLink>
      <a aria-label="Zadzwoń do pracowni" className="btn btn-line product-sticky-call" href={phoneHref} tabIndex={visible ? undefined : -1}>
        <svg aria-hidden="true" fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" viewBox="0 0 20 20" width="18">
          <path d="M4.2 2.8h3l1.4 3.6-1.9 1.3a9.4 9.4 0 0 0 5.6 5.6l1.3-1.9 3.6 1.4v3a1.6 1.6 0 0 1-1.7 1.6A14.4 14.4 0 0 1 2.6 4.5 1.6 1.6 0 0 1 4.2 2.8Z" />
        </svg>
        Zadzwoń
      </a>
    </div>
  )
}
