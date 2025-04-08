import React from 'react'

const ContactPage = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-serif font-light mb-10 text-center">Skontaktuj Się z Nami</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
        {/* Contact Info */}
        <div className="space-y-4">
          <h2 className="text-2xl font-serif font-light mb-4">Dane Kontaktowe</h2>
          <p>
            <strong>Michał Nowak Pracownia Złotnicza</strong>
          </p>
          <p>
            Kilińskiego 12,<br />
            Busko-Zdrój, Poland
          </p>
          <p>
            Telefon: <a href="tel:+48501321347" className="text-blue-600 hover:text-blue-800">+48 501 321 347</a>
          </p>
          <p>
            Email: <a href="mailto:info@pznowak.pl" className="text-blue-600 hover:text-blue-800">info@pznowak.pl</a>
          </p>
          {/* TODO: Add actual opening hours if available */}
          <p>
            Godziny otwarcia:<br />
            (Prosimy o kontakt w celu umówienia wizyty)
            {/* Poniedziałek - Piątek: 10:00 - 18:00<br />
            Sobota: 10:00 - 14:00 (po wcześniejszym umówieniu) */}
          </p>
          {/* TODO: Add Instagram link */}
          {/* <p>Instagram: <a href="https://www.instagram.com/nowak_pracownia_zlotnicza/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">nowak_pracownia_zlotnicza</a></p> */}
          {/* TODO: Add a map */}
          <div className="w-full h-48 bg-gray-200 mt-6 rounded flex items-center justify-center text-gray-500">Placeholder Mapy</div>
        </div>

        {/* Contact Form Placeholder */}
        <div>
          <h2 className="text-2xl font-serif font-light mb-4">Formularz Kontaktowy</h2>
          <form className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">Imię i Nazwisko</label>
              <input type="text" id="name" name="name" required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
              <input type="email" id="email" name="email" required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-1">Wiadomość</label>
              <textarea id="message" name="message" rows={4} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea>
            </div>
            <div>
              <button type="submit" className="bg-gray-800 text-white hover:bg-gray-700 transition-colors duration-300 py-2 px-6 rounded-full font-medium">
                Wyślij Wiadomość
              </button>
            </div>
          </form>
          {/*TODO: Implement form submission logic.*/}
        </div>
      </div>
    </div>
  )
}

export default ContactPage 