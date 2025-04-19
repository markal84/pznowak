'use client'

import Image, { StaticImageData } from 'next/image'

// === Statyczne importy obrazów (ścieżka względna do folderu public) ===
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
    id: 1,
    year: '1955',
    title: 'Założyciel – Dziadek',
    description:
      'Dziadek rozpoczął ręczną produkcję pierścionków w małym krakowskim warsztacie.',
    image: imgGrandfather,
    alt: 'Dziadek – Założyciel pracowni',
  },
  {
    id: 2,
    year: '1985',
    title: 'Kontynuacja – Ojciec',
    description:
      'Ojciec wprowadził nowoczesne techniki jubilerskie i szlify diamentów GIA.',
    image: imgFather,
    alt: 'Ojciec – Kontynuator tradycji',
  },
  {
    id: 3,
    year: '2024',
    title: 'Nowa era – Michał',
    description:
      'Michał uruchomił konfigurator 3D i sprzedaż online na całym świecie.',
    image: imgSon,
    alt: 'Michał – Obecny właściciel',
  },
]

export function RootsTimeline() {
  return (
    <section id="korzenie" className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="mb-12 text-center font-serif text-4xl sm:text-5xl font-light">
        Nasze korzenie
      </h2>

      {/* Mobile: pionowa oś czasu */}
      <ul
        role="list"
        className="relative space-y-12 md:hidden before:absolute before:left-3 before:top-0 before:h-full before:w-px before:bg-gray-300 dark:before:bg-gray-700"
      >
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
            className="group relative overflow-hidden rounded-lg shadow-sm"
          >
            <Image
              src={event.image}
              alt={event.alt}
              placeholder="blur"
              width={600}
              height={750}
              sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"
              className="h-80 w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="font-serif text-3xl text-amber-400">
                {event.year}
              </span>
              <h3 className="mt-2 text-lg font-medium text-white">
                {event.title}
              </h3>
              <p className="mt-2 px-6 text-center text-sm text-gray-200">
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
