
import React from 'react';
import Header from './features/landing/Header';
import Hero from './features/landing/Hero';
import Features from './features/landing/Features';
import Process from './features/landing/Process';
import Gallery from './features/landing/Gallery';
import Testimonials from './features/landing/Testimonials';
import Contact from './features/landing/Contact';
import Footer from './features/landing/Footer';
import './App.css';

function App() {
  return (
    <div className="App">
      <Header />
      <Hero />
      <Features />
      <Process />
      <Gallery />
      <Testimonials />
      <Contact />
      <Footer />
    </div>
  );
}

export default App;
