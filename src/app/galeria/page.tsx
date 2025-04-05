import React from 'react'
// Placeholder for potential image imports

const GalleryPage = () => {
  // Placeholder for gallery images - later fetched from WordPress or other source
  const images = Array.from({ length: 9 }, (_, i) => `Placeholder Galerii ${i + 1}`)

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-serif font-light mb-10 text-center">Galeria Inspiracji</h1>
      <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
        Zobacz przykłady naszych realizacji i znajdź inspirację dla swojej wymarzonej biżuterii. Każdy projekt jest unikalny, tak jak historia, którą opowiada.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img, index) => (
          <div key={index} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 overflow-hidden hover:shadow-lg transition-shadow duration-300">
            {/* Placeholder for Image component */}
            <span className="text-sm">{img}</span>
          </div>
        ))}
      </div>
      {/* TODO: Add potential pagination or filtering */}
    </div>
  )
}

export default GalleryPage 