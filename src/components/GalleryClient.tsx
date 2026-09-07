'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/plugins/thumbnails.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import { MOCK_GALLERY } from '@/lib/mock-data'

type GalleryPost = {
  id: number
  title: { rendered: string }
  content: { rendered: string }
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string
      alt_text?: string
      media_details?: { width?: number; height?: number; sizes?: { large?: { source_url: string; width?: number; height?: number } } }
    }>
  }
}

const PER_PAGE = 9
const API_BASE = (process.env.NEXT_PUBLIC_WP_API_URL || '').replace(/\/$/, '')

export default function GalleryClient() {
  const [items, setItems] = useState<GalleryPost[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const getSrc = useCallback((item: GalleryPost) => {
    const media = item._embedded?.['wp:featuredmedia']?.[0]
    const src = media?.media_details?.sizes?.large?.source_url || media?.source_url || ''
    const alt = media?.alt_text || item.title.rendered || 'Galeria inspiracji'
    const w = media?.media_details?.width || media?.media_details?.sizes?.large?.width
    const h = media?.media_details?.height || media?.media_details?.sizes?.large?.height
    const portrait = typeof w === 'number' && typeof h === 'number' && h > w * 1.1
    return { src, alt, portrait }
  }, [])

  useEffect(() => {
    if (!hasMore) return
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        if (!API_BASE) {
          if (!cancelled) { setItems(MOCK_GALLERY as GalleryPost[]); setHasMore(false) }
          return
        }
        const res = await fetch(`${API_BASE}/gallery?_embed&per_page=${PER_PAGE}&page=${page}`)
        if (!res.ok) throw new Error(`Fetch error ${res.status}`)
        const total = Number(res.headers.get('X-WP-TotalPages') || '1')
        const data: GalleryPost[] = await res.json()
        if (cancelled) return
        setItems((prev) => [...prev, ...data.filter((p) => !prev.some((x) => x.id === p.id))])
        if (data.length < PER_PAGE || page >= total) setHasMore(false)
      } catch (err) {
        console.error(err)
        if (!cancelled) { setHasMore(false); setError(true) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [page, hasMore])

  useEffect(() => {
    if (!hasMore) return
    const el = loaderRef.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) setPage((p) => p + 1)
    }, { rootMargin: '300px' })
    io.observe(el)
    return () => io.disconnect()
  }, [loading, hasMore])

  const slides = items.map((item) => {
    const { src, alt } = getSrc(item)
    return { src, alt, description: item.title.rendered }
  })

  if (error && items.length === 0) {
    return <p className="text-center py-16 muted">Galeria jest chwilowo niedostępna. Zapraszamy na nasz Instagram lub do pracowni.</p>
  }

  return (
    <div>
      {/* Siatka: stałe proporcje kafli (4:5 pion, 4:3 poziom) -> brak przesunięć przy ładowaniu obrazów */}
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 grid-flow-row-dense">
        {items.map((item, idx) => {
          const { src, alt, portrait } = getSrc(item)
          if (!src) return null
          return (
            <li key={item.id} className={portrait ? 'row-span-2' : ''}>
              <button
                type="button"
                onClick={() => { setLightboxIndex(idx); setLightboxOpen(true) }}
                className={['img-zoom group relative block w-full overflow-hidden rounded-lg bg-ivory-2 border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold', portrait ? 'aspect-[3/4] md:aspect-[4/5]' : 'aspect-[4/3]'].join(' ')}
                aria-label={`Powiększ: ${alt}`}
              >
                <Image src={src} alt={alt} fill sizes="(min-width:768px) 33vw, 50vw" className="object-cover" loading={idx < 6 ? 'eager' : 'lazy'} />
                <span className="absolute inset-x-0 bottom-0 p-3 pt-10 bg-gradient-to-t from-ink/70 to-transparent text-ivory text-left text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden dangerouslySetInnerHTML={{ __html: item.title.rendered }} />
              </button>
            </li>
          )
        })}
      </ul>

      {loading && <p className="text-center py-8 muted text-sm">Ładowanie…</p>}
      {hasMore && <div ref={loaderRef} className="h-10" aria-hidden />}

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={slides}
        index={lightboxIndex}
        plugins={[Captions, Thumbnails, Zoom]}
        captions={{ descriptionTextAlign: 'center' }}
        thumbnails={{ position: 'bottom' }}
      />
    </div>
  )
}
