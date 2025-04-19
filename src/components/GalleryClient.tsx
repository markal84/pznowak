'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

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
  const API_URL = process.env.NEXT_PUBLIC_WP_API_URL || ''
  const PER_PAGE = 9

  const [items, setItems] = useState<GalleryPost[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalPages, setTotalPages] = useState<number | null>(null)
  const loaderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!API_URL || !hasMore) return
    const fetchGallery = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `${API_URL}/gallery?_embed&per_page=${PER_PAGE}&page=${page}`
        )
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
  }, [API_URL, page, hasMore, totalPages])

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

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-serif font-light mb-10 text-center">
        Galeria Inspiracji
      </h1>
      <p className="text-center mb-12 max-w-2xl mx-auto">
        Zobacz przykłady naszych realizacji i znajdź inspirację dla swojej wymarzonej biżuterii.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {items.map(item => {
          const media = item._embedded?.['wp:featuredmedia']?.[0]
          const src = media?.media_details.sizes.large?.source_url || media?.source_url || ''
          const alt = media?.alt_text || item.title.rendered || 'Galeria Inspiracji'
          return (
            <div key={item.id} className="group">
              <div className="relative aspect-square rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow duration-300">
                <Image
                  src={src}
                  alt={alt}
                  fill
                  style={{ objectFit: 'cover' }}
                  className="group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                />
              </div>
            </div>
          )
        })}
      </div>
      {hasMore && <div ref={loaderRef} className="h-10"></div>}
    </div>
  )
}