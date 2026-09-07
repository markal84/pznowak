import Image from 'next/image'

const items = [
  { src: '/atelier-workshop-v2.png', alt: 'Fotorealistyczny kierunek zdjęcia stanowiska w pracowni złotniczej', title: 'Pracownia', text: 'Miejsce, w którym każdy detal powstaje ręcznie, pod lupą i przy dobrym świetle.' },
  { src: '/atelier-detail-v2.png', alt: 'Fotorealistyczny kierunek zdjęcia precyzyjnej pracy złotnika', title: 'Detale', text: 'Precyzyjna obróbka i wykończenie, które czuć w dotyku, nie tylko widać.' },
  { src: '/atelier-process-v2.png', alt: 'Fotorealistyczny kierunek zdjęcia szkicu i narzędzi złotniczych', title: 'Proces', text: 'Od szkicu po gotową formę. Przejrzyście, etap po etapie, bez niespodzianek.' },
]

export default function StudioGrid() {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
      {items.map((it, i) => (
        <li key={it.title} className="reveal" data-delay={String(i)}>
          <figure className="lift rounded-lg overflow-hidden bg-paper border border-line h-full">
            <div className="img-zoom relative aspect-[4/3] overflow-hidden bg-ivory-2">
              <Image src={it.src} alt={it.alt} fill sizes="(min-width:768px) 33vw, 100vw" className="object-cover" />
            </div>
            <figcaption className="p-5 md:p-6">
              <h3 className="text-2xl">{it.title}</h3>
              <p className="mt-2 muted">{it.text}</p>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  )
}
