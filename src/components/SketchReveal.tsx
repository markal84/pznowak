'use client'
import React, { useCallback, useRef, useState } from 'react'
import Image from 'next/image'

/**
 * Interaktywny element „warsztat około 1900 roku → warsztat dziś”.
 * Kontener ma stałe proporcje (3:2), obie warstwy są absolutne, a suwak zmienia
 * tylko clip-path i transform uchwytu. Żaden element strony nie zmienia położenia.
 */
export default function SketchReveal() {
  const [pos, setPos] = useState(58) // % szerokości, od której widać zdjęcie
  const ref = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const update = useCallback((clientX: number) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const pct = ((clientX - r.left) / r.width) * 100
    setPos(Math.min(96, Math.max(4, pct)))
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    update(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent) => { if (dragging.current) update(e.clientX) }
  const onPointerUp = () => { dragging.current = false }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 3
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); setPos((p) => Math.max(4, p - step)) }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); setPos((p) => Math.min(96, p + step)) }
    if (e.key === 'Home') { e.preventDefault(); setPos(4) }
    if (e.key === 'End') { e.preventDefault(); setPos(96) }
  }

  return (
    <div
      ref={ref}
      className="reveal relative w-full aspect-[3/2] rounded-lg overflow-hidden select-none touch-pan-y bg-ivory-2 shadow-lg"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ cursor: 'ew-resize' }}
    >
      {/* Warstwa 1: warsztat około 1900 roku (po lewej) */}
      <div className="absolute inset-0" aria-hidden>
        <Image
          src="/workshop-1900-v3.png"
          alt=""
          fill
          sizes="(min-width:1024px) 50vw, 100vw"
          className="object-cover"
          draggable={false}
        />
      </div>

      {/* Warstwa 2: współczesny warsztat (po prawej), przycinany clip-path */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <Image
          src="/workshop-today-v3.png"
          alt="Współczesny warsztat złotniczy z mikroskopem i częściowo widoczną drukarką 3D"
          fill
          sizes="(min-width:1024px) 50vw, 100vw"
          className="object-cover"
          draggable={false}
        />
        <span className="absolute right-4 top-4 text-[11px] font-semibold tracking-[0.18em] uppercase bg-ink/70 text-ivory px-2.5 py-1 rounded-sm">Dziś</span>
      </div>
      <span aria-hidden className="absolute left-4 top-4 text-[11px] font-semibold tracking-[0.18em] uppercase bg-ivory/80 text-ink px-2.5 py-1 rounded-sm">Ok. 1900</span>

      {/* Linia podziału + uchwyt (przesuwany transformem) */}
      <div className="absolute inset-y-0 left-0 w-full pointer-events-none" style={{ transform: `translateX(${pos}%)` }}>
        <div className="absolute inset-y-0 left-0 w-[2px] -translate-x-1/2 bg-ivory shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
      </div>
      <button
        type="button"
        role="slider"
        aria-label="Przesuń, aby porównać warsztat około 1900 roku ze współczesnym warsztatem"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        onKeyDown={onKeyDown}
        className="reveal-handle absolute top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ivory text-ink shadow-lg flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-2"
        style={{ left: `${pos}%` }}
      >
        <svg width="22" height="14" viewBox="0 0 22 14" fill="none" aria-hidden>
          <path d="M7 1 1 7l6 6M15 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}
