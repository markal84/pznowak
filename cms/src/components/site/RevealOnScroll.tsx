'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const ITEMS = '[data-reveal] > *:not([data-rv])'
const STAGGER = 90
const MAX_STAGGER = 3

/**
 * Pojawianie się elementów list `[data-reveal]` przy przewijaniu (IntersectionObserver + przejście w czasie).
 *
 * Zastępuje dawną animację sterowaną przewijaniem (`animation-timeline: view()`), która w Safari na komputerze
 * nie działała wcale, a na telefonach migała: element stał widoczny, po kilku pikselach przewinięcia znikał
 * i dopiero wtedy wjeżdżał (zakresy z opóźnieniem zaczynały się, gdy był już na ekranie; pasek adresu
 * zmieniał wysokość okna). Teraz:
 * - ukrywamy tylko to, co w chwili sprawdzenia leży w całości poniżej ekranu, więc nic widocznego nie znika;
 * - raz pokazany element zostaje pokazany (bez cofania przy przewijaniu w górę);
 * - bez JS, w druku i przy „ogranicz ruch” treść jest po prostu widoczna.
 */
export default function RevealOnScroll() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const done = (el: HTMLElement) => {
      el.dataset.rv = 'done'
      el.style.removeProperty('--rv-delay')
    }

    const io = new IntersectionObserver(
      (entries) => {
        const shown = entries
          .filter((e) => e.isIntersecting)
          .map((e) => e.target as HTMLElement)
          .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
        shown.forEach((el, i) => {
          io.unobserve(el)
          el.style.setProperty('--rv-delay', `${Math.min(i, MAX_STAGGER) * STAGGER}ms`)
          el.dataset.rv = 'in'
          // Koniec własnego przejścia (nie wewnętrznych, np. hover zdjęcia) albo awaryjnie po czasie.
          const finish = (e?: TransitionEvent) => {
            if (e && e.target !== el) return
            el.removeEventListener('transitionend', finish)
            if (el.dataset.rv === 'in') done(el)
          }
          el.addEventListener('transitionend', finish)
          window.setTimeout(finish, 1200 + Math.min(i, MAX_STAGGER) * STAGGER)
        })
      },
      { rootMargin: '0px 0px -6% 0px' },
    )

    const scan = () => {
      const vh = window.innerHeight
      document.querySelectorAll<HTMLElement>(ITEMS).forEach((el) => {
        // Widoczne (albo nad ekranem, np. po skoku do kotwicy) zostaje jak jest.
        if (el.getBoundingClientRect().top < vh) {
          el.dataset.rv = 'done'
          return
        }
        el.dataset.rv = 'wait'
        io.observe(el)
      })
    }

    scan()
    // Listy dorenderowane później (np. opinie Google po pobraniu) też dostają efekt.
    let raf = 0
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(scan)
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      mo.disconnect()
      io.disconnect()
      cancelAnimationFrame(raf)
      // Nic nie może zostać ukryte bez obserwatora; zdjęty atrybut pozwala następnemu skanowi ocenić element od nowa.
      document.querySelectorAll<HTMLElement>('[data-rv="wait"]').forEach((el) => el.removeAttribute('data-rv'))
    }
  }, [pathname])

  return null
}
