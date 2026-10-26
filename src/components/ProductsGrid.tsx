import type { Product } from '@/lib/wordpress'
import ProductCard from './ProductCard'

interface Props { products: Product[] }

export default function ProductsGrid({ products }: Props) {
  if (products.length === 0) {
    return (
      <p className="py-24 text-center font-display text-2xl italic text-[var(--ink-faint)]">
        Katalog jest chwilowo pusty — zapraszamy wkrótce.
      </p>
    )
  }

  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < 3} />
        </li>
      ))}
    </ul>
  )
}
