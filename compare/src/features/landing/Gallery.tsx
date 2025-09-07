import React, { useState } from 'react';
import './Gallery.css';
 
const Gallery: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const images = [
    { src: '#', alt: 'Custom diamond engagement ring' },
    { src: '#', alt: 'Sapphire and gold wedding band' },
    { src: '#', alt: 'Emerald signet ring' },
    { src: '#', alt: 'Ruby cocktail ring' },
    { src: '#', alt: 'Classic solitaire diamond' },
    { src: '#', alt: 'Three-stone anniversary ring' }
  ];
 
  const openModal = (image: string) => setSelectedImage(image);
  const closeModal = () => setSelectedImage(null);
 
  return (
    <section id="gallery" className="gallery">
      <div className="container">
        <h2 className="section-title">Our Masterpieces</h2>
        <p className="gallery-subtitle">Discover the beauty of our custom creations</p>
        <div className="gallery-grid">
          {images.map((image, index) => (
            <div 
              key={index} 
              className="gallery-item"
              onClick={() => openModal(image.src)}
            >
              <div className="gallery-overlay">
                <span className="gallery-icon">🔍</span>
              </div>
              <img src={image.src} alt={image.alt} />
            </div>
          ))}
        </div>
      </div>
 
      {selectedImage && (
        <div className="modal" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <span className="modal-close" onClick={closeModal}>&times;</span>
            <img src={selectedImage} alt="Enlarged" />
          </div>
        </div>
      )}
    </section>
  );
};
 
export default Gallery;
 