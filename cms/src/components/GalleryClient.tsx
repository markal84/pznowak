'use client'

import ArrowIcon from '@/components/ArrowIcon'
import RingImage from '@/components/RingImage'
import { useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import type { Gallery } from '@/lib/collection'
import ContactBand from './ContactBand'

const galleryImageSizes =
  '(max-width: 370px) calc(100vw - 40px), (max-width: 760px) calc((100vw - 66px) / 2), (max-width: 1408px) calc((100vw - 160px) / 3), 411px'

export default function GalleryClient({ gallery }: { gallery: Gallery[] }) {
  const [index, setIndex] = useState(-1)
  const images = gallery.filter((item) => item.image)

  return (
    <>
      <section className="page-intro">
        <div className="wrap">
          <span className="eyebrow">Galeria pracowni</span>
          <h1>
            Każdy detal ma <em>znaczenie.</em>
          </h1>
          <p className="lead">
            Biżuteria z naszej pracowni. Otwórz zdjęcie, aby przyjrzeć się jej z bliska.
          </p>
        </div>
      </section>
      <section className="section wrap">
        <div className="gallery-grid">
          {images.map((item, imageIndex) => (
            <button
              key={item.id}
              onClick={() => setIndex(imageIndex)}
              aria-label={'Powiększ: ' + item.name}
            >
              <span className="gallery-image-frame">
                <RingImage
                  alt={item.name}
                  fit="cover"
                  sizes={galleryImageSizes}
                  src={item.image}
                />
              </span>
              <span>
                {item.name}{' '}
                <span aria-hidden="true" style={{ display: 'inline' }}>
                  <ArrowIcon />
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>
      <Lightbox
        open={index >= 0}
        close={() => setIndex(-1)}
        index={Math.max(0, index)}
        slides={images.map((item) => ({ src: item.image, alt: item.name }))}
        plugins={[Zoom]}
        labels={{
          Close: 'Zamknij',
          Next: 'Następne zdjęcie',
          Previous: 'Poprzednie zdjęcie',
          'Zoom in': 'Powiększ',
          'Zoom out': 'Pomniejsz',
        }}
      />
      <ContactBand />
    </>
  )
}
