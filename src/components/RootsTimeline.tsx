import Image, { StaticImageData } from 'next/image'
import imgGrandgrandfather from '../../public/about-us-grandgrandfather_Wiktor.png'
import imgGrandfather from '../../public/about-us-grandfather.png'
import imgFather from '../../public/about-us-father.png'
import imgSon from '../../public/about-us-son.png'

interface HistoryEvent { year: string; title: string; description: string; image: StaticImageData; alt: string }

const history: HistoryEvent[] = [
  { year: '1890', title: 'Wiktor Nowak', description: 'Kowal z Szańca. Przywoził narzędzia z Francji, tworzył pierwsze projekty biżuterii.', image: imgGrandgrandfather, alt: 'Wiktor Nowak z rodziną, fotografia z początku XX wieku' },
  { year: '1955', title: 'Stanisław Nowak', description: 'Mistrz złotnictwa lat 50. Rozwijał warsztat, szkolił się u najlepszych w regionie.', image: imgGrandfather, alt: 'Stanisław Nowak, fotografia z lat pięćdziesiątych' },
  { year: '1985', title: 'Mieczysław Nowak', description: 'Tytan pracy. Tworzył cenione projekty lat 80., które dziś trafiają do nas na renowację.', image: imgFather, alt: 'Mieczysław Nowak przy pracy w warsztacie' },
  { year: 'Dziś', title: 'Michał Nowak', description: 'Kultywuje tradycję. Ręczna oprawa i projekty z kamieniami szlachetnymi, dbałość o detale.', image: imgSon, alt: 'Michał Nowak przy stole złotniczym' },
]

export default function RootsTimeline() {
  return (
    <section id="korzenie" aria-labelledby="korzenie-title">
      <div className="reveal max-w-3xl">
        <p className="eyebrow">Nasze korzenie</p>
        <h2 id="korzenie-title" className="mt-3 text-[2.3rem] md:text-[3rem]">Od kuźni w Szańcu do pracowni w Busku</h2>
        <p className="mt-4 text-lg muted">Cztery pokolenia, ponad sto trzydzieści lat. Te same ręce, te same wymagania.</p>
      </div>

      <ol className="mt-10 md:mt-14 relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {/* Oś czasu (desktop) */}
        <span aria-hidden className="hidden lg:block absolute left-0 right-0 top-[calc(100%-7.5rem)] h-px bg-line-strong" />
        {history.map((e, i) => (
          <li key={e.year} className="reveal" data-delay={String(i)}>
            <figure className="lift bg-paper rounded-lg border border-line overflow-hidden h-full flex flex-col">
              <div className="relative aspect-[4/5] bg-ivory-2 overflow-hidden">
                <Image src={e.image} alt={e.alt} placeholder="blur" fill sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw" className="object-cover object-top" />
              </div>
              <figcaption className="p-5 flex-1">
                <span className="font-display text-3xl text-gold leading-none">{e.year}</span>
                <h3 className="mt-2 text-xl font-sans font-semibold">{e.title}</h3>
                <p className="mt-2 text-[15px] muted leading-relaxed">{e.description}</p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ol>
    </section>
  )
}
