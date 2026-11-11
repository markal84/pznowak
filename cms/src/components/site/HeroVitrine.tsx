'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import HangingTag from './HangingTag'

export type VitrineSlide = {
  slug: string
  name: string
  sub: string
  alt: string
  src: string
  pos: string
  posMobile: string
}

/** Powiększenie lupy i jej promień (px). Zdjęcia mają 1320 px szerokości, więc ×2 na panelu ~720 px jest nadal ostre. */
const ZOOM = 2
const RADIUS = 104

/**
 * Witryna pod lupą: duże zdjęcie pierścionka, wisząca przywieszka z nazwą i rząd miniatur do przełączania (komputer).
 * Nad zdjęciem kursor zamienia się w lupę jubilerską, która pokazuje oprawę i szlif z bliska.
 * Na telefonie zdjęcia przesuwa się palcem (przewijanie z przyciąganiem), a kropki pokazują, które jest widoczne.
 * Każde zdjęcie jest linkiem do karty pierścionka.
 */
export default function HeroVitrine({ slides }: { slides: VitrineSlide[] }) {
  const [active, setActive] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const lens = useRef<HTMLSpanElement>(null)
  const imgs = useRef<(HTMLImageElement | null)[]>([])

  // Telefon: aktywny slajd wynika z przewinięcia toru (na komputerze tor nie przewija się, slajdy leżą jeden na drugim).
  useEffect(() => {
    const el = track.current
    if (!el) return
    const onScroll = () => {
      if (el.scrollWidth <= el.clientWidth + 1) return
      const i = Math.round(el.scrollLeft / el.clientWidth)
      setActive((prev) => (prev === i ? prev : Math.max(0, Math.min(slides.length - 1, i))))
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [slides.length])

  const goTo = useCallback((i: number) => {
    setActive(i)
    const el = track.current
    if (el && el.scrollWidth > el.clientWidth + 1) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }, [])

  // Pełne zdjęcie do lupy pobieramy dopiero, gdy kursor wejdzie nad witrynę (telefon go nie pobiera).
  const preloadLens = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'mouse') return
      for (const s of slides) new window.Image().src = s.src
    },
    [slides],
  )

  const hideLens = useCallback(() => {
    lens.current?.removeAttribute('data-on')
  }, [])

  // Lupa: tło soczewki to to samo zdjęcie w rozmiarze ×ZOOM, przesunięte tak, by środek soczewki pokazywał punkt pod kursorem.
  // Kadr `object-fit: cover` liczymy sami (skala i przesunięcie wg object-position), żeby powiększenie trafiało w ten sam punkt.
  const moveLens = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = lens.current
      const img = imgs.current[active]
      if (!el || !img || e.pointerType !== 'mouse' || !img.naturalWidth) return
      const box = e.currentTarget.getBoundingClientRect()
      const mx = e.clientX - box.left
      const my = e.clientY - box.top
      const scale = Math.max(box.width / img.naturalWidth, box.height / img.naturalHeight)
      const w = img.naturalWidth * scale
      const h = img.naturalHeight * scale
      const [px, py] = getComputedStyle(img)
        .objectPosition.split(' ')
        .map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : 0.5))
      const ox = (box.width - w) * px
      const oy = (box.height - h) * py
      el.style.transform = `translate(${mx - RADIUS}px, ${my - RADIUS}px)`
      el.style.backgroundImage = `url("${slides[active].src}")`
      el.style.backgroundSize = `${w * ZOOM}px ${h * ZOOM}px`
      el.style.backgroundPosition = `${-((mx - ox) * ZOOM - RADIUS)}px ${-((my - oy) * ZOOM - RADIUS)}px`
      el.setAttribute('data-on', '')
    },
    [active, slides],
  )

  const current = slides[active] ?? slides[0]

  return (
    <figure className="hero-fig hv" data-count={slides.length}>
      <div className="hv-stage" onPointerEnter={preloadLens} onPointerLeave={hideLens} onPointerMove={moveLens}>
        <div className="hv-track" ref={track}>
          {slides.map((s, i) => (
            <Link
              aria-label={`Pierścionek ${s.name} – zobacz szczegóły`}
              className="hero-link hv-slide"
              aria-hidden={i === active ? undefined : true}
              data-active={i === active ? '' : undefined}
              href={`/pierscionki/${s.slug}`}
              key={s.slug}
              style={{ '--pos': s.pos, '--pos-m': s.posMobile } as React.CSSProperties}
              tabIndex={i === active ? undefined : -1}
            >
              <span className="ph ph-hero">
                <Image
                  alt={s.alt}
                  fill
                  priority={i === 0}
                  ref={(node) => {
                    imgs.current[i] = node
                  }}
                  sizes="(max-width: 960px) 100vw, 50vw"
                  src={s.src}
                />
              </span>
            </Link>
          ))}
        </div>
        <span aria-hidden="true" className="hv-lens" ref={lens} />
      </div>
      {/* Przywieszka wisi na sznurku pod dolną krawędzią zdjęcia i kołysze się jak prawdziwa (HangingTag). */}
      <HangingTag index={active} name={current.name} sub={current.sub} />
      {slides.length > 1 ? (
        <div aria-label="Pierścionki w witrynie" className="hv-thumbs" role="group">
          {slides.map((s, i) => (
            <button
              aria-label={`Pokaż pierścionek ${s.name}`}
              aria-pressed={i === active}
              className="hv-thumb"
              key={s.slug}
              onClick={() => goTo(i)}
              onFocus={() => goTo(i)}
              onMouseEnter={() => setActive(i)}
              type="button"
            >
              <Image alt="" fill sizes="64px" src={s.src} style={{ objectPosition: s.posMobile }} />
            </button>
          ))}
        </div>
      ) : null}
    </figure>
  )
}
