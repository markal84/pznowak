'use client'
import React, { useState, ReactNode, useId } from 'react'

interface Props { title: string; children: ReactNode; initialOpen?: boolean }

/** Akordeon na <details>: natywny, dostępny, bez animacji wysokości (brak przesuwania układu podczas animacji). */
export default function AccordionItem({ title, children, initialOpen = false }: Props) {
  const [open, setOpen] = useState(initialOpen)
  const id = useId()
  return (
    <div className="border-b border-line">
      <h2 className="font-sans">
        <button
          type="button"
          className="flex items-center justify-between w-full py-4 text-left font-semibold text-ink hover:text-gold transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
        >
          <span>{title}</span>
          <svg className={`w-5 h-5 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </h2>
      <div id={id} hidden={!open} className="pb-5">
        {children}
      </div>
    </div>
  )
}
