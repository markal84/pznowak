'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useRef, useState, type ReactNode, type TouchEvent } from 'react'
import type { Slide } from 'yet-another-react-lightbox'

import { variantImageAlt } from '@/lib/stone-variants'

import { useSelectedStoneVariant } from './StoneVariants'
import Tag from './Tag'

// Podgląd (z biblioteką i pełnymi zdjęciami) ładuje się dopiero po pierwszym kliknięciu w zdjęcie.
const ProductLightbox = dynamic(() => import('./ProductLightbox'), { ssr: false })

const SWIPE_MIN_PX = 40

type ProductMediaProps = {
  name: string
  images: string[]
  video: string
  /** Pod galerią, np. „Zamów z innym kamieniem” (kółka podmieniają zdjęcia galerii). */
  children?: ReactNode
}

/** `cover`: obraz w kadrze oryginału (cała galeria z Y) – kadrujemy jak zdjęcie karty; inaczej cały obraz na rozmytym tle. */
type VariantInfo = { stone: string; isVisualization: boolean; alt: string; cover: boolean }

type Item =
  | { kind: 'image'; src: string; label: string; variant?: VariantInfo }
  | { kind: 'video'; src: string; label: string; poster: string }

const IMAGE_LABELS = ['widok z boku', 'oprawa z bliska', 'obrączka', 'inne ujęcie', 'kolejne ujęcie']

function ArrowIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg aria-hidden="true" fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 20 20" width="20">
      <path d={dir === 'left' ? 'M12.5 4 6.5 10l6 6' : 'M7.5 4l6 6-6 6'} />
    </svg>
  )
}

export default function ProductMedia({ name, images, video, children }: ProductMediaProps) {
  const variant = useSelectedStoneVariant()
  // Wybrany inny kamień (zlecenie Y): cała galeria to obrazy wariantu, w kolejności zdjęć karty; zdjęć oryginału z nimi
  // nie mieszamy (pierścionek w dwóch kolorach naraz wyglądał niespójnie). Film zostaje prawdziwy, z okładką oryginału.
  const items: Item[] = variant
    ? variant.images.map((src, i) => ({
        kind: 'image',
        src,
        label: `${variant.isVisualization ? 'Wizualizacja' : 'Zdjęcie'} ${i + 1}: ${variant.stone.toLowerCase()}`,
        variant: {
          stone: variant.stone,
          isVisualization: variant.isVisualization,
          alt: variantImageAlt(name, variant, i),
          cover: variant.images.length > 1,
        },
      }))
    : images.map((src, i) => ({
        kind: 'image',
        src,
        label: `Zdjęcie ${i + 1}: ${IMAGE_LABELS[i] ?? 'kolejne ujęcie'}`,
      }))
  if (video) items.push({ kind: 'video', src: video, label: 'Film o pierścionku', poster: images[0] ?? '' })

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  // Zmiana kamienia pokazuje od razu jego obraz (stan ustawiany w trakcie renderu, wzorzec z dokumentacji Reacta).
  const variantKey = variant?.slug ?? ''
  const [shownVariant, setShownVariant] = useState(variantKey)
  if (shownVariant !== variantKey) {
    setShownVariant(variantKey)
    setIndex(0)
    setPlaying(false)
  }
  const [lightbox, setLightbox] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const zoomRef = useRef<HTMLButtonElement>(null)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const current = items[index] ?? items[0]
  if (!current) return null

  const pick = (i: number) => {
    setIndex(i)
    setPlaying(false)
  }
  const step = (delta: number) => pick((index + delta + items.length) % items.length)

  // Przesunięcie palcem po głównym zdjęciu: poziomy ruch zmienia zdjęcie, pionowy zostaje przewijaniem strony.
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = t ? { x: t.clientX, y: t.clientY } : null
  }
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current
    const t = e.changedTouches[0]
    touchStart.current = null
    if (!start || !t || items.length < 2) return
    const dx = t.clientX - start.x
    if (Math.abs(dx) >= SWIPE_MIN_PX && Math.abs(dx) > Math.abs(t.clientY - start.y)) step(dx < 0 ? 1 : -1)
  }

  const slides: Slide[] = items.map((item) =>
    item.kind === 'image'
      ? { src: item.src, alt: item.variant ? item.variant.alt : `${name}: ${item.label.toLowerCase()}` }
      : { type: 'video', sources: [{ src: item.src, type: 'video/mp4' }], poster: item.poster || undefined },
  )

  return (
    <div className="product-media">
      <div className="product-main" onTouchEnd={onTouchEnd} onTouchStart={onTouchStart}>
        {current.kind === 'image' ? (
          <button
            aria-label="Powiększ zdjęcie"
            className="product-zoom"
            onClick={() => setLightbox(true)}
            ref={zoomRef}
            type="button"
          >
            {current.variant && !current.variant.cover ? (
              // Pojedynczy obraz wariantu bywa pionowy: cały pierścionek w kadrze, tło z tego samego obrazu (rozmyte).
              <span className="ph ph-variant">
                <Image alt="" aria-hidden="true" className="ph-variant-bg" fill sizes="(max-width: 960px) 100vw, 55vw" src={current.src} />
                <Image
                  alt={current.variant.alt}
                  fill
                  priority
                  sizes="(max-width: 960px) 100vw, 55vw"
                  src={current.src}
                  style={{ objectFit: 'contain' }}
                />
              </span>
            ) : current.variant ? (
              // Obraz z kadru zdjęcia karty: ten sam kadr co oryginał, więc przełączanie kamieni nie przesuwa pierścionka.
              <span className="ph">
                <Image
                  alt={current.variant.alt}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 960px) 100vw, 55vw"
                  src={current.src}
                  style={{ objectFit: 'cover' }}
                />
              </span>
            ) : (
              <span className="ph">
                <Image
                  alt={`${name}: ${current.label.toLowerCase()}`}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 960px) 100vw, 55vw"
                  src={current.src}
                  style={{ objectFit: 'cover' }}
                />
              </span>
            )}
          </button>
        ) : (
          <>
            <video
              aria-label={`Film o pierścionku ${name}`}
              controls={playing}
              muted
              playsInline
              poster={current.poster || undefined}
              preload="none"
              ref={videoRef}
              src={current.src}
            />
            {!playing ? (
              <button
                aria-label="Odtwórz film"
                className="play-badge"
                onClick={() => {
                  setPlaying(true)
                  void videoRef.current?.play()
                }}
                type="button"
              >
                <span>
                  <svg aria-hidden="true" height="22" viewBox="0 0 22 22" width="22">
                    <circle cx="11" cy="11" fill="none" r="10" stroke="#22262A" strokeWidth="1.4" />
                    <path d="M9 7 L15 11 L9 15 Z" fill="#22262A" />
                  </svg>
                  Odtwórz film
                </span>
              </button>
            ) : null}
          </>
        )}
        {current.kind === 'image' && current.variant?.isVisualization ? (
          <Tag className="tag-corner variant-tag" name="Wizualizacja" sub={current.variant.stone} />
        ) : null}
        {items.length > 1 ? (
          <>
            <button aria-label="Poprzednie zdjęcie" className="media-arrow media-prev" onClick={() => step(-1)} type="button">
              <ArrowIcon dir="left" />
            </button>
            <button aria-label="Następne zdjęcie" className="media-arrow media-next" onClick={() => step(1)} type="button">
              <ArrowIcon dir="right" />
            </button>
            <span aria-hidden="true" className="media-count">
              {index + 1} / {items.length}
            </span>
          </>
        ) : null}
      </div>
      {lightbox ? (
        <ProductLightbox
          index={index}
          onClose={() => {
            setLightbox(false)
            zoomRef.current?.focus()
          }}
          onIndexChange={(i) => {
            setIndex(i)
            setPlaying(false)
          }}
          slides={slides}
        />
      ) : null}
      {items.length > 1 ? (
        <div aria-label="Zdjęcia pierścionka" className="thumbs" role="group">
          {items.map((item, i) => (
            <button
              aria-label={item.label}
              aria-pressed={i === index}
              className="thumb"
              key={item.label + i}
              onClick={() => pick(i)}
              type="button"
            >
              <span className="ph ph-11">
                <Image
                  alt=""
                  fill
                  sizes="120px"
                  src={item.kind === 'video' ? item.poster || images[0] : item.src}
                  style={item.kind === 'image' && item.variant && !item.variant.cover ? { objectFit: 'cover', objectPosition: '50% 45%' } : undefined}
                />
              </span>
              {item.kind === 'video' ? (
                <span aria-hidden="true" className="film">
                  Film
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
      {children}
    </div>
  )
}
