import type { ReactNode } from 'react'

type TagProps = {
  name: string
  sub?: string
  /** cena na przywieszce, np. „od 2949 zł” (lista pierścionków) */
  price?: ReactNode
  size?: 'sm' | 'md'
  className?: string
}

/** Papierowa przywieszka z otworem: znak rozpoznawczy designu. Budowana w CSS, żeby tekst był edytowalny. */
export default function Tag({ name, sub, price, size = 'sm', className }: TagProps) {
  const classes = ['tag', size === 'md' ? 'tag-md' : '', className].filter(Boolean).join(' ')
  return (
    <span className={classes}>
      <span aria-hidden="true" className="hole" />
      <span className="nm">{name}</span>
      {sub ? <span className="sub">{sub}</span> : null}
      {price ? <span className="price">{price}</span> : null}
    </span>
  )
}
