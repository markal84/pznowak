'use client' // Needed for useState

import React, { useState, ReactNode } from 'react'

interface AccordionItemProps {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
}

const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, initialOpen = false }) => {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className="border-b" style={{ borderColor: 'var(--color-divider)' }}>
      <h2>
        <button
          type="button"
          className="flex items-center justify-between w-full py-4 px-2 text-left font-medium hover:bg-gray-50/40 dark:hover:bg-white/5 focus:outline-none"
          onClick={toggleOpen}
          aria-expanded={isOpen}
        >
          <span>{title}</span>
          <svg
            className={`w-5 h-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </h2>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="p-4 pt-0">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AccordionItem;
