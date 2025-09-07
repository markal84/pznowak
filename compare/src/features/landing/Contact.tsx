import React from 'react';
import './Contact.css';
 
const Contact: React.FC = () => {
  return (
    <section id="contact" className="contact">
      <div className="container">
        <div className="contact-content">
          <div className="contact-info">
            <h2 className="section-title">Start Your Journey</h2>
            <p className="contact-subtitle">
              Ready to create your perfect ring? Contact our family workshop today 
              to begin your custom design experience.
            </p>
            <div className="contact-details">
              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <div>
                  <h4>Visit Us</h4>
                  <p>123 Goldsmith Lane, Artisan District</p>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <div>
                  <h4>Call Us</h4>
                  <p>+1 (555) 123-4567</p>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">✉️</span>
                <div>
                  <h4>Email Us</h4>
                  <p>hello@aurumatelier.com</p>
                </div>
              </div>
            </div>
            <a href="mailto:hello@aurumatelier.com" className="btn btn-primary">Get In Touch</a>
          </div>
          <form className="contact-form">
            <h3>Or Send Us a Message</h3>
            <div className="form-group">
              <input type="text" placeholder="Your Name" required />
            </div>
            <div className="form-group">
              <input type="email" placeholder="Your Email" required />
            </div>
            <div className="form-group">
              <textarea placeholder="Tell us about your dream ring..." rows={5} required></textarea>
            </div>
            <button type="submit" className="btn btn-primary">Send Message</button>
          </form>
        </div>
      </div>
    </section>
  );
};
 
export default Contact;
 