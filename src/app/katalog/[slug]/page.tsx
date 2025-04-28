// app/katalog/[slug]/page.tsx
import React from 'react'
import { notFound } from 'next/navigation'
import type { Product } from '@/lib/wordpress'
import { getProductBySlug } from '@/lib/wordpress'
import AccordionItem from '@/components/AccordionItem'
import ProductGalleryClient from '@/components/ProductGalleryClient'
import Link from 'next/link'

interface GallerySlide { src: string }
interface AcfFields {
  product_gallery_1?: number
  product_gallery_2?: number
  product_gallery_3?: number
  czy_posiada_kamien?: boolean
  rodzaj_kamienia?: string
  kolor_metalu?: string
  czystosc_kamienia?: string
  masa_karatowa?: string
  dodatkowe_informacje?: string
  pielegnacja?: string
  cena?: string
}

// na górze pliku app/katalog/[slug]/page.tsx
interface WpMedia {
  media_details?: {
    sizes?: {
      large?: { source_url: string }
    }
  }
  source_url: string
}


// params jest Promisem, więc będziemy robić await params
interface ProductPageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  return {
    title: product ? product.title.rendered : 'Produkt nie znaleziony',
  }
}

const SingleProductPage = async ({ params }: ProductPageProps) => {
  // **await params** zanim weźmiesz slug
  const { slug } = await params
  const product: Product | null = await getProductBySlug(slug)
  if (!product) return notFound()

  // 1) Featured image
  const featured =
    product._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.large
      ?.source_url ||
    product._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
    '/placeholder-image.png'
  const imageAlt =
    product._embedded?.['wp:featuredmedia']?.[0]?.alt_text ||
    product.title.rendered

  // 2) Wyciągamy ID z ACF
  const acf = product.acf as AcfFields
  const galleryIds = [
    acf.product_gallery_1,
    acf.product_gallery_2,
    acf.product_gallery_3,
  ].filter((id): id is number => Boolean(id))

  // 3) Bazowy URL z .env.local
  if (!process.env.NEXT_PUBLIC_WP_API_URL) {
    throw new Error('Dodaj NEXT_PUBLIC_WP_API_URL do .env.local')
  }
  const API_BASE = process.env.NEXT_PUBLIC_WP_API_URL

  // 4) Fetch po media ID

const galleryMedia: GallerySlide[] = await Promise.all(
  galleryIds.map(async (id) => {
    const res = await fetch(`${API_BASE}/media/${id}`)
    if (!res.ok) {
      console.warn(`media/${id} fetch error:`, res.status)
      return { src: '/placeholder-image.png' }
    }
    // zamiast `any`:
    const media = (await res.json()) as WpMedia
    const url =
      media.media_details?.sizes?.large?.source_url ||
      media.source_url ||
      '/placeholder-image.png'
    return { src: url }
  })
)

  // 5) Tworzymy slides
  const slides: GallerySlide[] = [{ src: featured }, ...galleryMedia]

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
          <ProductGalleryClient slides={slides} imageAlt={imageAlt} />
        </div>

        {/* Szczegóły produktu */}
        <div className="lg:pt-4">
          <h1
            className="text-3xl md:text-4xl font-serif font-light mb-6"
            dangerouslySetInnerHTML={{ __html: product.title.rendered }}
          />

          <div className="mb-8 border-t border-b divide-y divide-gray-200">
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
                className="prose prose-sm max-w-none leading-relaxed"
                dangerouslySetInnerHTML={{ __html: product.content.rendered }}
              />
            </AccordionItem>
            {acf.dodatkowe_informacje && (
              <AccordionItem title="Dodatkowe Informacje">
                <div
                  className="prose prose-sm max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: acf.dodatkowe_informacje! }}
                />
              </AccordionItem>
            )}
            {acf.pielegnacja && (
              <AccordionItem title="Pielęgnacja">
                <div
                  className="prose prose-sm max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: acf.pielegnacja! }}
                />
              </AccordionItem>
            )}
          </div>

          <div className="mt-10">
            <a
              href="/kontakt"
              className="inline-block bg-gray-800 text-white py-3 px-8 rounded text-lg font-medium"
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
