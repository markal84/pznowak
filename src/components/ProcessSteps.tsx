'use client'
import React, { useState } from 'react'

const steps = [
  {
    n: '01',
    title: 'Rozmowa',
    short: 'O oczekiwaniach i budżecie',
    text:
      'Spotykamy się w pracowni lub rozmawiamy telefonicznie. Ustalamy, dla kogo ma być pierścionek, jaki styl, kamień i budżet. Bez zobowiązań.',
    time: '30–60 minut',
  },
  {
    n: '02',
    title: 'Projekt',
    short: 'Szkic i wycena',
    text:
      'Przygotowujemy szkic oraz dokładną wycenę. Możemy pokazać kamienie na żywo i przymierzyć próbne oprawy, żeby dobrać proporcje do dłoni.',
    time: '3–7 dni',
  },
  {
    n: '03',
    title: 'Wykonanie',
    short: 'Ręcznie, w naszej pracowni',
    text:
      'Kucie szyny, oprawa kamienia, grawer i polerowanie. Wszystko robimy na miejscu, tymi samymi technikami, które w rodzinie przekazujemy od czterech pokoleń.',
    time: '2–5 tygodni',
  },
  {
    n: '04',
    title: 'Odbiór i opieka',
    short: 'Z dożywotnim serwisem',
    text:
      'Odbierasz pierścionek osobiście lub przesyłką ubezpieczoną. Po latach można go u nas wyczyścić, dopasować rozmiar lub odnowić.',
    time: 'na zawsze',
  },
]

/**
 * Kroki współpracy. Panele są ułożone w jednej komórce grida (nakładają się),
 * więc kontener ma wysokość najwyższego panelu i przełączanie niczego nie przesuwa.
 */
export default function ProcessSteps() {
  const [active, setActive] = useState(0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
      <ol className="lg:col-span-5 grid grid-cols-2 lg:grid-cols-1 gap-2 lg:gap-1" role="tablist" aria-label="Etapy współpracy">
        {steps.map((s, i) => {
          const on = i === active
          return (
            <li key={s.n}>
              <button
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls={`step-panel-${i}`}
                id={`step-tab-${i}`}
                onClick={() => setActive(i)}
                className={[
                  'w-full text-left rounded px-4 py-3 lg:px-5 lg:py-4 border transition-colors duration-200',
                  on ? 'bg-ink text-ivory border-ink' : 'bg-transparent text-ink border-line hover:border-gold',
                ].join(' ')}
              >
                <span className={['block text-[11px] font-semibold tracking-[0.18em] uppercase', on ? 'text-gold-2' : 'text-gold'].join(' ')}>{s.n}</span>
                <span className="block font-display text-2xl leading-tight mt-1">{s.title}</span>
                <span className={['hidden sm:block text-sm mt-1', on ? 'text-ivory/75' : 'text-ink-3'].join(' ')}>{s.short}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="lg:col-span-7 grid">
        {steps.map((s, i) => {
          const on = i === active
          return (
            <div
              key={s.n}
              id={`step-panel-${i}`}
              role="tabpanel"
              aria-labelledby={`step-tab-${i}`}
              aria-hidden={!on}
              className={[
                'col-start-1 row-start-1 rounded-lg bg-paper border border-line p-6 md:p-8 lg:p-10 transition-opacity duration-300',
                on ? 'opacity-100' : 'opacity-0 pointer-events-none',
              ].join(' ')}
            >
              <p className="eyebrow">Etap {s.n} · {s.time}</p>
              <h3 className="mt-2 text-3xl md:text-4xl">{s.title}</h3>
              <p className="mt-4 text-lg muted leading-relaxed">{s.text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
