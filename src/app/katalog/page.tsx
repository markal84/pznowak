import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getProducts } from '@/lib/wordpress'
import type { Product } from '@/lib/wordpress'

const CatalogPage = async () => {
  const products: Product[] = await getProducts();

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-serif font-light mb-10 text-center">Katalog Biżuterii</h1>

      {products.length === 0 ? (
        <p className="text-center text-gray-600">Nie znaleziono produktów.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {products.map((product) => {
            const imageUrl = product._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.large?.source_url
                          || product._embedded?.['wp:featuredmedia']?.[0]?.source_url
                          || '/placeholder-image.png';
            const imageAlt = product._embedded?.['wp:featuredmedia']?.[0]?.alt_text || product.title.rendered;

            return (
              <div key={product.id} className="bg-white p-6 rounded-lg shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-300 flex flex-col overflow-hidden">
                <div className="relative w-full h-64 mb-5 bg-gray-100 rounded overflow-hidden">
                  <Image
                    src={imageUrl}
                    alt={imageAlt}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <h2
                  className="text-xl font-serif font-light mb-3 grow"
                  dangerouslySetInnerHTML={{ __html: product.title.rendered }}
                />
                {product.excerpt?.rendered && (
                  <div
                    className="text-gray-600 text-sm mb-5 grow"
                    dangerouslySetInnerHTML={{ __html: product.excerpt.rendered }}
                  />
                )}
                <Link
                  href={`/katalog/${product.slug}`}
                  className="mt-auto text-center bg-gray-800 text-white hover:bg-gray-700 transition-colors duration-300 py-2 px-5 rounded-full text-sm font-medium self-center"
                >
                  Zobacz szczegóły
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}

export default CatalogPage 