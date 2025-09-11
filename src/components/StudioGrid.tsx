import Image from 'next/image'

const items = [
  {
    src: '/about-us-workshop.png',
    alt: 'Pracownia - stanowisko pracy',
    title: 'Pracownia',
    text: 'Miejsce, w którym każdy detal powstaje ręcznie.'
  },
  {
    src: '/about-us-details.png',
    alt: 'Narzędzia złotnicze',
    title: 'Detale',
    text: 'Precyzyjna obróbka i wykończenie, które czuć w dotyku.'
  },
  {
    src: '/about-us-proccess.png',
    alt: 'Proces twórczy',
    title: 'Proces',
    text: 'Od szkicu po gotową formę - przejrzyście i z pasją.'
  },
]

export default function StudioGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {items.map((it) => (
        <figure key={it.title} className="overflow-hidden rounded-[8px] shadow-sm bg-[--color-surface] transition ease-[var(--ease-standard)] duration-200 hover:shadow-md hover:-translate-y-0.5 motion-reduce:transform-none">
          {/*
            Zmiana: object-contain, aby całe zdjęcie było widoczne.
            Lekkie padding + tło, by letterboxing wyglądał estetycznie.
            Delikatna korekta aspektu: bardziej poziomo na md+, żeby ograniczyć pasy.
          */}
          <div className="relative w-full aspect-[4/3] md:aspect-[3/2] bg-[--color-surface-muted]">
            <Image
              src={it.src}
              alt={it.alt}
              fill
              sizes="(min-width:768px) 33vw, 100vw"
              className="object-contain object-center p-1 sm:p-2"
              priority={false}
            />
          </div>
          <figcaption className="p-4">
            <h3 className="font-display text-lg md:text-xl text-gray-900 dark:text-white mb-1">{it.title}</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">{it.text}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}
