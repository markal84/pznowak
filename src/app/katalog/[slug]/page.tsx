import React from 'react'
import { getProductBySlug } from '@/lib/wordpress'
import type { Product } from '@/lib/wordpress'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import AccordionItem from '@/components/AccordionItem'

// Uwaga: Next.js w funkcjach takich jak generateMetadata oczekuje, że
// params będzie Promise, dlatego definiujemy interfejs w ten sposób.
interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// Generowanie dynamicznych metadanych (tytułu)
export async function generateMetadata({ params }: ProductPageProps) {
  // Oczekujemy rozwiązania params zanim użyjemy jego właściwości
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return { title: 'Produkt nie znaleziony' };
  }
  return {
    title: product.title.rendered,
  };
}

// Asynchroniczny komponent strony produktu
const SingleProductPage = async ({ params }: ProductPageProps) => {
  // Oczekujemy rozwiązania params zanim uzyskamy dostęp do slug
  const { slug } = await params;
  const product: Product | null = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Pobieramy adres URL obrazu – z fallbackiem, gdy brak danych
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
        {/* Image Column */}
        <div className="w-full top-24">
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

        {/* Kolumna ze szczegółami produktu */}
        <div className="lg:pt-4">
          <h1
            className="text-3xl md:text-4xl font-serif font-light mb-6"
            dangerouslySetInnerHTML={{ __html: product.title.rendered }}
          />

          {/* Sekcja specyfikacji */}
          <div className="mb-8 border-t border-b border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
            {acf.kolor_metalu && (
              <div className="py-3 flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Kolor Metalu:</span>
                <span className="font-medium text-gray-800 dark:text-gray-100">{acf.kolor_metalu}</span>
              </div>
            )}
            {acf.czy_posiada_kamien && acf.rodzaj_kamienia && (
              <div className="py-3 flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Rodzaj Kamienia:</span>
                <span className="font-medium text-gray-800 dark:text-gray-100">{acf.rodzaj_kamienia}</span>
              </div>
            )}
            {acf.czystosc_kamienia && (
              <div className="py-3 flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Czystość Kamienia:</span>
                <span className="font-medium text-gray-800 dark:text-gray-100">{acf.czystosc_kamienia}</span>
              </div>
            )}
            {acf.masa_karatowa && (
              <div className="py-3 flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Masa Karatowa (ct):</span>
                <span className="font-medium text-gray-800 dark:text-gray-100">{acf.masa_karatowa}</span>
              </div>
            )}
          </div>

          {/* Sekcja Accordion */}
          <div className="space-y-1">
            <AccordionItem title="Opis Produktu" initialOpen={true}>
              <div
                className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.content.rendered || '' }}
              />
            </AccordionItem>
            {acf.dodatkowe_informacje && (
              <AccordionItem title="Dodatkowe Informacje">
                <div
                  className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: acf.dodatkowe_informacje }}
                />
              </AccordionItem>
            )}
            {acf.pielegnacja && (
              <AccordionItem title="Pielęgnacja">
                <div
                  className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: acf.pielegnacja }}
                />
              </AccordionItem>
            )}
          </div>

          {/* Przycisk przekierowujący do strony kontaktowej */}
          <div className="mt-10">
            <a
              href="/kontakt"
              className="inline-block bg-gray-800 text-white hover:bg-gray-700 transition-colors duration-300 py-3 px-8 rounded-sm text-lg font-medium"
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
