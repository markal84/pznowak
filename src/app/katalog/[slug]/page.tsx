import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Product } from '@/lib/wordpress'
import { getProductBySlug, getGlobalOptions, getProducts, USE_MOCKS } from '@/lib/wordpress'
import AccordionItem from '@/components/AccordionItem'
import ProductGalleryClient from '@/components/ProductGalleryClient'
import ProductCard from '@/components/ProductCard'
import Button from '@/components/Button'
import WhyUs from '@/components/WhyUs'
import { PHONE_NUMBER, EMAIL_ADDRESS } from '@/lib/socials'
import { FaPhone } from 'react-icons/fa'

interface ImageSlide { src: string; alt?: string; type?: undefined }
interface VideoSlideSource { src: string; type: string }
interface VideoSlide { type: 'video'; sources: VideoSlideSource[]; poster?: string; alt?: string; width?: number; height?: number }
type Slide = ImageSlide | VideoSlide

interface AcfFields {
  lead?: string
  product_gallery_1?: number | string
  product_gallery_2?: number | string
  product_gallery_3?: number | string
  video?: number | string
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
      medium_large?: { source_url: string }
      full?: { source_url: string }
    }
    width?: number
    height?: number
  }
  source_url: string
  alt_text?: string
  mime_type?: string
  title?: { rendered: string }
}

interface ProductPageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  return { title: product ? product.title.rendered : 'Produkt nie znaleziony' }
}

export async function generateStaticParams() {
  const products = await getProducts()
  return products.map((p) => ({ slug: p.slug }))
}

const SingleProductPage = async ({ params }: ProductPageProps) => {
  const { slug } = await params
  const product: Product | null = await getProductBySlug(slug)
  const globalOptions = await getGlobalOptions()
  if (!product) return notFound()

  const acf = product.acf as AcfFields
  const API_BASE = process.env.NEXT_PUBLIC_WP_API_URL || ''

  const toArray = <T,>(x: T | T[] | undefined | null): T[] => (Array.isArray(x) ? x : x == null ? [] : [x])
  const isNumericString = (s: string) => /^\d+$/.test(s.trim())

  async function fetchMediaById(id: number): Promise<{ url: string; alt?: string; width?: number; height?: number; mime?: string; poster?: string } | null> {
    if (!API_BASE) return null
    try {
      const res = await fetch(`${API_BASE}/media/${id}?_embed`, { next: { revalidate: 60 } })
      if (!res.ok) return null
      const media = (await res.json()) as WpMedia & { _embedded?: { 'wp:featuredmedia'?: Array<{ source_url: string }> } }
      const mime: string | undefined = media?.mime_type
      let url: string | undefined
      let poster: string | undefined
      if (mime && mime.startsWith('video/')) {
        url = media?.source_url
        poster =
          media?.media_details?.sizes?.large?.source_url ||
          media?.media_details?.sizes?.medium_large?.source_url ||
          media?.media_details?.sizes?.medium?.source_url ||
          media?.media_details?.sizes?.thumbnail?.source_url ||
          media?._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
          undefined
      } else {
        url =
          media?.media_details?.sizes?.large?.source_url ||
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
    const isVideo = (m: { url: string; mime?: string }) => m.mime?.startsWith('video/') || /\.(mp4|webm|ogg)(\?.*)?$/i.test(m.url)
    if (typeof it === 'number' || (typeof it === 'string' && isNumericString(it))) {
      const m = await fetchMediaById(Number(it))
      if (m?.url && isVideo(m)) {
        return { type: 'video', sources: [{ src: m.url, type: m.mime || 'video/mp4' }], poster: m.poster, alt: m.alt, width: m.width, height: m.height }
      }
    } else if (typeof it === 'string' && /^https?:\/\//.test(it)) {
      return { type: 'video', sources: [{ src: it, type: /\.webm$/i.test(it) ? 'video/webm' : 'video/mp4' }] }
    } else if (it && typeof it === 'object') {
      type MediaLike = Partial<WpMedia> & { id?: number; url?: string }
      const obj = it as MediaLike
      if (typeof obj.id === 'number') {
        const m = await fetchMediaById(obj.id)
        if (m?.url && isVideo(m)) {
          return { type: 'video', sources: [{ src: m.url, type: m.mime || 'video/mp4' }], poster: m.poster, alt: m.alt, width: m.width, height: m.height }
        }
      } else {
        const src = typeof obj.url === 'string' ? obj.url : typeof obj.source_url === 'string' ? obj.source_url : null
        if (src) return { type: 'video', sources: [{ src, type: obj.mime_type || (/\.webm$/i.test(src) ? 'video/webm' : 'video/mp4') }] }
      }
    }
    return null
  }

  const featuredMediaItem = product._embedded?.['wp:featuredmedia']?.[0]
  const featured =
    featuredMediaItem?.media_details?.sizes?.large?.source_url ||
    featuredMediaItem?.media_details?.sizes?.medium_large?.source_url ||
    featuredMediaItem?.source_url ||
    '/logo-placeholder.png'
  const imageAlt = featuredMediaItem?.alt_text || product.title.rendered

  const galleryImageMedia: ImageSlide[] = (
    await Promise.all([
      resolveImagesFromField(acf.product_gallery_1),
      resolveImagesFromField(acf.product_gallery_2),
      resolveImagesFromField(acf.product_gallery_3),
    ])
  ).flat()
  const videoSlideData = await resolveVideoFromField(acf.video)

  const slides: Slide[] = []
  if (featured && featured !== '/logo-placeholder.png') slides.push({ src: featured, alt: imageAlt })
  if (videoSlideData) slides.push(videoSlideData)
  slides.push(...galleryImageMedia)

  const uniqueSlides = slides.filter((slide, index, self) => {
    if (slide.type === 'video') {
      return index === self.findIndex((s) => s.type === 'video' && s.sources?.[0]?.src === slide.sources?.[0]?.src)
    }
    return index === self.findIndex((s) => s.type !== 'video' && s.src === slide.src)
  })
  if (uniqueSlides.length === 0) uniqueSlides.push({ src: featured, alt: imageAlt })

  const facts = [
    ['Kolor metalu', acf.kolor_metalu],
    ['Kamień', acf.czy_posiada_kamien ? acf.rodzaj_kamienia : undefined],
    ['Czystość kamienia', acf.czystosc_kamienia],
    ['Masa karatowa', acf.masa_karatowa],
  ].filter(([, v]) => !!v) as [string, string][]

  const lead = acf.lead?.trim() || 'Ręcznie wykonany pierścionek tworzony z dbałością o każdy detal. Ten model możemy powtórzyć lub zmienić pod Ciebie: kamień, kolor złota, szerokość szyny.'
  const telHref = `tel:${PHONE_NUMBER.replace(/[^+\d]/g, '')}`

  // Podobne projekty
  const all = await getProducts()
  const related = all.filter((p) => p.slug !== product.slug).slice(0, 3)

  return (
    <>
      <div className="container-x pt-6 md:pt-10">
        <nav className="text-sm muted" aria-label="Okruszki">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="hover:text-gold">Strona główna</Link></li>
            <li aria-hidden>/</li>
            <li><Link href="/katalog" className="hover:text-gold">Katalog</Link></li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="text-ink" dangerouslySetInnerHTML={{ __html: product.title.rendered }} />
          </ol>
        </nav>
      </div>

      <section className="container-x pt-6 md:pt-8 pb-12 md:pb-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
        <div className="lg:col-span-7 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]">
          <ProductGalleryClient slides={uniqueSlides} imageAlt={imageAlt} />
        </div>

        <div className="lg:col-span-5">
          <p className="eyebrow">Projekt z pracowni</p>
          <h1 className="mt-2 text-[2.6rem] md:text-[3.4rem]" dangerouslySetInnerHTML={{ __html: product.title.rendered }} />
          <p className="mt-5 text-lg muted leading-relaxed">{lead}</p>

          {facts.length > 0 && (
            <dl className="mt-8 border-t border-line">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-3 border-b border-line text-[15px]">
                  <dt className="muted">{k}</dt>
                  <dd className="font-medium text-right">{v}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-8 rounded-lg bg-ivory-2 border border-line p-5 md:p-6">
            <p className="font-display text-2xl">Zapytaj o ten pierścionek</p>
            <p className="mt-1 text-sm muted">Podamy cenę i termin. Możemy zmienić kamień, próbę złota lub rozmiar.</p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <Button as="link" href={`/kontakt?projekt=${encodeURIComponent(product.title.rendered)}`} className="w-full sm:w-auto">
                {globalOptions?.acf?.ask_button_text || 'Napisz do nas'}
              </Button>
              <a href={telHref} className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded border border-line-strong font-semibold hover:border-gold hover:text-gold transition-colors">
                <FaPhone className="h-4 w-4 text-gold" aria-hidden /> {PHONE_NUMBER}
              </a>
            </div>
            <p className="mt-3 text-xs muted">lub e-mail: <a className="underline underline-offset-2 hover:text-gold" href={`mailto:${EMAIL_ADDRESS}`}>{EMAIL_ADDRESS}</a></p>
          </div>

          <div className="mt-8">
            <AccordionItem title="Opis i materiały" initialOpen>
              <div className="prose-brand prose-p:leading-relaxed" dangerouslySetInnerHTML={{ __html: product.content.rendered }} />
              <p className="mt-4 text-sm muted">Masa karatowa kamieni może różnić się o ±3% w zależności od rozmiaru i techniki wykonania.</p>
            </AccordionItem>
            {acf.pielegnacja && (
              <AccordionItem title="Pielęgnacja">
                <div className="prose-brand" dangerouslySetInnerHTML={{ __html: acf.pielegnacja }} />
              </AccordionItem>
            )}
            <AccordionItem title="Jak wygląda zamówienie?">
              <ol className="list-decimal pl-5 space-y-2 muted">
                <li>Rozmowa w pracowni lub telefonicznie o oczekiwaniach i budżecie.</li>
                <li>Szkic i wycena, dobór kamienia na żywo.</li>
                <li>Wykonanie ręczne w naszej pracowni (2–5 tygodni).</li>
                <li>Odbiór osobisty lub przesyłka ubezpieczona. Dożywotni serwis.</li>
              </ol>
            </AccordionItem>
          </div>
        </div>
      </section>

      <section className="section bg-ivory-2">
        <div className="container-x">
          <p className="eyebrow text-center">Dlaczego my</p>
          <h2 className="mt-2 text-center text-[1.9rem] md:text-[2.4rem]">Rzemiosło. Materiały. Zaufanie.</h2>
          <div className="mt-10"><WhyUs /></div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section">
          <div className="container-x">
            <div className="flex items-end justify-between gap-6">
              <h2 className="text-[1.9rem] md:text-[2.4rem]">Podobne projekty</h2>
              <Link href="/katalog" className="font-semibold text-gold hover:underline underline-offset-4 shrink-0">Cały katalog →</Link>
            </div>
            <ul className="mt-8 grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </ul>
          </div>
        </section>
      )}
      {USE_MOCKS && <p className="sr-only">Dane podglądowe</p>}
    </>
  )
}

export default SingleProductPage
