import Link from 'next/link'
import DoUzupelnienia from './DoUzupelnienia'
import Icon from './Icon'
import Photo from './Photo'
import SectionIntro from './SectionIntro'

/**
 * Rodzaje obrączek jako zdjęcia (zamiast konfiguratora). Zdjęcie bierzemy z galerii CMS: element, którego nazwa
 * zaczyna się od `galleryName` (wielkość liter i polskie znaki bez znaczenia), np. „Obrączki płaskie 5 mm”.
 * Bez takiego zdjęcia karta pokazuje widoczny placeholder.
 * Wzory Stelmach dopisać tu dopiero po potwierdzeniu zgody przez Michała.
 */
export const BAND_TYPES = [
  {
    id: 'plaskie',
    label: 'Płaskie',
    galleryName: 'Obrączki płaskie',
    text: 'Płaski wierzch i wyraźna krawędź. Nowocześnie wyglądają zwłaszcza w szerszej wersji.',
  },
  {
    id: 'polokragle',
    label: 'Półokrągłe',
    galleryName: 'Obrączki półokrągłe',
    text: 'Zaokrąglone na zewnątrz, płaskie od strony palca.',
  },
  {
    id: 'klasyczne',
    label: 'Klasyczne',
    galleryName: 'Obrączki klasyczne',
    text: null,
  },
] as const

/** Zastępczy tekst opisu, gdy pracownia jeszcze go nie podała (na produkcji akapitu wtedy nie ma). */
const BAND_TEXT_PLACEHOLDER = '[Krótki opis od pracowni: czym klasyczne różnią się od półokrągłych]'

export const BAND_PHOTO_PLACEHOLDER = '[zdjęcie do uzupełnienia]'

const normalize = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase().replace(/\s+/g, ' ').trim()

/** Pierwsze zdjęcie z galerii pasujące do rodzaju obrączek (galeria jest już posortowana według kolejności). */
export function bandTypePhoto(gallery: { name: string; image: string }[], galleryName: string): string | null {
  const prefix = normalize(galleryName)
  return gallery.find((item) => item.image && normalize(item.name).startsWith(prefix))?.image ?? null
}

export default function BandTypes({ gallery }: { gallery: { name: string; image: string }[] }) {
  return (
    <div className="stack" style={{ gap: 40 }}>
      <SectionIntro
        id="rodzaje-obraczek"
        intro="Każdą parę wykonujemy od podstaw ręcznie, w każdej szerokości. Na przymiarce pokażemy próbki i razem dobierzemy wykończenie."
        title="Rodzaje obrączek"
      />
      <ul className="cols-auto cols-260" data-reveal="" style={{ listStyle: 'none' }}>
        {BAND_TYPES.map((t) => {
          const photo = bandTypePhoto(gallery, t.galleryName)
          const name = `obrączki ${t.label.toLowerCase()}`
          return (
            <li className="item-rule band-type" key={t.id}>
              {photo ? (
                <Photo alt={`Obrączki ${t.label.toLowerCase()} z pracowni`} ratio="32" sizes="(max-width: 720px) 100vw, 33vw" src={photo} />
              ) : (
                <DoUzupelnienia as="div">
                  <div aria-label={`Miejsce na zdjęcie: ${name}`} className="ph-empty" role="img" style={{ aspectRatio: '3 / 2' }}>
                    <Icon name="obraczki" />
                    {BAND_PHOTO_PLACEHOLDER}
                  </div>
                </DoUzupelnienia>
              )}
              <h3 className="h3-serif">{t.label}</h3>
              {t.text ? (
                <p>{t.text}</p>
              ) : (
                <DoUzupelnienia as="div">
                  <p>{BAND_TEXT_PLACEHOLDER}</p>
                </DoUzupelnienia>
              )}
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
