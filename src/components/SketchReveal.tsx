'use client'
import React, { useCallback, useRef, useState } from 'react'
import Image from 'next/image'

/**
 * Interaktywny element „szkic → pierścionek”.
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
      {/* Warstwa 1: szkic techniczny (po lewej) */}
      <div className="absolute inset-0" aria-hidden>
        <SketchSvg />
      </div>

      {/* Warstwa 2: zdjęcie (po prawej), przycinane clip-path */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <Image
          src="/hero-light.png"
          alt="Gotowy pierścionek z szafirem wykonany w pracowni"
          fill
          sizes="(min-width:1024px) 50vw, 100vw"
          className="object-cover"
          draggable={false}
        />
        <span className="absolute right-4 top-4 text-[11px] font-semibold tracking-[0.18em] uppercase bg-ink/70 text-ivory px-2.5 py-1 rounded-sm">Dziś</span>
      </div>
      <span aria-hidden className="absolute left-4 top-4 text-[11px] font-semibold tracking-[0.18em] uppercase bg-ivory/80 text-ink px-2.5 py-1 rounded-sm">Szkic</span>

      {/* Linia podziału + uchwyt (przesuwany transformem) */}
      <div className="absolute inset-y-0 left-0 w-full pointer-events-none" style={{ transform: `translateX(${pos}%)` }}>
        <div className="absolute inset-y-0 left-0 w-[2px] -translate-x-1/2 bg-ivory shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
      </div>
      <button
        type="button"
        role="slider"
        aria-label="Przesuń, aby porównać szkic z gotowym pierścionkiem"
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

function SketchSvg() {
  const ink = '#2b2823'
  const faint = 'rgba(43,40,35,0.35)'
  return (
    <svg viewBox="0 0 1536 1024" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
          <path d="M64 0H0V64" fill="none" stroke="rgba(43,40,35,0.08)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="1536" height="1024" fill="#f2ede3" />
      <rect width="1536" height="1024" fill="url(#grid)" />

      {/* szyna – widok z boku */}
      <g fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" transform="rotate(-14 796 702)">
        <ellipse className="sketch-line" data-d="1" cx="796" cy="702" rx="284" ry="140" />
        <ellipse className="sketch-line" data-d="1" cx="796" cy="702" rx="252" ry="110" />
      </g>
      {/* kamień – owal + fasety */}
      <g fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" transform="rotate(-12 712 570)">
        <ellipse className="sketch-line" data-d="2" cx="712" cy="570" rx="102" ry="148" />
        <ellipse className="sketch-line" data-d="2" cx="712" cy="570" rx="60" ry="90" />
        <path className="sketch-line" data-d="3" d="M712 425 650 483M712 425 774 483M712 725 650 667M712 725 774 667M606 575 650 483M606 575 650 667M818 575 774 483M818 575 774 667" />
        {/* łapki */}
        <path className="sketch-line" data-d="3" d="M640 470c-14-10-26-8-34 6M784 470c14-10 26-8 34 6M640 680c-14 10-26 8-34-6M784 680c14 10 26 8 34-6" />
      </g>

      {/* linie wymiarowe */}
      <g fill="none" stroke={faint} strokeWidth="1.5" strokeDasharray="6 6">
        <path className="sketch-line" data-d="3" d="M520 880V720M1060 880V720M520 860H1060" />
        <path className="sketch-line" data-d="3" d="M880 420H960M880 730H960M940 420V730" />
      </g>
      <g fill={ink} fontFamily="var(--font-display), Georgia, serif" fontStyle="italic">
        <text x="790" y="915" fontSize="30" textAnchor="middle" fill={faint}>szyna 2,4 mm · rozmiar wg dłoni</text>
        <text x="985" y="585" fontSize="30" fill={faint}>szafir owalny, 2,10 ct</text>
        <text x="985" y="625" fontSize="26" fill={faint}>oprawa 4 łapki, złoto 585</text>
        <text x="120" y="300" fontSize="44" fill={ink}>Projekt nr 1890 / 2026</text>
        <text x="120" y="345" fontSize="28" fill={faint}>rysunek warsztatowy · ręczne wykonanie</text>
      </g>
    </svg>
  )
}
