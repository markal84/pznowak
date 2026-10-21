'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'

type ProductMediaProps = {
  name: string
  images: string[]
  video: string
}

type Item = { kind: 'image'; src: string; label: string } | { kind: 'video'; src: string; label: string; poster: string }

const IMAGE_LABELS = ['widok z boku', 'oprawa z bliska', 'obrączka', 'inne ujęcie', 'kolejne ujęcie']

export default function ProductMedia({ name, images, video }: ProductMediaProps) {
  const items: Item[] = images.map((src, i) => ({
    kind: 'image',
    src,
    label: `Zdjęcie ${i + 1}: ${IMAGE_LABELS[i] ?? 'kolejne ujęcie'}`,
  }))
  if (video) items.push({ kind: 'video', src: video, label: 'Film o pierścionku', poster: images[0] ?? '' })

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const current = items[index]
  if (!current) return null

  const pick = (i: number) => {
    setIndex(i)
    setPlaying(false)
  }

  return (
    <div className="product-media">
      <div className="product-main">
        {current.kind === 'image' ? (
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
      </div>
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
                <Image alt="" fill sizes="120px" src={item.kind === 'video' ? item.poster || images[0] : item.src} />
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
    </div>
  )
}
