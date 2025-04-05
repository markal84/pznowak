import React from 'react'

const Footer = () => {
  return (
    <footer className='bg-gray-100 text-gray-600 p-4 mt-8 border-t border-gray-200'>
      <div className='container mx-auto text-center text-sm'>
        <p>&copy; {new Date().getFullYear()} Michał Nowak Pracownia Złotnicza. Wszelkie prawa zastrzeżone.</p>
        {/* TODO: Add potential links or social media icons */}
      </div>
    </footer>
  )
}

export default Footer 