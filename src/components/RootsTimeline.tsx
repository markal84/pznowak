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
    <section id="korzenie" className="section roots-section" aria-labelledby="roots-heading">
      <div className="wrap">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Rodzinna historia rzemiosła</span>
            <h2 id="roots-heading">Nasze <em>korzenie.</em></h2>
          </div>
          <p className="roots-intro">Od warsztatu Wiktora po dzisiejszą pracownię Michała. Poznaj ludzi, którzy tworzyli tę historię.</p>
        </div>
        <ol className="roots-timeline">
          {history.map((event) => (
            <li key={event.id} className="roots-entry">
              <div className="roots-date">{event.year}</div>
              <div className="roots-portrait">
                <Image src={event.image} alt={event.alt} sizes="(max-width: 600px) 160px, (max-width: 900px) 40vw, 22vw" />
              </div>
              <div className="roots-copy">
                <h3>{event.title}</h3>
                <p>{event.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default RootsTimeline;
