import React from 'react'
import { FaRegGem, FaTools, FaShieldAlt } from 'react-icons/fa'

export default function WhyUs() {
  const items = [
    {
      icon: <FaTools className="h-6 w-6" />,
      title: 'Rzemiosło ręczne',
      text: 'Każdy projekt powstaje w naszej pracowni – z dbałością o detal i trwałość użytkową.',
    },
    {
      icon: <FaRegGem className="h-6 w-6" />,
      title: 'Szlachetne materiały',
      text: 'Złoto i kamienie pochodzą ze sprawdzonych źródeł – transparentność i jakość bez kompromisów.',
    },
    {
      icon: <FaShieldAlt className="h-6 w-6" />,
      title: 'Zaufanie i gwarancja',
      text: 'Pomagamy w pielęgnacji i serwisie. Jesteśmy z Tobą także po zakupie.',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {items.map((it, idx) => (
        <div
          key={idx}
          className="p-6 rounded-[8px] shadow-sm bg-[--color-surface] transition ease-[var(--ease-standard)] duration-200 hover:shadow-md hover:-translate-y-0.5 motion-reduce:transform-none text-center"
        >
          <div className="h-12 w-12 rounded-full bg-[color:var(--color-brand-gold-light)] text-brand-gold flex items-center justify-center mx-auto mb-4">
            {it.icon}
          </div>
          <h3 className="font-display text-lg md:text-xl text-gray-900 dark:text-white mb-2">
            {it.title}
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {it.text}
          </p>
        </div>
      ))}
    </div>
  )
}
