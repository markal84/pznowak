import Link from 'next/link'
import Photo from './Photo'
import SectionIntro from './SectionIntro'

/**
 * Rodzaje obrączek na prawdziwych zdjęciach z pracowni (`public/zdjecia/obraczki/`).
 * „Klasyczne” to u Michała nazwa zbiorcza obu fasonów, więc rodzajów jest dwa.
 * Wzory Stelmach dopisać tu dopiero po potwierdzeniu zgody przez Michała.
 */
export const BAND_TYPES = [
  {
    id: 'plaskie',
    label: 'Płaskie',
    photo: '/zdjecia/obraczki/plaskie-na-dloni.webp',
    alt: 'Cztery płaskie obrączki w różnych szerokościach na dłoni',
    position: '50% 40%',
    text: 'Płaski wierzch i wyraźna krawędź. Nowocześnie wyglądają zwłaszcza w szerszej wersji.',
  },
  {
    id: 'polokragle',
    label: 'Półokrągłe',
    photo: '/zdjecia/obraczki/polokragle-w-pudelku.webp',
    alt: 'Para półokrągłych obrączek w pudełku',
    position: '50% 50%',
    text: 'Zaokrąglone na zewnątrz, płaskie od strony palca.',
  },
] as const

export default function BandTypes() {
  return (
    <div className="stack" style={{ gap: 40 }}>
      <SectionIntro
        id="rodzaje-obraczek"
        intro="Klasyczne obrączki robimy w dwóch fasonach – płaskim i półokrągłym – od podstaw ręcznie, w każdej szerokości. Na przymiarce pokażemy próbki i razem dobierzemy wykończenie."
        title="Rodzaje obrączek"
      />
      <ul className="cols-auto cols-band-types" data-reveal="" style={{ listStyle: 'none' }}>
        {BAND_TYPES.map((t) => {
          const name = `obrączki ${t.label.toLowerCase()}`
          return (
            <li className="item-rule band-type" key={t.id}>
              <Photo alt={t.alt} position={t.position} ratio="43" sizes="(max-width: 720px) 100vw, 560px" src={t.photo} />
              <h3 className="h3-serif">{t.label}</h3>
              <p>{t.text}</p>
              <Link className="tl" href={`/kontakt?temat=obraczki&wybor=${encodeURIComponent(t.label.toLowerCase())}`} style={{ marginTop: 'auto' }}>
                Zapytaj o {name}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
