import Link from 'next/link'
import { ringAnchorId } from '@/lib/catalog-return'
import { formatPrice } from '@/lib/price'
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
  /** cena z panelu (tylko wariant katalogowy); bez ceny wiersza nie ma */
  price?: number | null
  detailed?: boolean
}

export default function RingCard({ slug, name, stone, image, alt, sizes, gold, price, detailed = false }: RingCardProps) {
  const href = `/pierscionki/${slug}`
  if (detailed) {
    const priceText = formatPrice(price)
    return (
      <li id={ringAnchorId(slug)}>
        <Link className="card card-body" data-ring-slug={slug} href={href}>
          <span className="card-overlay">
            <Photo alt={alt} ratio="45" sizes={sizes} src={image} />
            <Tag className="tag-corner" name={name} price={priceText || undefined} />
          </span>
          <span className="card-meta">
            <span>{stone || 'Projekt pracowni'}</span>
            {gold ? <span className="muted">Złoto: {gold.toLowerCase()}</span> : null}
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
