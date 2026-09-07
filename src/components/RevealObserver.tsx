'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Dodaje klasę .is-visible elementom .reveal, gdy wjeżdżają w viewport.
 * Animowane są tylko opacity/transform – element od początku zajmuje swoje miejsce,
 * więc nic nie „skacze”. Elementy dodane później (np. renderowane po stronie klienta)
 * są wychwytywane przez MutationObserver.
 */
export default function RevealObserver() {
  const pathname = usePathname()
  useEffect(() => {
    document.documentElement.classList.add('js-reveal')
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        })
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    )
    const observeAll = () => {
      document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)').forEach((el) => io.observe(el))
    }
    observeAll()
    const mo = new MutationObserver(observeAll)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { io.disconnect(); mo.disconnect() }
  }, [pathname])
  return null
}
