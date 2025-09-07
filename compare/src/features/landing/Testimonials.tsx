import React from 'react';
import './Testimonials.css';
 
const Testimonials: React.FC = () => {
  const testimonials = [
    {
      quote: "The attention to detail and craftsmanship exceeded our expectations. Our engagement ring is truly one-of-a-kind.",
      author: "Sarah & Michael T.",
      role: "Newly Engaged"
    },
    {
      quote: "Working with the family was a joy. They made the entire process personal and meaningful. The ring is now our family heirloom.",
      author: "Elizabeth R.",
      role: "Anniversary Gift"
    },
    {
      quote: "As a collector of fine jewelry, I can say this is some of the finest work I've seen. The stone selection process was exceptional.",
      author: "James W.",
      role: "Jewelry Enthusiast"
    }
  ];
 
  return (
    <section className="testimonials">
      <div className="container">
        <h2 className="section-title">What Our Clients Say</h2>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="quote-icon">"</div>
              <p className="testimonial-text">{testimonial.quote}</p>
              <div className="testimonial-author">
                <h4>{testimonial.author}</h4>
                <span>{testimonial.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
 
export default Testimonials;
 