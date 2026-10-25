import type { ReactNode } from 'react'

type PriceOfferProps = {
  /** Czego dotyczy cena, np. „Obrączki ślubne”. */
  label: string
  /** Cena albo placeholder, np. „od [X] zł za parę”. */
  price: string
  /** Przycisk i ewentualny link; bez nich zostaje sama cena z notką. */
  children?: ReactNode
  /** Krótka notka o tym, od czego zależy cena. */
  note?: ReactNode
  /** `sm`: mała przywieszka, jak na kartach pierścionków. */
  size?: 'sm'
}

/**
 * Cena i wezwanie do działania jako jeden blok (design-fundament, pkt 3).
 * Cena stoi na papierowej przywieszce, tej samej co przy pierścionkach, obok przycisk i notka.
 */
export default function PriceOffer({ label, price, children, note, size }: PriceOfferProps) {
  return (
    <div className={size === 'sm' ? 'offer offer-sm' : 'offer'}>
      <p className={size === 'sm' ? 'tag offer-tag' : 'tag tag-md offer-tag'}>
        <span aria-hidden="true" className="hole" />
        <span className="sub">{label}</span>
        <span className="nm">{price}</span>
      </p>
      <div className="offer-act">
        {children ? <div className="row gap-14-28">{children}</div> : null}
        {note ? <p className="small">{note}</p> : null}
      </div>
    </div>
  )
}
