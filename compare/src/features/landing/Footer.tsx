import React from 'react';
import './Footer.css';
 
const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <div className="logo">
              <span className="logo-icon">✦</span>
              <span className="logo-text">Aurum Atelier</span>
            </div>
            <p>Crafted by generations, personalized for you. Experience the art of custom goldsmithing.</p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#features">Customization</a></li>
              <li><a href="#process">Process</a></li>
              <li><a href="#gallery">Gallery</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Contact Info</h4>
            <ul>
              <li>123 Goldsmith Lane, Artisan District</li>
              <li>+1 (555) 123-4567</li>
              <li>hello@aurumatelier.com</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Aurum Atelier. All rights reserved. Crafted with ❤️ by family tradition.</p>
        </div>
      </div>
    </footer>
  );
};
 
export default Footer;
 