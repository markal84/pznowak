'use client'

import Image, { StaticImageData } from 'next/image'

// === Statyczne importy obrazów (ścieżka względna do folderu public) ===
import imgGrandgrandfather from '../../public/about-us-grandgrandfather_Wiktor.png'
import imgGrandfather from '../../public/about-us-grandfather.png'
import imgFather from '../../public/about-us-father.png'
import imgSon from '../../public/about-us-son.png'

interface HistoryEvent {
  id: number
  year: string
  title: string
  description: string
  image: StaticImageData
  alt: string
}

const history: HistoryEvent[] = [
  {
    id: 0,
    year: '1890',
    title: 'Wiktor Nowak',
    description: 'Kowal z Szańca. Przywoził narzędzia z Francji, tworzył pierwsze projekty biżuterii.',
    image: imgGrandgrandfather,
    alt: 'Wiktor Nowak - kowal z Szańca, początki tradycji',
  },
  {
    id: 1,
    year: '1955',
    title: 'Stanisław Nowak',
    description: 'Mistrz złotnictwa lat 50. Rozwijał warsztat, szkolił się u najlepszych w regionie.',
    image: imgGrandfather,
    alt: 'Stanisław Nowak - mistrz złotnictwa, lata pięćdziesiąte',
  },
  {
    id: 2,
    year: '1985',
    title: 'Mieczysław Nowak',
    description: 'Tytan pracy. Tworzył cenione projekty lat 80., dziś trafiające do renowacji w pracowni.',
    image: imgFather,
    alt: 'Mieczysław Nowak - twórca projektów, lata osiemdziesiąte',
  },
  {
    id: 3,
    year: 'Obecnie',
    title: 'Michał Nowak',
    description: 'Kultywuje tradycję. Ręczna oprawa i projekty z kamieniami szlachetnymi, dbałość o detale.',
    image: imgSon,
    alt: 'Michał Nowak - kultywuje tradycję, biżuteria z kamieniami',
  },
]

export function RootsTimeline() {
  return (
    <section id="korzenie" className="w-full py-[var(--space-section-md)]">
      <h2 className="mb-12 text-center font-serif text-4xl sm:text-5xl font-light">
        Nasze korzenie
      </h2>

      {/* Mobile: pionowa oś czasu */}
      <ul role="list" className="relative space-y-12 md:hidden timeline-axis">
        {history.map((event) => (
          <li key={event.id} className="relative pl-8">
            <span className="absolute -left-[3px] top-0 h-3 w-3 rounded-full bg-amber-400" />
            <h3 className="text-lg font-semibold text-amber-600">{event.year}</h3>
            <p className="mt-1 font-medium">{event.title}</p>
            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {event.description}
            </p>
          </li>
        ))}
      </ul>

      {/* Desktop: 3‑kolumnowe karty */}
      <ul role="list" className="hidden gap-8 md:grid md:grid-cols-3">
        {history.map((event) => (
          <li
            key={event.id}
            className="group relative overflow-hidden rounded-lg shadow-sm bg-[--color-surface]"
          >
            {/*
              Zmiana: object-contain, aby całe zdjęcie było widoczne.
              Stały aspekt + neutralne tło ogranicza CLS i zapewnia estetyczne „pasy”.
            */}
            <div className="relative w-full bg-[--color-surface-muted] aspect-[4/5] lg:aspect-[3/4]">
              <Image
                src={event.image}
                alt={event.alt}
                placeholder="blur"
                fill
                sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
                className="object-contain object-center p-2 transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transform-none"
              />
            </div>
            {/* Caption under image (no overlay) */}
            <div className="p-4">
              <span className="font-serif text-xl text-brand-gold block text-center">{event.year}</span>
              <h3 className="mt-1 text-base font-medium text-gray-900 dark:text-white text-center">
                {event.title}
              </h3>
              <p className="mt-2 text-center text-sm text-gray-700 dark:text-gray-300">
                {event.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RootsTimeline;
