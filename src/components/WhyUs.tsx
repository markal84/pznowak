import React from 'react'
import { FaRegGem, FaTools, FaShieldAlt } from 'react-icons/fa'

const items = [
  { icon: FaTools, title: 'Wykonanie ręczne', text: 'Kucie, oprawa i polerowanie robimy sami, w pracowni. Nie zlecamy nic na zewnątrz.' },
  { icon: FaRegGem, title: 'Sprawdzone materiały', text: 'Złoto z certyfikowanych źródeł, kamienie oglądane na żywo przed decyzją.' },
  { icon: FaShieldAlt, title: 'Dożywotni serwis', text: 'Czyszczenie, zmiana rozmiaru, odnowienie. Jesteśmy z Tobą także po latach.' },
]

export default function WhyUs() {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
      {items.map((it, i) => (
        <li key={it.title} className="reveal rounded-lg bg-paper border border-line p-6 md:p-8" data-delay={String(i)}>
          <span className="h-12 w-12 rounded-full bg-gold-soft text-gold flex items-center justify-center" aria-hidden>
            <it.icon className="h-5 w-5" />
          </span>
          <h3 className="mt-5 text-2xl">{it.title}</h3>
          <p className="mt-2 muted leading-relaxed">{it.text}</p>
        </li>
      ))}
    </ul>
  )
}
