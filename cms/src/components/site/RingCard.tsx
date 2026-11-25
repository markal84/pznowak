import Link from 'next/link'
import { ringAnchorId } from '@/lib/catalog-return'
import { PRICE_ON_REQUEST_SHORT, priceParts } from '@/lib/price'
import Photo from './Photo'
import Tag from './Tag'

type RingCardProps = {
  slug: string
  name: string
  stone: string
  image: string
  alt: string
  sizes: string
  /** własny adres karty (np. pierścionek z wybranym wariantem kamienia `?kamien=…`); domyślnie strona pierścionka */
  href?: string
  /** wariant katalogowy: opis pod zdjęciem zamiast podpisu na przywieszce */
  gold?: string
  /** cena z panelu (tylko wariant katalogowy); bez ceny „Na zapytanie”, jak na karcie pierścionka */
  price?: number | null
  detailed?: boolean
  /** pierwszy rząd katalogu: zdjęcie bez leniwego ładowania (LCP na telefonie) */
  eager?: boolean
  /** plakietka „Nowość” w rogu zdjęcia (karta opublikowana w ostatnich 7 dniach) */
  isNew?: boolean
}

/** Plakietka „Nowość”: aksamitna etykieta ze złotą gwiazdką w lewym górnym rogu zdjęcia. */
function NewBadge() {
  return (
    <span className="new-badge">
      <svg aria-hidden="true" className="new-badge-star" viewBox="0 0 12 12">
        <path d="M6 0 7.1 4.9 12 6 7.1 7.1 6 12 4.9 7.1 0 6 4.9 4.9Z" />
      </svg>
      Nowość
    </span>
  )
}

export default function RingCard({ slug, name, stone, image, alt, sizes, href: customHref, gold, price, detailed = false, eager = false, isNew = false }: RingCardProps) {
  const href = customHref ?? `/pierscionki/${slug}`
  if (detailed) {
    const parts = priceParts(price)
    // „od” i „Na zapytanie” zwykłym krojem, sama kwota większa (wyróżnia się na przywieszce)
    const priceText = parts ? (
      <>
        {parts.prefix ? <>{parts.prefix}{'\u00a0'}</> : null}
        <span className="amt">{parts.amount}</span>
      </>
    ) : (
      PRICE_ON_REQUEST_SHORT
    )
    return (
      <li id={ringAnchorId(slug)}>
        <Link className="card card-body" data-ring-slug={slug} href={href}>
          <span className="card-overlay">
            <Photo alt={alt} eager={eager} ratio="45" sizes={sizes} src={image} />
            {isNew ? <NewBadge /> : null}
            <Tag className="tag-corner" name={name} price={priceText} />
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
        {isNew ? <NewBadge /> : null}
        <Tag className="tag-corner" name={name} sub={stone || undefined} />
      </Link>
    </li>
  )
}
