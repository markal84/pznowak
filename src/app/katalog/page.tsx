import React from 'react'
import Link from 'next/link'

const CatalogPage = () => {
  // Placeholder data - later fetched from WordPress
  const products = [
    {
      id: 'produkt-1',
      name: 'Pierścionek "Klasyczna Elegancja"',
      description: 'Złoty pierścionek z centralnie osadzonym brylantem 0.5ct.',
      imagePlaceholder: 'Placeholder Obrazka 1'
    },
    {
      id: 'produkt-2',
      name: 'Pierścionek "Subtelny Blask"',
      description: 'Delikatny złoty pierścionek z szafirem otoczonym diamentami.',
      imagePlaceholder: 'Placeholder Obrazka 2'
    },
    // Add more products as needed or fetch dynamically
  ]

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-serif font-light mb-10 text-center">Katalog Biżuterii</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
        {products.map((product) => (
          <div key={product.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300 flex flex-col">
            {/* Placeholder for Image */}
            <div className="w-full h-56 bg-gray-200 rounded mb-5 flex items-center justify-center text-gray-500">
              {product.imagePlaceholder}
            </div>
            <h2 className="text-xl font-serif font-light mb-3 grow">{product.name}</h2>
            <p className="text-gray-600 text-sm mb-5 grow">{product.description}</p>
            <Link
              href={`/katalog/${product.id}`}
              className="mt-auto text-center bg-gray-800 text-white hover:bg-gray-700 transition-colors duration-300 py-2 px-5 rounded-full text-sm font-medium self-center"
            >
              Zobacz szczegóły
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CatalogPage 