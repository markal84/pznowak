import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getProducts } from '@/lib/wordpress'
import type { Product } from '@/lib/wordpress'
import { catalogCellStyle } from '@/styles/catalogStyles'

const CatalogPage = async () => {
  const products: Product[] = await getProducts();

  return (
    <>
      {/* Top Section (Black Background) */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-playfair text-brand-gold tracking-wider mb-8">
              WARSZTAT ZŁOTNICZY
          </h1>
          {/* Placeholder for single ring image */}
          <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-12">
             <Image src="/placeholder-single-ring.png" alt="Pierścionek" fill style={{ objectFit: 'contain' }} />
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-playfair text-brand-gold tracking-wider">
              KATALOG
          </h2>
        </div>
      </section>

      {/* Products Grid Section */}
      <section className="w-full py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Grid container */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-0">
            {products.length === 0 ? (
              <p className="text-center col-span-full py-16">Nie znaleziono produktów.</p>
            ) : (
              products.map((product, index) => {
                const imageUrl = product._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.large?.source_url
                              || product._embedded?.['wp:featuredmedia']?.[0]?.source_url
                              || '/placeholder-image.png';
                const imageAlt = product._embedded?.['wp:featuredmedia']?.[0]?.alt_text || product.title.rendered;
                const price = product.acf?.cena;

                // Determine background color based on index
                // const bgColorClass = index % 2 === 0 ? 'bg-brand-beige' : 'bg-brand-light-gray'; // Temporarily disable dynamic background

                return (
                  // Grid Cell with uniform background and borders for separation
                  <div 
                    key={product.id} 
                    style={catalogCellStyle}
                    className={`flex items-center justify-center p-10 md:p-16 aspect-[4/5] border-b border-white ${index % 2 === 0 ? 'sm:border-r sm:border-white' : ''}`}
                  >
                     <div className="flex flex-col text-center items-center w-full max-w-xs">
                        <div className="relative w-full aspect-square mb-6">
                          <Image
                            src={imageUrl}
                            alt={imageAlt}
                            fill
                            style={{ objectFit: 'contain' }}
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                          />
                        </div>
                        <h2
                          className="text-xl md:text-2xl font-cormorant font-light mb-2 leading-tight"
                          dangerouslySetInnerHTML={{ __html: product.title.rendered }}
                        />
                        {price && (
                           <p className="text-base font-cormorant font-light mb-4">{price}</p>
                        )}
                        <Link
                          href={`/katalog/${product.slug}`}
                          className="mt-auto border border-gray-400 text-gray-700 hover:bg-black hover:text-white hover:border-black transition-colors duration-300 py-2 px-8 text-xs tracking-wider"
                        >
                          Zobacz szczegóły
                        </Link>
                     </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </>
  )
}

export default CatalogPage 