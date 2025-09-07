
import React from 'react';
import './Features.css';

const Features: React.FC = () => {
  const features = [
    {
      icon: '💎',
      title: 'Precious Stones',
      description: 'Hand-selected diamonds, sapphires, emeralds, and rubies from the finest sources worldwide.'
    },
    {
      icon: '🔨',
      title: 'Family Craftsmanship',
      description: 'Four generations of goldsmith expertise passed down through our family workshop tradition.'
    },
    {
      icon: '🎨',
      title: 'Full Customization',
      description: 'Design your ring from scratch - choose style, metal, and stone to create your perfect piece.'
    },
    {
      icon: '⏱️',
      title: 'Timeless Quality',
      description: 'Each piece is crafted with precision and care, designed to be heirlooms for generations.'
    }
  ];

  return (
    <section id="features" className="features">
      <div className="container">
        <h2 className="section-title">Why Choose Aurum Atelier</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
