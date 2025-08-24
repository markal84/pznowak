import React from 'react'
import { notFound } from 'next/navigation'
import type { Product } from '@/lib/wordpress'
import { getProductBySlug, getGlobalOptions } from '@/lib/wordpress'
import AccordionItem from '@/components/AccordionItem'
import ProductGalleryClient from '@/components/ProductGalleryClient'
import Link from 'next/link'
import Button from '@/components/Button'
import { PHONE_NUMBER, EMAIL_ADDRESS } from '@/lib/socials'

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

  // Helpers: normalize various ACF return formats (ID | URL | Object | Array)
  const API_BASE = process.env.NEXT_PUBLIC_WP_API_URL!

  const toArray = <T,>(x: T | T[] | undefined | null): T[] =>
    Array.isArray(x) ? x : x == null ? [] : [x]

  const isNumericString = (s: string) => /^\d+$/.test(s.trim())

  async function fetchMediaById(id: number): Promise<{ url: string; alt?: string; width?: number; height?: number; mime?: string; poster?: string } | null> {
    try {
      // Użyjemy _embed, by ewentualnie wyciągnąć miniaturę (featuredmedia) dla wideo
      const res = await fetch(`${API_BASE}/media/${id}?_embed`)
      if (!res.ok) {
        console.warn(`Błąd pobierania mediów ${id}:`, res.status)
        return null
      }
      const media = (await res.json()) as any
      const mime: string | undefined = media?.mime_type
      // Dla obrazów używamy zoptymalizowanych rozmiarów; dla wideo zawsze bierzemy plik wideo z source_url,
      // a poster (miniaturę) próbujemy wyciągnąć z media_details.sizes.* jeśli dostępny
      let url: string | undefined
      let poster: string | undefined
      if (mime && mime.startsWith('video/')) {
        url = media?.source_url
        poster = media?.media_details?.sizes?.large?.source_url ||
                 media?.media_details?.sizes?.medium_large?.source_url ||
                 media?.media_details?.sizes?.medium?.source_url ||
                 media?.media_details?.sizes?.thumbnail?.source_url ||
                 // Fallback: spróbuj użyć osadzonego featuredmedia, jeśli wideo ma przypisaną miniaturę w WP
                 media?._embedded?.["wp:featuredmedia"]?.[0]?.source_url ||
                 undefined
      } else {
        url = media?.media_details?.sizes?.large?.source_url ||
              media?.media_details?.sizes?.medium_large?.source_url ||
              media?.media_details?.sizes?.medium?.source_url ||
              media?.media_details?.sizes?.thumbnail?.source_url ||
              media?.source_url
      }
      if (!url) return null
      return { url, alt: media?.alt_text || media?.title?.rendered, width: media?.media_details?.width, height: media?.media_details?.height, mime, poster }
    } catch (e) {
      console.error(`Błąd przy pobieraniu mediów ${id}:`, e)
      return null
    }
  }

  async function resolveImagesFromField(field: unknown): Promise<ImageSlide[]> {
    const items = toArray(field)
    const slides: ImageSlide[] = []
    for (const it of items) {
      if (typeof it === 'number') {
        const m = await fetchMediaById(it)
        if (m?.url) slides.push({ src: m.url, alt: m.alt })
      } else if (typeof it === 'string') {
        if (isNumericString(it)) {
          const m = await fetchMediaById(Number(it))
          if (m?.url) slides.push({ src: m.url, alt: m.alt })
        } else if (/^https?:\/\//.test(it)) {
          slides.push({ src: it })
        }
      } else if (it && typeof it === 'object') {
        const anyIt: any = it
        if (typeof anyIt.id === 'number') {
          const m = await fetchMediaById(anyIt.id)
          if (m?.url) slides.push({ src: m.url, alt: m.alt })
        } else if (typeof anyIt.url === 'string') {
          slides.push({ src: anyIt.url, alt: anyIt.alt || anyIt.title?.rendered })
        } else if (typeof anyIt.source_url === 'string') {
          slides.push({ src: anyIt.source_url, alt: anyIt.alt_text || anyIt.title?.rendered })
        }
      }
    }
    return slides
  }

  async function resolveVideoFromField(field: unknown): Promise<VideoSlide | null> {
    if (field == null) return null
    const it = Array.isArray(field) ? field[0] : field
    if (typeof it === 'number') {
      const m = await fetchMediaById(it)
      if (m?.url && (m.mime?.startsWith('video/') || /\.(mp4|webm|ogg)(\?.*)?$/i.test(m.url))) {
        return { type: 'video', sources: [{ src: m.url, type: m.mime || 'video/mp4' }], poster: m.poster, alt: m.alt, width: m.width, height: m.height }
      }
    } else if (typeof it === 'string') {
      if (isNumericString(it)) {
        const m = await fetchMediaById(Number(it))
        if (m?.url && (m.mime?.startsWith('video/') || /\.(mp4|webm|ogg)(\?.*)?$/i.test(m.url))) {
          return { type: 'video', sources: [{ src: m.url, type: m.mime || 'video/mp4' }], poster: m.poster, alt: m.alt, width: m.width, height: m.height }
        }
      } else if (/^https?:\/\//.test(it)) {
        // Nie mamy meta z WP, więc postera nie znamy
        return { type: 'video', sources: [{ src: it, type: /\.webm$/i.test(it) ? 'video/webm' : 'video/mp4' }] }
      }
    } else if (it && typeof it === 'object') {
      const anyIt: any = it
      if (typeof anyIt.id === 'number') {
        const m = await fetchMediaById(anyIt.id)
        if (m?.url && (m.mime?.startsWith('video/') || /\.(mp4|webm|ogg)(\?.*)?$/i.test(m.url))) {
          return { type: 'video', sources: [{ src: m.url, type: m.mime || 'video/mp4' }], poster: m.poster, alt: m.alt, width: m.width, height: m.height }
        }
      } else if (typeof anyIt.url === 'string') {
        return { type: 'video', sources: [{ src: anyIt.url, type: anyIt.mime_type || (/\.webm$/i.test(anyIt.url) ? 'video/webm' : 'video/mp4') }] }
      } else if (typeof anyIt.source_url === 'string') {
        return { type: 'video', sources: [{ src: anyIt.source_url, type: anyIt.mime_type || (/\.webm$/i.test(anyIt.source_url) ? 'video/webm' : 'video/mp4') }] }
      }
    }
    return null
  }

  // 1) Featured image
  const featuredMediaItem = product._embedded?.['wp:featuredmedia']?.[0]
  const featured =
    featuredMediaItem?.media_details?.sizes?.large?.source_url ||
    featuredMediaItem?.media_details?.sizes?.medium_large?.source_url ||
    featuredMediaItem?.source_url ||
    '/logo-placeholder.png'
  
  const imageAlt = featuredMediaItem?.alt_text || product.title.rendered

  // Bazowy URL z .env.local
  if (!process.env.NEXT_PUBLIC_WP_API_URL) {
    throw new Error('Dodaj NEXT_PUBLIC_WP_API_URL do .env.local')
  }
  // 2) Pobieranie obrazków z galerii ACF (obsługa ID/URL/obiekt/array)
  const galleryImageMediaArrays = await Promise.all([
    resolveImagesFromField(acf.product_gallery_1),
    resolveImagesFromField(acf.product_gallery_2),
    resolveImagesFromField(acf.product_gallery_3),
  ])
  const galleryImageMedia: ImageSlide[] = galleryImageMediaArrays.flat()

  // 3) Pobieranie danych wideo z ACF (jeśli ID jest dostępne)
  const videoSlideData = await resolveVideoFromField(acf.video)

  // 4) Tworzymy tablicę slajdów dla ProductGalleryClient
  const slides: Slide[] = [];

  // Dodajemy obrazek wyróżniający jako pierwszy (jeśli istnieje i nie jest placeholderem)
  if (featured && featured !== '/logo-placeholder.png') {
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
  if (uniqueSlides.length === 0 && featured === '/logo-placeholder.png') {
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

        {/* Szczegóły produktu – prawa kolumna z lewym wyrównaniem i lepszą hierarchią */}
        <div className="lg:pt-4">
          <h1
            className="text-3xl md:text-4xl font-serif font-light mb-4 text-left"
            dangerouslySetInnerHTML={{ __html: product.title.rendered }}
          />

          {/* Lead (2–3 zdania). Preferuj excerpt; fallback: krótki opis ogólny. */}
          {product.excerpt?.rendered ? (
            <div
              className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed mb-8 prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: product.excerpt.rendered }}
            />
          ) : (
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
              Ręcznie wykonany pierścionek tworzony z dbałością o każdy detal. Łączy klasyczną elegancję z nowoczesnym wykończeniem, aby subtelnie podkreślić wyjątkowe chwile.
            </p>
          )}

          {/* CTA nad parametrami – po lewej */}
          <div className="mb-8 text-left">
            <Button as="link" href="/kontakt" variant="primary" className="py-3 px-6 text-base">
              {globalOptions?.acf?.ask_button_text || 'Zapytaj o ten pierścionek'}
            </Button>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Preferujesz szybko? Zadzwoń <a className="link-subtle-hover underline-offset-2 hover:underline" href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`}>{PHONE_NUMBER}</a> lub napisz <a className="link-subtle-hover underline-offset-2 hover:underline" href={`mailto:${EMAIL_ADDRESS}`}>{EMAIL_ADDRESS}</a>.
            </div>
          </div>

          {/* Key facts: 2-kolumnowy grid, bez ciężkich linii */}
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-12 text-sm">
            {acf.kolor_metalu && (
              <div className="flex items-baseline gap-2">
                <dt className="text-gray-500 dark:text-gray-400">Kolor metalu</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{acf.kolor_metalu}</dd>
              </div>
            )}
            {acf.czy_posiada_kamien && acf.rodzaj_kamienia && (
              <div className="flex items-baseline gap-2">
                <dt className="text-gray-500 dark:text-gray-400">Rodzaj kamienia</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{acf.rodzaj_kamienia}</dd>
              </div>
            )}
            {acf.czystosc_kamienia && (
              <div className="flex items-baseline gap-2">
                <dt className="text-gray-500 dark:text-gray-400">Czystość kamienia</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{acf.czystosc_kamienia}</dd>
              </div>
            )}
            {acf.masa_karatowa && (
              <div className="flex items-baseline gap-2">
                <dt className="text-gray-500 dark:text-gray-400">Masa karatowa</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">{acf.masa_karatowa}</dd>
              </div>
            )}
          </dl>

          <div className="space-y-1 mt-12 text-left">
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
        </div>
      </div>
    </div>
  )
}

export default SingleProductPage
