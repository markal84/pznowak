'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'

interface Props {
  html: string
}

/**
 * Renders content sections extracted from WordPress by anchors.
 * Authoring guidance in WP:
 * - Use Group blocks with HTML anchor ids: about-intro, about-mission, about-craft
 *   (Block → Advanced → HTML anchor)
 * - Or wrap content in a block with id="about-intro" (e.g. Custom HTML block)
 *
 * If none of the anchors are found, renders the full HTML as fallback.
 */
export default function AboutSections({ html }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [intro, setIntro] = useState<string>('')
  const [mission, setMission] = useState<string>('')
  const [craft, setCraft] = useState<string>('')

  // Mount hidden container with raw HTML and pick only desired anchored sections
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    // Clear previous
    el.innerHTML = ''
    // Create sandbox to parse
    const tmp = document.createElement('div')
    tmp.innerHTML = html || ''

    const pick = (id: string) => {
      const node = tmp.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
      return node ? node.innerHTML.trim() : ''
    }

    const i = pick('about-intro')
    const m = pick('about-mission')
    const c = pick('about-craft')
    setIntro(i)
    setMission(m)
    setCraft(c)

    // no need to attach tmp to DOM
  }, [html])

  const hasAny = useMemo(() => !!(intro || mission || craft), [intro, mission, craft])

  if (!html) {
    return (
      <p className="text-gray-600 dark:text-gray-300">
        Dodaj treść na stronie "O nas" w WordPress lub użyj sekcji z kotwicami (about-intro, about-mission, about-craft).
      </p>
    )
  }

  return (
    <div>
      {/* hidden container used only for parsing */}
      <div ref={containerRef} style={{ display: 'none' }} aria-hidden />

      {hasAny ? (
        <>
          {intro && <Condensed html={intro} />}
          {mission && <Condensed html={mission} />}
          {craft && <Condensed html={craft} />}
        </>
      ) : (
        <div className="prose prose-lg dark:prose-invert max-w-prose" dangerouslySetInnerHTML={{ __html: html }} />
      )}
    </div>
  )
}

function Condensed({ html }: { html: string }) {
  const [open, setOpen] = useState(false)
  const firstPara = useMemo(() => {
    const m = html.match(/<p>([\s\S]*?)<\/p>/i)
    return m ? m[0] : ''
  }, [html])
  return (
    <section className="mb-8">
      <div className="prose prose-lg dark:prose-invert max-w-prose" dangerouslySetInnerHTML={{ __html: open ? html : firstPara }} />
      {!open && html !== firstPara && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 text-sm text-gray-700 dark:text-gray-300 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/60 rounded"
        >
          Czytaj więcej
        </button>
      )}
    </section>
  )
}
