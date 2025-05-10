'use client'
import React, { useState, useEffect } from 'react' // Dodano useEffect dla debugowania
import Image from 'next/image'
import Lightbox from 'yet-another-react-lightbox'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Video from 'yet-another-react-lightbox/plugins/video'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'

interface ImageSlide {
  src: string
  alt?: string
  type?: undefined
}

interface VideoSlideSource {
  src: string
  type: string
}

interface VideoSlide {
  type: 'video'
  sources: VideoSlideSource[]
  poster?: string // Poster jest opcjonalny
  alt?: string
  width?: number
  height?: number
}

type Slide = ImageSlide | VideoSlide

interface ProductGalleryClientProps {
  slides: Slide[]
  imageAlt: string
}

const PlayIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="w-8 h-8 text-white opacity-90 group-hover:opacity-100 transition-opacity"
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


  if (!slides || slides.length === 0) return null

  const firstSlide = slides[0]

  // Przygotowanie slajdów specjalnie dla Lightboxa
  // Dla wideo usuwamy 'poster', aby lightbox spróbował wygenerować go z klatki filmu
  const lightboxSlides = slides.map(slide => {
    if (slide.type === 'video') {
      const { poster, ...videoSlideWithoutPoster } = slide
      // Można by tu dodać width i height, jeśli są znane, co może pomóc lightboxowi
      return { ...videoSlideWithoutPoster, width: slide.width, height: slide.height };
    }
    return slide
  })

  return (
    <div>
      {/* Duże zdjęcie/poster */}
      <div
        onClick={() => { setLightboxOpen(true); setLightboxIndex(0); }} // Ustawiamy index 0 dla Lightboxa
        className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg cursor-pointer group"
      >
        <Image
          src={firstSlide.type === 'video' ? (firstSlide.poster || '/placeholder-image.png') : firstSlide.src}
          alt={firstSlide.alt || imageAlt}
          fill
          style={{ objectFit: 'cover' }}
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
          className="rounded-lg transition-opacity duration-300 group-hover:opacity-90"
        />
        {firstSlide.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
            <PlayIcon />
          </div>
        )}
      </div>

      {/* Miniaturki na stronie */}
      {slides.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto py-1">
          {slides.map((slide, idx) => {
            const isVideo = slide.type === 'video'
            // Dla miniaturki na stronie zawsze używamy slide.poster (czyli obrazka wyróżniającego)
            const thumbnailUrl = isVideo ? (slide.poster || '/placeholder-image.png') : slide.src
            const thumbnailAlt = slide.alt || (isVideo ? `Miniatura wideo ${idx + 1}` : `Miniatura ${idx + 1}`)

            // console.log(`Rendering on-page thumbnail ${idx}: isVideo=${isVideo}, thumbnailUrl=${thumbnailUrl}`); // Debug

            return (
              <div
                key={idx}
                onClick={() => { setLightboxIndex(idx); setLightboxOpen(true) }}
                className={`w-16 h-16 relative rounded-md cursor-pointer overflow-hidden border flex-shrink-0 group ${ // rounded-md zamiast -lg
                  idx === lightboxIndex && lightboxOpen ? 'ring-2 ring-brand-gold border-brand-gold' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <Image
                  src={thumbnailUrl}
                  alt={thumbnailAlt}
                  fill
                  sizes="64px" // Zgodne z w-16 h-16 (64px)
                  style={{ objectFit: 'cover' }}
                  className="transition-opacity duration-300 group-hover:opacity-75" // Usunięto rounded-sm, dziedziczy z parenta
                  onError={(e) => console.error("Błąd ładowania miniaturki na stronie:", thumbnailUrl, e.currentTarget.naturalWidth)}
                />
                {isVideo && (
                   <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                    <PlayIcon />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides as any} // Używamy zmodyfikowanych slajdów
        index={lightboxIndex}
        plugins={[Thumbnails, Video]}
        video={{
          autoPlay: false,
          // Dla `yet-another-react-lightbox` v3+, można ustawić `playsInline`, `muted` etc.
          // poster: '', // Upewnienie się, że nie ma globalnego postera dla wideo w lightboxie
        }}
        thumbnails={{
          // Można dostosować vignetki
          // imageFit: "cover", // lub "contain"
        }}
      />
    </div>
  )
}

export default ProductGalleryClient