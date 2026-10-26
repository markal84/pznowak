import React from 'react'
import { notFound } from 'next/navigation'
import type { Product } from '@/lib/wordpress'
import { getProductBySlug, getGlobalOptions, getProducts } from '@/lib/wordpress'
import AccordionItem from '@/components/AccordionItem'
import ProductGalleryClient from '@/components/ProductGalleryClient'
import Link from 'next/link'
import Button from '@/components/Button'
import { PHONE_NUMBER, EMAIL_ADDRESS } from '@/lib/socials'
import SectionTitle from '@/components/ui/SectionTitle'
import WhyUs from '@/components/WhyUs'

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

// Pre-render all product pages for static export
export async function generateStaticParams() {
  const products = await getProducts()
  return products.map(p => ({ slug: p.slug }))
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
      const res = await fetch(`${API_BASE}/media/${id}?_embed`, { next: { revalidate: 60 } })
      if (!res.ok) {
        console.warn(`Błąd pobierania mediów ${id}:`, res.status)
        return null
      }
      const media = (await res.json()) as (WpMedia & { _embedded?: { 'wp:featuredmedia'?: Array<{ source_url: string }> } })
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
        type MediaLike = Partial<WpMedia> & { id?: number; url?: string; alt?: string }
        const obj = it as MediaLike
        if (typeof obj.id === 'number') {
          const m = await fetchMediaById(obj.id)
          if (m?.url) slides.push({ src: m.url, alt: m.alt })
        } else if (typeof obj.url === 'string') {
          slides.push({ src: obj.url, alt: obj.alt || obj.title?.rendered })
        } else if (typeof obj.source_url === 'string') {
          slides.push({ src: obj.source_url, alt: obj.alt_text || obj.title?.rendered })
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
      type MediaLike = Partial<WpMedia> & { id?: number; url?: string }
      const obj = it as MediaLike
      if (typeof obj.id === 'number') {
        const m = await fetchMediaById(obj.id)
        if (m?.url && (m.mime?.startsWith('video/') || /\.(mp4|webm|ogg)(\?.*)?$/i.test(m.url))) {
          return { type: 'video', sources: [{ src: m.url, type: m.mime || 'video/mp4' }], poster: m.poster, alt: m.alt, width: m.width, height: m.height }
        }
      } else if (typeof obj.url === 'string') {
        return { type: 'video', sources: [{ src: obj.url, type: obj.mime_type || (/\.webm$/i.test(obj.url) ? 'video/webm' : 'video/mp4') }] }
      } else if (typeof obj.source_url === 'string') {
        return { type: 'video', sources: [{ src: obj.source_url, type: obj.mime_type || (/\.webm$/i.test(obj.source_url) ? 'video/webm' : 'video/mp4') }] }
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


  const keyFacts: Array<[string, string]> = []
  if (acf.kolor_metalu) keyFacts.push(['Kolor metalu', acf.kolor_metalu])
  if (acf.czy_posiada_kamien && acf.rodzaj_kamienia) keyFacts.push(['Rodzaj kamienia', acf.rodzaj_kamienia])
  if (acf.czystosc_kamienia) keyFacts.push(['Czystość kamienia', acf.czystosc_kamienia])
  if (acf.masa_karatowa) keyFacts.push(['Masa karatowa', acf.masa_karatowa])

  const lead = (product.acf as { lead?: string })?.lead?.trim() ||
    'Ręcznie wykonany pierścionek tworzony z dbałością o każdy detal. Łączy klasyczną elegancję z nowoczesnym wykończeniem, aby subtelnie podkreślić wyjątkowe chwile.'

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-[calc(var(--header-height)+2.5rem)] pb-[var(--space-section-md)]">
      {/* Breadcrumbs */}
      <nav className="mb-10" aria-label="Breadcrumb">
        <ol className="list-none p-0 inline-flex items-center gap-3 text-[0.6875rem] font-medium uppercase tracking-[0.26em] text-[var(--ink-faint)]">
          <li>
            <Link href="/katalog" className="link-subtle-hover">Katalog</Link>
          </li>
          <li aria-hidden className="text-[var(--gold)]">/</li>
          <li aria-current="page" className="text-[var(--ink)]" dangerouslySetInnerHTML={{ __html: product.title.rendered }} />
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Galeria (desktop: sticky) */}
        <div className="w-full lg:col-span-7 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]">
          {uniqueSlides.length > 0 ? (
            <ProductGalleryClient slides={uniqueSlides} imageAlt={imageAlt} />
          ) : (
            <div className="relative aspect-[4/3] bg-[var(--paper-deep)]" />
          )}
        </div>

        {/* Szczegóły */}
        <div className="lg:col-span-5">
          <h1
            className="display-title text-4xl md:text-5xl"
            dangerouslySetInnerHTML={{ __html: product.title.rendered }}
          />

          <p className="mt-6 font-display text-lg md:text-xl italic leading-relaxed text-[var(--ink-soft)]">
            {lead}
          </p>

          {/* Key facts */}
          {keyFacts.length > 0 && (
            <dl className="mt-10 keyfacts-divider">
              {keyFacts.map(([label, value]) => (
                <div key={label} className="py-4 flex items-baseline justify-between gap-6">
                  <dt className="text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-[var(--ink-faint)]">{label}</dt>
                  <dd className="font-display text-lg text-[var(--ink)]">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* CTA */}
          <div className="mt-10">
            <Button as="link" href="/kontakt" variant="primary" className="w-full sm:w-auto">
              {globalOptions?.acf?.ask_button_text || 'Zapytaj o ten pierścionek'}
            </Button>
            <p className="mt-5 text-sm font-light text-[var(--ink-faint)]">
              Lub bezpośrednio: <a className="link-subtle-hover underline underline-offset-4" href={`tel:${PHONE_NUMBER.replace(/\s+/g, '')}`}>{PHONE_NUMBER}</a>
              {' '}·{' '}
              <a className="link-subtle-hover underline underline-offset-4" href={`mailto:${EMAIL_ADDRESS}`}>{EMAIL_ADDRESS}</a>
            </p>
          </div>

          <div className="mt-12">
            <AccordionItem title="Opis i materiały" initialOpen>
              <div
                className="prose prose-sm max-w-prose leading-relaxed font-light"
                dangerouslySetInnerHTML={{ __html: product.content.rendered }}
              />
              <p className="mt-4 text-xs md:text-sm font-light text-[var(--ink-faint)] leading-relaxed">
                Uwaga: masa karatowa kamieni może nieznacznie różnić się o ±3% w zależności od rozmiaru i techniki wykonania.
              </p>
            </AccordionItem>
          </div>
        </div>
      </div>

      {/* Dlaczego my */}
      <div className="mt-[var(--space-section-lg)] hairline-t pt-14">
        <SectionTitle eyebrow="Dlaczego my" title="Rzemiosło. Materiały. Zaufanie." size="sm" center className="mb-10" />
        <WhyUs />
      </div>
    </div>
  )
}

export default SingleProductPage
