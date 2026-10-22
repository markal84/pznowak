import Image from 'next/image'
import Link from 'next/link'
import Photo from './Photo'

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
    text: '[Krótki opis od pracowni: czym klasyczne różnią się od półokrągłych]',
  },
] as const

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
      <div className="row" style={{ gap: '16px 64px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h2 className="h2" id="rodzaje-obraczek" style={{ flex: '1 1 380px' }}>
          Rodzaje obrączek
        </h2>
        <p className="text" style={{ flex: '1 1 380px', maxWidth: '32em' }}>
          Każdą parę wykonujemy od podstaw ręcznie, w każdej szerokości. Na przymiarce pokażemy próbki i razem dobierzemy
          wykończenie.
        </p>
      </div>
      <ul className="cols-auto cols-260" style={{ listStyle: 'none' }}>
        {BAND_TYPES.map((t) => {
          const photo = bandTypePhoto(gallery, t.galleryName)
          const name = `obrączki ${t.label.toLowerCase()}`
          return (
            <li className="item-rule band-type" key={t.id}>
              {photo ? (
                <Photo alt={`Obrączki ${t.label.toLowerCase()} z pracowni`} ratio="32" sizes="(max-width: 720px) 100vw, 33vw" src={photo} />
              ) : (
                <div aria-label={`Miejsce na zdjęcie: ${name}`} className="ph-empty" role="img" style={{ aspectRatio: '3 / 2' }}>
                  <Image alt="" height={40} src="/grafiki/ikony/obraczki.svg" width={40} />
                  {BAND_PHOTO_PLACEHOLDER}
                </div>
              )}
              <h3 className="h3-serif">{t.label}</h3>
              <p>{t.text}</p>
              <Link className="tl" href={`/kontakt?temat=obraczki&wybor=${encodeURIComponent(t.label.toLowerCase())}`} style={{ marginTop: 'auto' }}>
                Zapytaj o {name}
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="row" style={{ gap: '12px 24px', alignItems: 'center' }}>
        <Link className="btn" href="/kontakt?temat=obraczki">
          Umów przymiarkę obrączek
        </Link>
        <span className="small" style={{ fontSize: 14, lineHeight: 1.5 }}>
          Cena zależy od szerokości, wagi i próby złota.
        </span>
      </div>
    </div>
  )
}
