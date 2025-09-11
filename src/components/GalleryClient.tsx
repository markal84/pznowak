'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import 'yet-another-react-lightbox/plugins/thumbnails.css'
import 'yet-another-react-lightbox/plugins/captions.css'

type GalleryPost = {
  id: number
  title: { rendered: string }
  content: { rendered: string }
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string
      media_details: { sizes: { large?: { source_url: string } } }
      alt_text: string
    }>
  }
}

export default function GalleryClient() {
  // Korzystamy z lokalnego proxy API: /api/gallery
  const PER_PAGE = 9

  const [items, setItems] = useState<GalleryPost[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalPages, setTotalPages] = useState<number | null>(null)
  const loaderRef = useRef<HTMLDivElement>(null)

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Przygotuj slajdy do lightboxa
  const slides = items.map(item => {
    const media = item._embedded?.['wp:featuredmedia']?.[0]
    const src = media?.media_details.sizes.large?.source_url || media?.source_url || ''
    const alt = media?.alt_text || item.title.rendered || 'Galeria Inspiracji'
    return {
      src,
      alt,
      description: item.title.rendered,
    }
  })

  useEffect(() => {
    if (!hasMore) return
    const fetchGallery = async () => {
      setLoading(true)
      try {
        const base = (process.env.NEXT_PUBLIC_WP_API_URL || '').replace(/\/$/, '')
        const url = `${base}/gallery?_embed&per_page=${PER_PAGE}&page=${page}`
        const res = await fetch(url)
        const total = res.headers.get('X-WP-TotalPages')
        if (total) setTotalPages(parseInt(total, 10))
        if (!res.ok) throw new Error(`Fetch error ${res.status}`)
        const data: GalleryPost[] = await res.json()
        if (!Array.isArray(data)) throw new Error('Invalid data format')
        setItems(prev => [
          ...prev,
          ...data.filter(post => !prev.some(p => p.id === post.id))
        ])
        if (data.length < PER_PAGE || (totalPages !== null && page >= totalPages)) {
          setHasMore(false)
        }
      } catch (err) {
        console.error(err)
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    }
    fetchGallery()
  }, [page, hasMore, totalPages])

  useEffect(() => {
    if (!hasMore) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading) {
          setPage(prev => prev + 1)
        }
      },
      { rootMargin: '200px' }
    )
    const el = loaderRef.current
    if (el) observer.observe(el)
    return () => { if (el) observer.unobserve(el) }
  }, [loading, hasMore])

  // Helper: best source url
  const getSrc = (item: GalleryPost) => {
    type FeaturedMedia = {
      source_url?: string
      alt_text?: string
      media_details?: {
        width?: number
        height?: number
        sizes?: {
          large?: { source_url?: string; width?: number; height?: number }
          medium_large?: { source_url?: string; width?: number; height?: number }
          medium?: { source_url?: string; width?: number; height?: number }
        }
      }
    }
    const media: FeaturedMedia | undefined = item._embedded?.['wp:featuredmedia']?.[0]
    const src: string = media?.media_details?.sizes?.large?.source_url || media?.source_url || ''
    const alt: string = media?.alt_text || item.title.rendered || 'Galeria Inspiracji'
    // Try to infer orientation if available
    const w: number | undefined = media?.media_details?.width || media?.media_details?.sizes?.large?.width
    const h: number | undefined = media?.media_details?.height || media?.media_details?.sizes?.large?.height
    const orientation: 'portrait' | 'landscape' | 'square' =
      typeof w === 'number' && typeof h === 'number'
        ? (Math.abs(w - h) < Math.min(w, h) * 0.1 ? 'square' : (w > h ? 'landscape' : 'portrait'))
        : 'landscape'
    return { src, alt, orientation }
  }

  // Aspect ratio bucket based on orientation
  // Cel: obok jednego pionowego (2/3 ~1.5w) mieszczą się dwa poziome (4/3 ~0.75w)
  const getAspect = (orientation: 'portrait' | 'landscape' | 'square'): '2/3' | '4/3' => {
    if (orientation === 'portrait') return '2/3'
    // Square traktujemy jak poziomy, dla lepszego wypełniania obok pionów
    return '4/3'
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-serif font-light mb-10 text-center">
        Galeria Inspiracji
      </h1>
      <p className="text-center mb-12 max-w-2xl mx-auto">
        Zobacz przykłady naszych realizacji i znajdź inspirację dla swojej wymarzonej biżuterii.
      </p>

      <section className="mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 grid-flow-row-dense">
          {/* Hero: pierwszy element, pełna szerokość (3 kolumny) */}
          {items[0] && (() => {
            const { src, alt } = getSrc(items[0])
            return (
              <div key={`hero-a-${items[0].id}`} className="group cursor-pointer md:col-span-3" onClick={() => { setLightboxIndex(0); setLightboxOpen(true) }}>
                <div className="relative aspect-[16/9] rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow duration-300">
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="group-hover:scale-[1.02] transition-transform duration-300"
                    sizes="100vw"
                    priority
                  />
                </div>
              </div>
            )
          })()}
          {/* Pozostałe kafle: pion = 2/3 + sm:row-span-2, poziom/kwadrat = 4/3 + sm:row-span-1 */}
          {items.slice(1).map((item, i) => {
            const idx = i + 1 // oryginalny indeks w items
            const { src, alt, orientation } = getSrc(item)
            const aspect = getAspect(orientation)
            const aspectClass = aspect === '4/3' ? 'aspect-[4/3]' : 'aspect-[2/3]'
            const rowSpanClass = orientation === 'portrait' ? 'sm:row-span-2' : 'sm:row-span-1'
            return (
              <div key={`a-${item.id}`} className={`group cursor-pointer ${rowSpanClass}`} onClick={() => { setLightboxIndex(idx); setLightboxOpen(true) }}>
                <div className={`relative ${aspectClass} rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow duration-300`}>
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="group-hover:scale-[1.03] transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    loading="lazy"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={slides}
        index={lightboxIndex}
        plugins={[Captions, Thumbnails]}
        captions={{ descriptionTextAlign: 'center' }}
        thumbnails={{ position: 'bottom' }}
      />

      {hasMore && <div ref={loaderRef} className="h-10"></div>}
    </div>
  )
}
