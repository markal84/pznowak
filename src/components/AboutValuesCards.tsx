'use client'
import React, { useEffect, useState } from 'react'
import { FaUser, FaBullseye, FaHammer } from 'react-icons/fa'

interface Props { html: string }
interface CardData { id: string; title: string; snippetHtml: string; fullHtml: string; icon: 'user' | 'target' | 'hammer' }

const iconMap = {
  user: <FaUser className="h-5 w-5" />,
  target: <FaBullseye className="h-5 w-5" />,
  hammer: <FaHammer className="h-5 w-5" />,
}

export default function AboutValuesCards({ html }: Props) {
  const [cards, setCards] = useState<CardData[]>([])

  useEffect(() => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html || ''
    const pick = (id: string) => tmp.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
    const sections: Array<{ id: string; fallback: string; icon: CardData['icon'] }> = [
      { id: 'about-intro', fallback: 'Kim jesteśmy', icon: 'user' },
      { id: 'about-mission', fallback: 'Misja', icon: 'target' },
      { id: 'about-craft', fallback: 'Rzemiosło', icon: 'hammer' },
    ]
    setCards(
      sections
        .map((s) => ({ ...s, el: pick(s.id) }))
        .filter((s) => !!s.el)
        .map((s) => {
          const heading = s.el!.querySelector('h1, h2, h3, h4, h5, h6')
          const p = s.el!.querySelector('p')
          return { id: s.id, title: heading?.textContent?.trim() || s.fallback, snippetHtml: p ? p.outerHTML : '', fullHtml: s.el!.innerHTML.trim(), icon: s.icon }
        }),
    )
  }, [html])

  if (!cards.length) return null

  return (
    <ul className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
      {cards.map((c, i) => <Card key={c.id} data={c} index={i} />)}
    </ul>
  )
}

function Card({ data, index }: { data: CardData; index: number }) {
  const [open, setOpen] = useState(false)
  const hasMore = data.fullHtml !== data.snippetHtml
  return (
    <li className="reveal rounded-lg bg-paper border border-line p-6 md:p-8" data-delay={String(index)}>
      <span className="h-12 w-12 rounded-full bg-gold-soft text-gold flex items-center justify-center" aria-hidden>{iconMap[data.icon]}</span>
      <h3 className="mt-5 text-2xl">{data.title}</h3>
      <div className="mt-2 prose-brand prose-p:my-2 prose-headings:hidden" dangerouslySetInnerHTML={{ __html: open ? data.fullHtml : data.snippetHtml }} />
      {hasMore && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="mt-3 text-sm font-semibold text-gold hover:underline underline-offset-4">
          {open ? 'Zwiń' : 'Czytaj więcej'}
        </button>
      )}
    </li>
  )
}
