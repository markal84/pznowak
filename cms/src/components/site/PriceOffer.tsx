import type { ReactNode } from 'react'

type PriceOfferProps = {
  /** Czego dotyczy cena, np. „Obrączki ślubne”. */
  label: string
  /** Cena albo placeholder, np. „od [X] zł za parę”. */
  price: string
  /** Przycisk i ewentualny link. */
  children: ReactNode
  /** Krótka notka o tym, od czego zależy cena. */
  note?: ReactNode
}

/**
 * Cena i wezwanie do działania jako jeden blok (design-fundament, pkt 3).
 * Cena stoi na papierowej przywieszce, tej samej co przy pierścionkach, obok przycisk i notka.
 */
export default function PriceOffer({ label, price, children, note }: PriceOfferProps) {
  return (
    <div className="offer">
      <p className="tag tag-md offer-tag">
        <span aria-hidden="true" className="hole" />
        <span className="sub">{label}</span>
        <span className="nm">{price}</span>
      </p>
      <div className="offer-act">
        <div className="row gap-14-28">{children}</div>
        {note ? <p className="small">{note}</p> : null}
      </div>
    </div>
  )
}
