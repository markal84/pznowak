import React from 'react'
import Image from 'next/image'
import RootsTimeline from '@/components/RootsTimeline'
import { getPageBySlug, getGlobalOptions } from '@/lib/wordpress'
import AboutSections from '@/components/AboutSections'
import Container from '@/components/ui/Container'
import SectionTitle from '@/components/ui/SectionTitle'
import StudioGrid from '@/components/StudioGrid'

const AboutPage = async () => {
  const [page, globalOptions] = await Promise.all([
    getPageBySlug('o-nas'),
    getGlobalOptions(),
  ])

  const html = page?.content?.rendered || ''

  // Helper: extract first paragraph from HTML as lead (very simple fallback)
  const leadMatch = html.match(/<p>(.*?)<\/p>/i)
  const lead = leadMatch ? leadMatch[1] : ''

  return (
    <>
      {/* Hero with feature image and left-aligned copy */}
      <section className="relative min-h-[360px] md:min-h-[440px] overflow-hidden">
        <Image src="/about-us-workshop.png" alt="Pracownia złotnicza – warsztat" fill sizes="100vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-black/10 dark:from-black/50 dark:to-black/20" />
        <Container max="7xl" className="relative z-10 py-[var(--space-section-sm)] md:py-[var(--space-section-md)]">
          <h1 className="text-3xl md:text-4xl font-serif font-light mb-6 md:mb-8 text-white" dangerouslySetInnerHTML={{ __html: page?.title.rendered || 'O nas' }} />
          {lead && (
            <p className="text-base md:text-lg leading-relaxed text-white/90 max-w-prose">{lead}</p>
          )}
        </Container>
      </section>

      {/* Studio / Proces */}
      <section className="py-[var(--space-section-sm)] md:py-[var(--space-section-md)]">
        <Container max="7xl">
          <SectionTitle eyebrow="Studio / Proces" title="Jak pracujemy" size="sm" className="mb-3" />
          <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed max-w-prose mb-6">
            Od pierwszego szkicu po końcowe polerowanie – pracujemy ręcznie, z wyczuciem proporcji i materiału. Każdy detal ma znaczenie.
          </p>
          <StudioGrid />
        </Container>
      </section>

      {/* Nasze korzenie (timeline) */}
      <section className="py-[var(--space-section-sm)] md:py-[var(--space-section-md)] border-t" style={{ borderColor: 'var(--color-divider)' }}>
        <Container max="7xl">
          <RootsTimeline />
        </Container>
      </section>

      {/* Sekcje z WP (anchor-based) */}
      <section className="py-[var(--space-section-sm)] md:py-[var(--space-section-md)]">
        <Container max="7xl">
          <AboutSections html={html} />
        </Container>
      </section>
    </>
  )
}

export default AboutPage 
