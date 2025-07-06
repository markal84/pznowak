import React from 'react'
import { notFound } from 'next/navigation'
import type { Product } from '@/lib/wordpress'
import { getProductBySlug, getGlobalOptions } from '@/lib/wordpress'
import AccordionItem from '@/components/AccordionItem'
import ProductGalleryClient from '@/components/ProductGalleryClient'
import Link from 'next/link'

// Typy slajdów (bez zmian, ale tu dla kompletności)
interface ImageSlide {
  src: string
  alt?: string
  type?: undefined
}

interface VideoSlideSource {
  src: string
  type: string
}

interface VideoSlide {
  type: 'video'
  sources: VideoSlideSource[]
  poster?: string
  alt?: string
  width?: number
  height?: number
}

type Slide = ImageSlide | VideoSlide;


interface AcfFields {
  product_gallery_1?: number | string // Może być ID lub pusty string
  product_gallery_2?: number | string
  product_gallery_3?: number | string
  video?: number | string // <-- Zmienione: ID pliku wideo lub pusty string
  czy_posiada_kamien?: boolean
  rodzaj_kamienia?: string
  kolor_metalu?: string
  czystosc_kamienia?: string
  masa_karatowa?: string
  dodatkowe_informacje?: string
  pielegnacja?: string
  cena?: string
}

interface WpMedia {
  media_details?: {
    sizes?: {
      thumbnail?: { source_url: string }
      medium?: { source_url: string }
      large?: { source_url: string }
      medium_large?: { source_url: string } // <-- Dodane medium_large
      full?: { source_url: string }
    }
    width?: number; // Dla wideo i obrazów
    height?: number; // Dla wideo i obrazów
  }
  source_url: string
  alt_text?: string
  mime_type?: string // Ważne dla wideo
  title?: { rendered: string }; // Czasem przydatne dla alt
}

interface ProductPageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  return {
    title: product ? product.title.rendered : 'Produkt nie znaleziony',
  }
}

const SingleProductPage = async ({ params }: ProductPageProps) => {
  const { slug } = await params
  const product: Product | null = await getProductBySlug(slug)
  const globalOptions = await getGlobalOptions()
  if (!product) return notFound()

  const acf = product.acf as AcfFields

  // 1) Featured image
  const featuredMediaItem = product._embedded?.['wp:featuredmedia']?.[0]
  const featured =
    featuredMediaItem?.media_details?.sizes?.large?.source_url ||
    featuredMediaItem?.media_details?.sizes?.medium_large?.source_url ||
    featuredMediaItem?.source_url ||
    '/placeholder-image.png'
  
  const imageAlt = featuredMediaItem?.alt_text || product.title.rendered

  // Bazowy URL z .env.local
  if (!process.env.NEXT_PUBLIC_WP_API_URL) {
    throw new Error('Dodaj NEXT_PUBLIC_WP_API_URL do .env.local')
  }
  const API_BASE = process.env.NEXT_PUBLIC_WP_API_URL

  // 2) Pobieranie obrazków z galerii ACF
  const galleryImageIds = [
    acf.product_gallery_1,
    acf.product_gallery_2,
    acf.product_gallery_3,
  ]
  .map(id => (typeof id === 'string' && id.trim() === '' ? undefined : Number(id))) // Konwertuj na Number, puste stringi na undefined
  .filter((id): id is number => typeof id === 'number' && !isNaN(id) && id > 0);


  const galleryImageMedia: ImageSlide[] = await Promise.all(
    galleryImageIds.map(async (id) => {
      try {
        const res = await fetch(`${API_BASE}/media/${id}?context=embed`)
        if (!res.ok) {
          console.warn(`Błąd pobierania mediów galerii ${id}:`, res.status, await res.text())
          return { src: '/placeholder-image.png', alt: 'Błąd ładowania obrazu' }
        }
        const media = (await res.json()) as WpMedia
        const url =
          media.media_details?.sizes?.large?.source_url ||
          media.media_details?.sizes?.medium_large?.source_url ||
          media.source_url ||
          '/placeholder-image.png'
        return { src: url, alt: media.alt_text || `Obraz z galerii ${id}` }
      } catch (error) {
        console.error(`Błąd przy pobieraniu mediów galerii ${id}:`, error)
        return { src: '/placeholder-image.png', alt: 'Błąd ładowania obrazu' }
      }
    })
  )

  // 3) Pobieranie danych wideo z ACF (jeśli ID jest dostępne)
  let videoSlideData: VideoSlide | null = null;
  if (acf.video && (typeof acf.video === 'number' || (typeof acf.video === 'string' && acf.video.trim() !== ''))) {
    const videoId = Number(acf.video);
    if (!isNaN(videoId) && videoId > 0) {
      try {
        const res = await fetch(`${API_BASE}/media/${videoId}?context=embed`);
        if (res.ok) {
          const videoMedia = (await res.json()) as WpMedia;
          if (videoMedia.source_url && videoMedia.mime_type?.startsWith('video/')) {
            videoSlideData = {
              type: 'video',
              sources: [{ src: videoMedia.source_url, type: videoMedia.mime_type }],
              poster: featured, // Użyj obrazka wyróżniającego jako poster dla wideo
              alt: videoMedia.alt_text || videoMedia.title?.rendered || `${product.title.rendered} - Wideo`,
              width: videoMedia.media_details?.width,
              height: videoMedia.media_details?.height,
            };
          } else {
            console.warn(`Pobrane media (ID: ${videoId}) nie są poprawnym plikiem wideo lub brakuje URL/mime_type. MIME: ${videoMedia.mime_type}, URL: ${videoMedia.source_url}`);
          }
        } else {
          console.warn(`Błąd pobierania mediów wideo ${videoId}:`, res.status, await res.text());
        }
      } catch (error) {
        console.error(`Błąd przy pobieraniu mediów wideo ${videoId}:`, error);
      }
    }
  }

  // 4) Tworzymy tablicę slajdów dla ProductGalleryClient
  const slides: Slide[] = [];

  // Dodajemy obrazek wyróżniający jako pierwszy (jeśli istnieje i nie jest placeholderem)
  if (featured && featured !== '/placeholder-image.png') {
    slides.push({
      src: featured,
      alt: imageAlt,
    });
  }

  // Dodajemy wideo (jeśli zostało pobrane)
  if (videoSlideData) {
    slides.push(videoSlideData);
  }

  // Dodajemy pozostałe obrazki z galerii
  slides.push(...galleryImageMedia);
  
  // 5) Usuwamy duplikaty slajdów (np. jeśli obrazek wyróżniający jest też w galerii)
  const uniqueSlides = slides.filter((slide, index, self) => {
    if (slide.type === 'video') {
      // Dla wideo, unikalność na podstawie źródła wideo
      return index === self.findIndex(s => 
        s.type === 'video' && 
        s.sources && s.sources.length > 0 && 
        slide.sources && slide.sources.length > 0 && 
        s.sources[0].src === slide.sources[0].src
      );
    } else {
      // Dla obrazów, unikalność na podstawie src obrazu
      return index === self.findIndex(s => 
        s.type !== 'video' && s.src === slide.src
      );
    }
  });

  // Jeśli po deduplikacji nie ma slajdów, a był placeholder dla featured, dodajmy go
  if (uniqueSlides.length === 0 && featured === '/placeholder-image.png') {
    uniqueSlides.push({ src: featured, alt: imageAlt });
  }


  return (
    <div className="container mx-auto px-4 py-12">
      {/* Breadcrumbs */}
      <nav className="mb-8 text-sm" aria-label="Breadcrumb">
        <ol className="list-none p-0 inline-flex text-gray-500 dark:text-gray-400">
          <li>
            <Link href="/katalog" className="hover:text-brand-gold transition-colors font-semibold">Katalog</Link>
            <span className="mx-2">/</span>
          </li>
          <li aria-current="page" className="text-gray-900 dark:text-gray-100">{product.title.rendered}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
        {/* Galeria */}
        <div className="w-full">
          {uniqueSlides.length > 0 ? (
            <ProductGalleryClient slides={uniqueSlides} imageAlt={imageAlt} />
          ) : (
            // Możesz tu wyświetlić jakiś fallback, jeśli nie ma żadnych obrazów/wideo
            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-lg">
            </div>
          )}
        </div>

        {/* Szczegóły produktu - reszta bez zmian... */}
        <div className="lg:pt-4">
          <h1
            className="text-3xl md:text-4xl font-serif font-light mb-6"
            dangerouslySetInnerHTML={{ __html: product.title.rendered }}
          />

          <div className="mb-8 border-t border-b divide-y divide-gray-200 dark:border-gray-700 dark:divide-gray-700">
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
          </div>

          <div className="space-y-1">
            <AccordionItem title="Opis Produktu" initialOpen>
              <div
                className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.content.rendered }}
              />
            </AccordionItem>
            {acf.dodatkowe_informacje && (
              <AccordionItem title="Dodatkowe Informacje">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: acf.dodatkowe_informacje! }}
                />
              </AccordionItem>
            )}
            {acf.pielegnacja && (
              <AccordionItem title="Pielęgnacja">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: acf.pielegnacja! }}
                />
              </AccordionItem>
            )}
          </div>

          {/* {acf.cena && (
            <div className="mt-8 text-3xl font-semibold text-brand-gold">
              {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(Number(acf.cena))}
            </div>
          )} */}

          <div className="mt-10">
            <Link
              href="/kontakt"
              className="inline-block bg-gray-800 hover:bg-gray-900 dark:bg-brand-gold dark:hover:bg-yellow-500 text-white dark:text-gray-900 py-3 px-8 rounded text-lg font-medium transition-colors"
            >
              {globalOptions?.acf?.ask_button_text || 'Zapytaj o ten pierścionek'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SingleProductPage