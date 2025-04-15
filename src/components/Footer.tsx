import React from 'react'

const Footer = () => {
  const currentYear = new Date().getFullYear();
  // TODO: Zmień dane kontaktowe na prawdziwe
  const phone = "+48 123 456 789";
  const email = "kontakt@example.com";

  return (
    <footer className='bg-gray-100 text-gray-600 p-6 md:p-8 mt-10 border-t border-gray-200'>
      <div className='container mx-auto flex flex-col md:flex-row justify-between items-center text-sm space-y-4 md:space-y-0'>
        <div className="text-center md:text-left">
          &copy; {currentYear} Michał Nowak Pracownia Złotnicza. Wszelkie prawa zastrzeżone.
        </div>

        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 text-center md:text-right">
          <a href={`tel:${phone.replace(/\s+/g, '')}`} className="flex items-center hover:text-gray-800 transition-colors">
            <span className="mr-2 text-base">[T]</span>
            {phone}
          </a>
          <a href={`mailto:${email}`} className="flex items-center hover:text-gray-800 transition-colors">
            <span className="mr-2 text-base">[E]</span>
            {email}
          </a>
        </div>
      </div>
    </footer>
  )
}

export default Footer 