import React, { useState } from 'react';
import './Header.css';
 
const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
 
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <span className="logo-icon">✦</span>
          <span className="logo-text">Aurum Atelier</span>
        </div>
        <nav className="nav">
          <ul className={`nav-menu ${isMenuOpen ? 'nav-menu-open' : ''}`}>
            <li><a href="#home" className="nav-link">Home</a></li>
            <li><a href="#features" className="nav-link">Customization</a></li>
            <li><a href="#process" className="nav-link">Process</a></li>
            <li><a href="#gallery" className="nav-link">Gallery</a></li>
            <li><a href="#contact" className="nav-link">Contact</a></li>
          </ul>
          <div className="nav-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <span className="toggle-bar"></span>
            <span className="toggle-bar"></span>
            <span className="toggle-bar"></span>
          </div>
        </nav>
      </div>
    </header>
  );
};
 
export default Header;
 