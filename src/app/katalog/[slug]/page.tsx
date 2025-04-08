import React from 'react'
import { getProductBySlug } from '@/lib/wordpress'
import type { Product } from '@/lib/wordpress'
import { notFound } from 'next/navigation' // Import notFound for 404 handling
import Image from 'next/image'
import AccordionItem from '@/components/AccordionItem' // Import AccordionItem

// Define props for the page, including the dynamic slug parameter
interface ProductPageProps {
  params: {
    slug: string;
  };
}

// Generate dynamic metadata (title)
export async function generateMetadata({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.slug);
  if (!product) {
    return { title: 'Produkt nie znaleziony' };
  }
  return {
    title: product.title.rendered, // Use product title for page title
    // You can add more metadata here, like description
    // description: product.excerpt.rendered (make sure to sanitize or use a text version)
  };
}

// The page component itself, now async
const SingleProductPage = async ({ params }: ProductPageProps) => {
  const product: Product | null = await getProductBySlug(params.slug);

  // If product is not found, trigger a 404 page
  if (!product) {
    notFound();
  }

  // Safely access embedded image URL and ACF fields
  const imageUrl = product._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.large?.source_url
                || product._embedded?.['wp:featuredmedia']?.[0]?.source_url
                || '/placeholder-image.png'; // Fallback image
  const imageAlt = product._embedded?.['wp:featuredmedia']?.[0]?.alt_text || product.title.rendered;

  // Extract ACF fields for easier access
  const acf = product.acf || {};

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Image Column */}
        <div className="w-full sticky top-24"> {/* Make image column sticky */} 
          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-lg">
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority // Load image faster on product page
            />
            {/* TODO: Gallery Thumbnails */}
          </div>
        </div>

        {/* Details Column */}
        <div className="lg:pt-4">
          <h1
            className="text-3xl md:text-4xl font-serif font-light mb-6"
            dangerouslySetInnerHTML={{ __html: product.title.rendered }}
          />

          {/* Specification Section */}
          <div className="mb-8 border-t border-b border-gray-200 divide-y divide-gray-200">
            {acf.kolor_metalu && (
              <div className="py-3 flex justify-between text-sm">
                <span>Kolor Metalu:</span>
                <span className="font-medium">{acf.kolor_metalu}</span>
              </div>
            )}
             {acf.czy_posiada_kamien && acf.rodzaj_kamienia && (
              <div className="py-3 flex justify-between text-sm">
                <span>Rodzaj Kamienia:</span>
                <span className="font-medium">{acf.rodzaj_kamienia}</span>
              </div>
            )}
             {acf.czystosc_kamienia && (
              <div className="py-3 flex justify-between text-sm">
                <span>Czystość Kamienia:</span>
                <span className="font-medium">{acf.czystosc_kamienia}</span>
              </div>
            )}
            {acf.masa_karatowa && (
              <div className="py-3 flex justify-between text-sm">
                <span>Masa Karatowa (ct):</span>
                <span className="font-medium">{acf.masa_karatowa}</span>
              </div>
            )}
            {/* Add placeholder for price if needed */}
            {/* <div className="py-3 flex justify-between text-sm">
              <span>Cena Orientacyjna:</span>
              <span className="font-medium">Zapytaj o cenę</span>
            </div> */}
          </div>

           {/* Accordion Section */}
           <div className="space-y-1">
             <AccordionItem title="Opis Produktu" initialOpen={true}>
              <div
                className="prose prose-sm max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.content.rendered || '' }}
              />
             </AccordionItem>
              {acf.dodatkowe_informacje && (
                <AccordionItem title="Dodatkowe Informacje">
                  <div
                    className="prose prose-sm max-w-none leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: acf.dodatkowe_informacje }}
                  />
                </AccordionItem>
              )}
              {acf.pielegnacja && (
                 <AccordionItem title="Pielęgnacja">
                   <div
                     className="prose prose-sm max-w-none leading-relaxed"
                     dangerouslySetInnerHTML={{ __html: acf.pielegnacja }}
                   />
                 </AccordionItem>
              )}
           </div>

          {/* Contact Button */}
          <div className="mt-10">
            <a
              href="/kontakt" // Link to contact page
              className="inline-block bg-gray-800 text-white hover:bg-gray-700 transition-colors duration-300 py-3 px-8 rounded-full text-lg font-medium"
            >
              Zapytaj o ten pierścionek
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SingleProductPage

// Optional: Generate static paths if you want to pre-render some product pages at build time
// export async function generateStaticParams() {
//   const products = await getProducts();
//   return products.map((product) => ({
//     slug: product.slug,
//   }));
// } 