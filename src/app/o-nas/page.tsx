import React from 'react'
import Image from 'next/image'
import RootsTimeline from '@/components/RootsTimeline'
import { getPageBySlug } from '@/lib/wordpress'
import { notFound } from 'next/navigation'

const AboutPage = async () => {
  const page = await getPageBySlug('o-nas')

  if (!page) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1
        className="text-3xl md:text-4xl font-serif font-light mb-8 text-center"
        dangerouslySetInnerHTML={{ __html: page.title.rendered }}
      />
      <div className="max-w-3xl mx-auto leading-relaxed space-y-6 font-sans">
        {/* Image of the workshop - This can be replaced with a featured image from WordPress later if needed */}
        <div className="relative w-full h-64 bg-gray-200 dark:bg-gray-700 my-8 rounded overflow-hidden shadow-md">
          <Image
            src="/about-us-workshop.png"
            alt="Wnętrze pracowni złotniczej Michała Nowaka"
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 768px) 100vw, 896px"
            priority
          />
        </div>

        <div
          className="prose prose-lg dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: page.content.rendered }}
        />

        {/* --- Sekcja Zdjęć Pokoleniowych --- */}
        <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
          <RootsTimeline />
        </div>
      </div>
    </div>
  )
}

export default AboutPage 