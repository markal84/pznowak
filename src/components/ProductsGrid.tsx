import type { Product } from '@/lib/wordpress'
import ProductCard from './ProductCard'

interface Props { products: Product[] }

export default function ProductsGrid({ products }: Props) {
  if (products.length === 0) {
    return (
      <p className="text-center py-16 muted">
        Katalog jest chwilowo niedostępny. Zadzwoń lub napisz, chętnie pokażemy realizacje.
      </p>
    )
  }
  return (
    <ul className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 3} />
      ))}
    </ul>
  )
}
