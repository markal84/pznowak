"use client"
import React, { useEffect, useState } from 'react'
import { FaUser, FaBullseye, FaHammer } from 'react-icons/fa'

interface Props { html: string }

interface CardData {
  id: string
  title: string
  snippetHtml: string
  fullHtml: string
  icon: 'user' | 'target' | 'hammer'
}

const iconMap = {
  user: <FaUser className="h-6 w-6" />,
  target: <FaBullseye className="h-6 w-6" />,
  hammer: <FaHammer className="h-6 w-6" />,
}

export default function AboutValuesCards({ html }: Props) {
  const [cards, setCards] = useState<CardData[]>([])

  useEffect(() => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html || ''

    const pickSection = (id: string) => tmp.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
    const sections: Array<{ id: string; el: HTMLElement | null; fallback: string; icon: CardData['icon'] }> = [
      { id: 'about-intro', fallback: 'Kim jesteśmy', el: pickSection('about-intro'), icon: 'user' },
      { id: 'about-mission', fallback: 'Misja', el: pickSection('about-mission'), icon: 'target' },
      { id: 'about-craft', fallback: 'Rzemiosło', el: pickSection('about-craft'), icon: 'hammer' },
    ]

    const toCards: CardData[] = sections
      .filter(s => !!s.el)
      .map(s => {
        const fullHtml = s.el!.innerHTML.trim()
        // title: first h2/h3/h4 text or fallback
        const heading = s.el!.querySelector('h1, h2, h3, h4, h5, h6')
        const title = heading?.textContent?.trim() || s.fallback
        // snippet: first paragraph HTML
        const p = s.el!.querySelector('p')
        const snippetHtml = p ? p.outerHTML : ''
        return { id: s.id, title, snippetHtml, fullHtml, icon: s.icon }
      })

    setCards(toCards)
  }, [html])

  if (!cards.length) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map(card => (
        <Card key={card.id} data={card} />
      ))}
    </div>
  )
}

function Card({ data }: { data: CardData }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="p-6 rounded-[8px] shadow-sm bg-[--color-surface] transition ease-[var(--ease-standard)] duration-200 hover:shadow-md hover:-translate-y-0.5 motion-reduce:transform-none text-center">
      <div className="h-12 w-12 rounded-full bg-[color:var(--color-brand-gold-light)] text-brand-gold flex items-center justify-center mx-auto mb-4">
        {iconMap[data.icon]}
      </div>
      <h3 className="font-display text-lg md:text-xl text-gray-900 dark:text-white mb-2">{data.title}</h3>
      <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 mx-auto">
        <div dangerouslySetInnerHTML={{ __html: open ? data.fullHtml : data.snippetHtml }} />
      </div>
      {!open && data.fullHtml !== data.snippetHtml && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 text-sm text-gray-800 dark:text-gray-200 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded"
        >
          Czytaj więcej
        </button>
      )}
    </article>
  )
}
