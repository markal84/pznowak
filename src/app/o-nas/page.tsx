import React from 'react'
import Image from 'next/image'
import RootsTimeline from '@/components/RootsTimeline'
// Placeholder for potential image imports

const AboutPage = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-serif font-light mb-8 text-center">Michał Nowak - Pracownia Złotnicza</h1>
      <div className="max-w-3xl mx-auto leading-relaxed space-y-6 font-sans">
        {/* Image of the workshop */}
        <div className="relative w-full h-64 bg-gray-200 dark:bg-gray-700 my-8 rounded overflow-hidden shadow-md">
          <Image 
            src="/about-us-workshop.png"
            alt="Wnętrze pracowni złotniczej Michała Nowaka" 
            fill 
            style={{ objectFit: 'cover' }} 
            sizes="(max-width: 768px) 100vw, 896px"
            priority
          />
        </div>
        <p className="text-base md:text-lg font-light">
          W naszej rodzinie złotnictwo to coś więcej niż zawód – to prawdziwa tradycja przekazywana z ojca na syna już od trzech pokoleń. Każdy pierścionek, który opuszcza naszą pracownię, to nie tylko efekt kunsztownego rzemiosła, ale także historia, emocje i pasja do piękna.
        </p>
        <p className="text-base md:text-lg font-light">
          Od ponad 60 lat łączymy klasyczne techniki jubilerskie z nowoczesnym podejściem, tworząc biżuterię o niepowtarzalnym charakterze. Cenimy ręczną pracę, dbałość o najdrobniejszy detal oraz materiały najwyższej jakości – dlatego każdy nasz wyrób jest unikalnym dziełem sztuki, które z dumą może być przekazywane kolejnym pokoleniom.
        </p>
        <p className="text-base md:text-lg font-light">
          Nasz warsztat jest miejscem, w którym tradycja spotyka nowoczesność. To tutaj realizujemy Wasze marzenia – projektując pierścionki zaręczynowe, obrączki i unikatową biżuterię na indywidualne zamówienie, zgodnie z Waszą wizją i oczekiwaniami.
        </p>
        <p className="text-base md:text-lg font-light">
          Zapraszamy do świata, w którym biżuteria staje się opowieścią o miłości, historii i wyjątkowych chwilach w życiu.
        </p>
        <p className="text-base md:text-lg font-semibold text-center pt-4">
          Tworzymy biżuterię z duszą. Dla Was – od czterech pokoleń.
        </p>

        {/* --- Sekcja Zdjęć Pokoleniowych --- */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <RootsTimeline />
        </div>
      </div>
    </div>
  )
}

export default AboutPage 