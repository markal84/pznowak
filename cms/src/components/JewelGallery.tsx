'use client'

import { useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import RingImage from '@/components/RingImage'

const mainImageSizes = '(max-width: 760px) calc(100vw - 48px), (max-width: 1424px) 50vw, 640px'

export default function JewelGallery({
  images,
  name,
  video,
}: {
  images: string[]
  name: string
  video?: string
}) {
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        className="gallery-main"
        onClick={() => setOpen(true)}
        aria-label={'Powiększ zdjęcie pierścionka ' + name}
      >
        <RingImage
          key={images[active]}
          alt={name + ' — ujęcie ' + (active + 1)}
          fit="contain"
          preload
          sizes={mainImageSizes}
          src={images[active]}
        />
        <span className="zoom-label">Powiększ zdjęcie +</span>
      </button>
      <div className="thumbnails" role="group" aria-label="Zdjęcia pierścionka">
        {images.map((src, imageIndex) => (
          <button
            key={src}
            onClick={() => setActive(imageIndex)}
            aria-pressed={imageIndex === active}
            aria-label={'Pokaż ujęcie ' + (imageIndex + 1)}
          >
            <RingImage
              alt=""
              fit="contain"
              sizes="80px"
              src={src}
            />
          </button>
        ))}
      </div>
      {video && (
        <details className="product-info">
          <summary>Zobacz pierścionek w ruchu</summary>
          <video
            controls
            preload="none"
            playsInline
            poster={images[0]}
            style={{ width: '100%', maxHeight: 600 }}
            aria-label={'Film — pierścionek ' + name}
          >
            <source src={video} type="video/mp4" />
            Twoja przeglądarka nie obsługuje odtwarzania filmu.
          </video>
        </details>
      )}
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={active}
        slides={images.map((src, imageIndex) => ({
          src,
          alt: name + ' — ujęcie ' + (imageIndex + 1),
        }))}
        plugins={[Zoom]}
        labels={{
          Close: 'Zamknij',
          Next: 'Następne zdjęcie',
          Previous: 'Poprzednie zdjęcie',
          'Zoom in': 'Powiększ',
          'Zoom out': 'Pomniejsz',
        }}
      />
    </div>
  )
}
