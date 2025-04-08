import React from 'react'
import Image from 'next/image' // Import Image
import Link from 'next/link' // Import Link

const GalleryPage = () => {
  // Placeholder for gallery images - fetch dynamically later
  const galleryItems = Array.from({ length: 9 }, (_, i) => ({
    id: `gallery-${i + 1}`,
    alt: `Przykład realizacji ${i + 1}`,
    // In a real scenario, you might link to a product or a larger image view
    href: '#' // Placeholder link
  }))

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-serif font-light mb-10 text-center">Galeria Inspiracji</h1>
      <p className="text-center mb-12 max-w-2xl mx-auto">
        Zobacz przykłady naszych realizacji i znajdź inspirację dla swojej wymarzonej biżuterii. Każdy projekt jest unikalny, tak jak historia, którą opowiada.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {galleryItems.map((item) => (
          <Link key={item.id} href={item.href} className="block group">
            <div className="aspect-square relative bg-gray-200 rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow duration-300">
              <Image
                src={`/placeholder-gallery-${(parseInt(item.id.split('-')[1]) % 3) + 1}.png`} // Cycle through 3 placeholder images
                alt={item.alt}
                fill
                style={{ objectFit: 'cover' }}
                className="group-hover:scale-105 transition-transform duration-300 ease-in-out"
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
              />
              {/* Optional: Overlay with title on hover */}
              {/* <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity duration-300 flex items-center justify-center">
                <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">{item.alt}</p>
              </div> */}
            </div>
          </Link>
        ))}
      </div>
      {/* TODO: Add potential pagination or filtering */}
    </div>
  )
}

export default GalleryPage 