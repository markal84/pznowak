import Link from 'next/link'
import DoUzupelnienia from './DoUzupelnienia'
import Photo from './Photo'
import Tag from './Tag'

type RingCardProps = {
  slug: string
  name: string
  stone: string
  image: string
  alt: string
  sizes: string
  /** wariant katalogowy: opis pod zdjęciem zamiast podpisu na przywieszce */
  gold?: string
  detailed?: boolean
}

export default function RingCard({ slug, name, stone, image, alt, sizes, gold, detailed = false }: RingCardProps) {
  const href = `/pierscionki/${slug}`
  if (detailed) {
    return (
      <li>
        <Link className="card card-body" href={href}>
          <span className="card-overlay">
            <Photo alt={alt} ratio="45" sizes={sizes} src={image} />
            <Tag className="tag-corner" name={name} />
          </span>
          <span className="card-meta">
            <span>{stone || 'Projekt pracowni'}</span>
            {gold ? <span className="muted">Złoto: {gold.toLowerCase()}</span> : null}
            <DoUzupelnienia>
              <span style={{ fontSize: 14, fontWeight: 500 }}>od [cena] zł</span>
            </DoUzupelnienia>
          </span>
        </Link>
      </li>
    )
  }
  return (
    <li>
      <Link className="card card-overlay" href={href}>
        <Photo alt={alt} ratio="45" sizes={sizes} src={image} />
        <Tag className="tag-corner" name={name} sub={stone || undefined} />
      </Link>
    </li>
  )
}
