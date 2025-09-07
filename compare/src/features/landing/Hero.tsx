import React from 'react';
import './Hero.css';
 
const Hero: React.FC = () => {
  return (
    <section id="home" className="hero">
      <div className="hero-content">
        <h1 className="hero-title">
          Crafted by Generations, <br />
          <span className="highlight">Personalized for You</span>
        </h1>
        <p className="hero-subtitle">
          Experience the timeless art of goldsmithing with our family workshop. 
          Create your fully customizable gold ring adorned with exquisite precious stones.
        </p>
        <div className="hero-buttons">
          <a href="#contact" className="btn btn-primary">Start Your Design</a>
          <a href="#process" className="btn btn-secondary">Our Process</a>
        </div>
      </div>
      <div className="hero-visual">
        <div className="ring-animation">
          <div className="ring-band"></div>
          <div className="stone"></div>
        </div>
      </div>
    </section>
  );
};
 
export default Hero;
 