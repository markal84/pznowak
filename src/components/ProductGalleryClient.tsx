'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import Lightbox, { Slide as YarlSlide } from 'yet-another-react-lightbox'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Video from 'yet-another-react-lightbox/plugins/video'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'

interface VideoSlideSource { src: string; type: string }
interface ImageSlide { src: string; alt?: string; type?: undefined }
interface VideoSlide { type: 'video'; sources: VideoSlideSource[]; poster?: string; alt?: string; width?: number; height?: number }
type Slide = ImageSlide | VideoSlide

interface Props { slides: Slide[]; imageAlt: string }

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-white drop-shadow" aria-hidden>
    <path d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z" />
  </svg>
)

/**
 * Galeria produktu: duże zdjęcie o stałych proporcjach (4:5) + miniatury.
 * Zmiana zdjęcia to przełączenie warstw ułożonych w tej samej komórce (crossfade),
 * więc wysokość nie zmienia się między slajdami.
 */
export default function ProductGalleryClient({ slides, imageAlt }: Props) {
  const [current, setCurrent] = useState(0)
  const [open, setOpen] = useState(false)
  if (!slides?.length) return null

  const isVideo = (s: Slide): s is VideoSlide => (s as VideoSlide).type === 'video'
  const firstImage = slides.find((s): s is ImageSlide => !isVideo(s))
  const srcOf = (s: Slide) => (isVideo(s) ? s.poster || firstImage?.src || '/logo-placeholder.png' : s.src)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full aspect-[4/5] sm:aspect-square lg:aspect-[4/5] rounded-lg overflow-hidden bg-ivory-2 border border-line cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-label="Powiększ zdjęcie"
      >
        {slides.map((s, i) => (
          <span
            key={i}
            className={['absolute inset-0 transition-opacity duration-500', i === current ? 'opacity-100' : 'opacity-0'].join(' ')}
            aria-hidden={i !== current}
          >
            <Image
              src={srcOf(s)}
              alt={s.alt || imageAlt}
              fill
              priority={i === 0}
              sizes="(min-width:1024px) 55vw, 100vw"
              className="object-cover"
            />
            {isVideo(s) && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/25"><PlayIcon /></span>
            )}
          </span>
        ))}
        <span className="absolute bottom-3 right-3 text-[11px] font-semibold tracking-[0.18em] uppercase bg-ink/70 text-ivory px-2.5 py-1 rounded-sm">Powiększ</span>
      </button>

      {slides.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 sm:grid-cols-6 gap-2" aria-label="Miniatury">
          {slides.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Zdjęcie ${i + 1}`}
                aria-current={i === current}
                className={['relative block w-full aspect-square rounded overflow-hidden border-2 transition-colors', i === current ? 'border-gold' : 'border-transparent hover:border-line-strong'].join(' ')}
              >
                <Image src={srcOf(s)} alt="" fill sizes="96px" className="object-cover" />
                {isVideo(s) && <span className="absolute inset-0 flex items-center justify-center bg-black/25"><PlayIcon /></span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={slides as unknown as YarlSlide[]}
        index={current}
        on={{ view: ({ index }) => setCurrent(index) }}
        plugins={[Thumbnails, Video, Zoom]}
        video={{ autoPlay: false }}
      />
    </div>
  )
}
