import React from 'react'
import Image from 'next/image'
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
          W naszej rodzinie złotnictwo to coś więcej niż zawód – to prawdziwa tradycja przekazywana z ojca na syna już od trzech pokoleń. Każdy pierśionek, który opuszcza naszą pracownię, to nie tylko efekt kunsztownego rzemiosła, ale także historia, emocje i pasja do piękna.
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
          Tworzymy biżuterię z duszą. Dla Was – od trzech pokoleń.
        </p>

        {/* --- Sekcja Zdjęć Pokoleniowych --- */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl md:text-3xl font-serif font-light mb-8 text-center">Nasze Korzenie</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
            {/* Zdjęcie 1: Dziadek */}
            <div className="text-center">
              <div className="relative aspect-square rounded-lg overflow-hidden shadow-md mb-3 mx-auto max-w-xs sm:max-w-none">
                <Image 
                  src="/about-us-grandfather.png"
                  alt="Dziadek - Założyciel Pracowni" 
                  fill 
                  style={{ objectFit: 'cover' }} 
                  sizes="(max-width: 640px) 80vw, (max-width: 1024px) 30vw, 25vw"
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Dziadek [Imię]</p>
            </div>

            {/* Zdjęcie 2: Ojciec */}
            <div className="text-center">
              <div className="relative aspect-square rounded-lg overflow-hidden shadow-md mb-3 mx-auto max-w-xs sm:max-w-none">
                <Image 
                  src="/about-us-father.png"
                  alt="Ojciec - Kontynuator Tradycji"
                  fill 
                  style={{ objectFit: 'cover' }} 
                  sizes="(max-width: 640px) 80vw, (max-width: 1024px) 30vw, 25vw"
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Ojciec [Imię]</p>
            </div>

            {/* Zdjęcie 3: Syn (Michał) */}
            <div className="text-center">
              <div className="relative aspect-square rounded-lg overflow-hidden shadow-md mb-3 mx-auto max-w-xs sm:max-w-none">
                <Image 
                  src="/about-us-son.png"
                  alt="Michał Nowak - Obecny Właściciel"
                  fill 
                  style={{ objectFit: 'cover' }} 
                  sizes="(max-width: 640px) 80vw, (max-width: 1024px) 30vw, 25vw"
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Michał Nowak</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AboutPage 