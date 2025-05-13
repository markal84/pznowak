'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import Lightbox, { Slide as YarlSlide } from 'yet-another-react-lightbox' // Zaimportuj Slide jako YarlSlide
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Video from 'yet-another-react-lightbox/plugins/video'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'

// Definicja typu dla pojedynczego źródła wideo
interface VideoSlideSource {
  src: string
  type: string
}

// Definicja typu dla slajdu obrazkowego
interface ImageSlide {
  src: string
  alt?: string
  type?: undefined // Opcjonalne, dla spójności z VideoSlide
}

// Definicja typu dla slajdu wideo
interface VideoSlide {
  type: 'video'
  sources: VideoSlideSource[]
  poster?: string // Obrazek wyróżniający dla wideo
  alt?: string
  width?: number
  height?: number
}

// Unia typów dla pojedynczego slajdu (obrazek lub wideo)
type Slide = ImageSlide | VideoSlide

// Propsy dla komponentu ProductGalleryClient
interface ProductGalleryClientProps {
  slides: Slide[]
  imageAlt: string // Domyślny tekst alternatywny dla obrazów
}

// Komponent ikony Play
const PlayIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-8 h-8 text-white opacity-90 group-hover:opacity-100 transition-opacity"
    aria-hidden="true" // Ikona jest dekoracyjna
  >
    <path
      fillRule="evenodd"
      d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653z"
      clipRule="evenodd"
    />
  </svg>
)

const ProductGalleryClient: React.FC<ProductGalleryClientProps> = ({ slides, imageAlt }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Jeśli nie ma slajdów, nic nie renderuj
  if (!slides || slides.length === 0) return null

  const firstSlide = slides[0]

  // Przygotowanie slajdów specjalnie dla Lightboxa
  // Dla wideo usuwamy 'poster', aby lightbox spróbował wygenerować go z klatki filmu,
  // ale zachowujemy width i height, jeśli są dostępne.
  const lightboxSlides = slides.map(slide => {
    if (slide.type === 'video') {
      // Poprawka dla błędu: 'poster' is assigned a value but never used.
      // Używamy _poster, aby zasygnalizować, że celowo nie używamy tej zmiennej,
      // ale chcemy ją wykluczyć z reszty właściwości.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { poster: _poster, ...videoSlideWithoutPoster } = slide
      return { ...videoSlideWithoutPoster, width: slide.width, height: slide.height }
    }
    return slide
  }) as YarlSlide[] // Poprawka dla błędu: Unexpected any. Używamy asercji do typu YarlSlide[].

  return (
    <div>
      {/* Główny obraz/poster wideo */}
      <div
        onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
        className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg cursor-pointer group"
        role="button" // Dodanie roli dla dostępności
        tabIndex={0} // Umożliwienie focusu
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setLightboxIndex(0); setLightboxOpen(true); }}} // Obsługa klawiatury
      >
        <Image
          src={firstSlide.type === 'video' ? (firstSlide.poster || '/placeholder-image.png') : firstSlide.src}
          alt={firstSlide.alt || imageAlt}
          fill
          style={{ objectFit: 'cover' }}
          sizes="(max-width: 1024px) 100vw, 50vw" // Dostosuj wg potrzeb
          priority // Dla LCP (Largest Contentful Paint)
          className="rounded-lg transition-opacity duration-300 group-hover:opacity-90"
        />
        {firstSlide.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors pointer-events-none">
            <PlayIcon />
          </div>
        )}
      </div>

      {/* Miniaturki na stronie (jeśli jest więcej niż 1 slajd) */}
      {slides.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto py-1">
          {slides.map((slide, idx) => {
            const isVideo = slide.type === 'video'
            // Dla miniaturki na stronie zawsze używamy slide.poster (obrazka wyróżniającego) lub placeholder
            const thumbnailUrl = isVideo ? (slide.poster || '/placeholder-image.png') : slide.src
            const thumbnailAlt = slide.alt || (isVideo ? `Miniatura wideo ${idx + 1}` : `Miniatura ${idx + 1}`)

            return (
              <div
                key={idx}
                onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
                className={`w-16 h-16 relative rounded-md cursor-pointer overflow-hidden border flex-shrink-0 group ${
                  idx === lightboxIndex && lightboxOpen ? 'ring-2 ring-brand-gold border-brand-gold' : 'border-gray-300 dark:border-gray-600'
                }`}
                role="button" // Dodanie roli dla dostępności
                tabIndex={0} // Umożliwienie focusu
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setLightboxIndex(idx); setLightboxOpen(true); }}} // Obsługa klawiatury
                aria-label={`Otwórz slajd ${idx + 1} w lightboxie`}
              >
                <Image
                  src={thumbnailUrl}
                  alt={thumbnailAlt}
                  fill
                  sizes="64px" // Zgodne z w-16 h-16 (64px)
                  style={{ objectFit: 'cover' }}
                  className="transition-opacity duration-300 group-hover:opacity-75"
                  onError={(e) => {
                    // Opcjonalnie: obsługa błędu ładowania miniaturki, np. ustawienie domyślnego obrazka
                    console.error("Błąd ładowania miniaturki na stronie:", thumbnailUrl, e.currentTarget.naturalWidth);
                    // e.currentTarget.src = '/placeholder-image.png'; // Przykład zastąpienia obrazka
                  }}
                />
                {isVideo && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors pointer-events-none">
                    <PlayIcon />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Komponent Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides} // Używamy zmodyfikowanych i poprawnie otypowanych slajdów
        index={lightboxIndex}
        plugins={[Thumbnails, Video]}
        video={{
          autoPlay: false,
          // Można tu dodać inne opcje wideo, np. playsInline: true, muted: false,
          // poster: '', // Upewniamy się, że lightbox nie używa globalnego postera dla wideo, jeśli nie chcemy
        }}
        thumbnails={{
          // Można dostosować wygląd miniaturek w lightboxie
          // imageFit: "cover", // lub "contain"
          // width: 120,
          // height: 80,
          // padding: 2,
          // gap: 2,
        }}
      />
    </div>
  )
}

export default ProductGalleryClient
