import React from 'react'
import { getProductBySlug } from '@/lib/wordpress'
import type { Product } from '@/lib/wordpress'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import AccordionItem from '@/components/AccordionItem'

// Zaktualizowany interfejs – dopuszcza, że params może być zwykłym obiektem lub Promise
interface ProductPageProps {
  params: { slug: string } | Promise<{ slug: string }>;
}

// Generowanie dynamicznych metadanych (tytułu)
export async function generateMetadata({ params }: ProductPageProps) {
  // Oczekujemy rozwiązania params zanim użyjemy właściwości
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return { title: 'Produkt nie znaleziony' };
  }
  return {
    title: product.title.rendered, // Używamy tytułu produktu jako tytułu strony
  };
}

// Strona produktu jako asynchroniczny komponent
const SingleProductPage = async ({ params }: ProductPageProps) => {
  // Oczekujemy rozwiązania params zanim uzyskamy dostęp do slug
  const { slug } = await params;
  const product: Product | null = await getProductBySlug(slug);

  // Jeśli produkt nie został znaleziony, wywołujemy stronę 404
  if (!product) {
    notFound();
  }

  // Pobieramy adres URL obrazu (zabezpieczając się przed brakiem danych)
  const imageUrl =
    product._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.large?.source_url ||
    product._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
    '/placeholder-image.png';
  const imageAlt =
    product._embedded?.['wp:featuredmedia']?.[0]?.alt_text || product.title.rendered;

  // Ułatwiamy dostęp do dodatkowych pól (ACF)
  const acf = product.acf || {};

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Kolumna z obrazem */}
        <div className="w-full sticky top-24">
          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-lg">
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>
        </div>

        {/* Kolumna z szczegółami */}
        <div className="lg:pt-4">
          <h1
            className="text-3xl md:text-4xl font-serif font-light mb-6"
            dangerouslySetInnerHTML={{ __html: product.title.rendered }}
          />

          {/* Sekcja specyfikacji */}
          <div className="mb-8 border-t border-b border-gray-200 divide-y divide-gray-200">
            {acf.kolor_metalu && (
              <div className="py-3 flex justify-between text-sm">
                <span className="text-gray-600">Kolor Metalu:</span>
                <span className="font-medium text-gray-800">{acf.kolor_metalu}</span>
              </div>
            )}
            {acf.czy_posiada_kamien && acf.rodzaj_kamienia && (
              <div className="py-3 flex justify-between text-sm">
                <span className="text-gray-600">Rodzaj Kamienia:</span>
                <span className="font-medium text-gray-800">{acf.rodzaj_kamienia}</span>
              </div>
            )}
            {acf.czystosc_kamienia && (
              <div className="py-3 flex justify-between text-sm">
                <span className="text-gray-600">Czystość Kamienia:</span>
                <span className="font-medium text-gray-800">{acf.czystosc_kamienia}</span>
              </div>
            )}
            {acf.masa_karatowa && (
              <div className="py-3 flex justify-between text-sm">
                <span className="text-gray-600">Masa Karatowa (ct):</span>
                <span className="font-medium text-gray-800">{acf.masa_karatowa}</span>
              </div>
            )}
          </div>

          {/* Sekcja Accordion */}
          <div className="space-y-1">
            <AccordionItem title="Opis Produktu" initialOpen={true}>
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.content.rendered || '' }}
              />
            </AccordionItem>
            {acf.dodatkowe_informacje && (
              <AccordionItem title="Dodatkowe Informacje">
                <div
                  className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: acf.dodatkowe_informacje }}
                />
              </AccordionItem>
            )}
            {acf.pielegnacja && (
              <AccordionItem title="Pielęgnacja">
                <div
                  className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: acf.pielegnacja }}
                />
              </AccordionItem>
            )}
          </div>

          {/* Przycisk kontaktowy */}
          <div className="mt-10">
            <a
              href="/kontakt"
              className="inline-block bg-gray-800 text-white hover:bg-gray-700 transition-colors duration-300 py-3 px-8 rounded-full text-lg font-medium"
            >
              Zapytaj o ten pierścionek
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleProductPage;
