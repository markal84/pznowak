'use client'

import Lightbox, { type Slide } from 'yet-another-react-lightbox'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import Video from 'yet-another-react-lightbox/plugins/video'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/counter.css'

type ProductLightboxProps = {
  slides: Slide[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

/**
 * Pełnoekranowy podgląd zdjęć i filmu pierścionka (yet-another-react-lightbox: strzałki, klawisze ← → i Esc, gest
 * przesunięcia, licznik, zamknięcie krzyżykiem i tłem, pułapka fokusu, zablokowane przewijanie strony).
 * Ładowany dopiero po pierwszym otwarciu (`next/dynamic` w ProductMedia), więc zdjęcia w pełnej rozdzielczości
 * nie są pobierane przy wejściu na kartę. Bez wczytywania sąsiednich slajdów na zapas (`preload: 1`).
 */
export default function ProductLightbox({ slides, index, onIndexChange, onClose }: ProductLightboxProps) {
  return (
    <Lightbox
      carousel={{ preload: 1 }}
      close={onClose}
      controller={{ closeOnBackdropClick: true }}
      index={index}
      labels={{
        Previous: 'Poprzednie zdjęcie',
        Next: 'Następne zdjęcie',
        Close: 'Zamknij podgląd',
        Slide: 'Zdjęcie',
        Carousel: 'Karuzela zdjęć',
        Lightbox: 'Podgląd zdjęć',
        'Photo gallery': 'Galeria zdjęć pierścionka',
        '{index} of {total}': '{index} z {total}',
      }}
      on={{ view: ({ index: next }) => onIndexChange(next) }}
      open
      plugins={[Counter, Video]}
      slides={slides}
      video={{ controls: true, playsInline: true, preload: 'metadata' }}
    />
  )
}
