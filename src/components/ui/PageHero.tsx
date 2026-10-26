import React from 'react'

interface Props {
  eyebrow: string
  title: React.ReactNode
  lead?: React.ReactNode
  children?: React.ReactNode
}

/**
 * Edytorialny nagłówek podstrony — kompensuje fixed header,
 * duży serif z lewej, opcjonalny lead.
 */
export default function PageHero({ eyebrow, title, lead, children }: Props) {
  return (
    <section className="pt-[calc(var(--header-height)+3.5rem)] pb-14 md:pt-[calc(var(--header-height)+5rem)] md:pb-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="eyebrow eyebrow--rule mb-6">{eyebrow}</div>
        <h1 className="display-title text-5xl md:text-7xl max-w-4xl">{title}</h1>
        {lead && (
          <p className="mt-6 max-w-xl text-base md:text-lg font-light leading-relaxed text-[var(--ink-soft)]">
            {lead}
          </p>
        )}
        {children}
      </div>
    </section>
  )
}
