'use client'

import type { Product } from '@/lib/wordpress'
import ProductCard from './ProductCard'

interface Props { products: Product[] }

export default function ProductsGrid({ products }: Props) {
  if (products.length === 0) {
    return <p className="text-center py-16">Nie znaleziono produktów.</p>
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ul>
  )
}