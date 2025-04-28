'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import Lightbox from 'yet-another-react-lightbox'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/thumbnails.css'

interface ProductGalleryClientProps {
  slides: { src: string }[]
  imageAlt: string
}

const ProductGalleryClient: React.FC<ProductGalleryClientProps> = ({ slides, imageAlt }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  if (!slides || slides.length === 0) return null

  return (
    <div>
      {/* Duże zdjęcie */}
      <div onClick={() => { setLightboxIndex(0); setLightboxOpen(true) }} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-lg cursor-pointer">
        <Image
          src={slides[0].src}
          alt={imageAlt}
          fill
          style={{ objectFit: 'cover' }}
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
          className="rounded-lg"
        />
      </div>
      {/* Miniaturki */}
      <div className="flex gap-2 mt-4">
        {slides.map((img, idx) => (
          <img
            key={idx}
            src={img.src}
            alt=""
            className={`w-16 h-16 object-cover rounded cursor-pointer border ${idx === lightboxIndex ? 'ring-2 ring-brand-gold' : ''}`}
            onClick={() => { setLightboxIndex(idx); setLightboxOpen(true) }}
          />
        ))}
      </div>
      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={slides}
        index={lightboxIndex}
        plugins={[Thumbnails]}
      />
    </div>
  )
}

export default ProductGalleryClient
