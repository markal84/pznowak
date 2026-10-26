'use client'

import React, { useEffect, useRef } from 'react'

interface RevealProps {
  children: React.ReactNode
  className?: string
  /** opóźnienie w ms — do sekwencji wewnątrz sekcji */
  delay?: number
  as?: 'div' | 'section' | 'li' | 'span'
}

/**
 * Delikatne pojawianie się treści przy scrollu (fade + rise).
 * Czysto prezentacyjne; przy prefers-reduced-motion CSS wyłącza efekt.
 */
export default function Reveal({ children, className = '', delay = 0, as = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const Tag = as as React.ElementType
  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={{ ['--reveal-delay' as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}
