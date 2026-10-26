import React from 'react'
import Image from 'next/image'
import RootsTimeline from '@/components/RootsTimeline'
import { getPageBySlug } from '@/lib/wordpress'
import Container from '@/components/ui/Container'
import SectionTitle from '@/components/ui/SectionTitle'
import StudioGrid from '@/components/StudioGrid'
import AboutValuesCards from '@/components/AboutValuesCards'

const AboutPage = async () => {
  const page = await getPageBySlug('o-nas')

  const html = page?.content?.rendered || ''

  // Helper: extract first paragraph from HTML as lead (very simple fallback)
  const leadMatch = html.match(/<p>(.*?)<\/p>/i)
  const lead = leadMatch ? leadMatch[1] : ''

  return (
    <>
      {/* Hero noir z obrazem pracowni */}
      <section className="on-noir relative overflow-hidden">
        <Image src="/about-us-workshop.png" alt="" fill sizes="100vw" className="object-cover opacity-40" priority />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(20,17,12,0.92) 0%, rgba(20,17,12,0.5) 60%, rgba(20,17,12,0.2) 100%), linear-gradient(to top, rgba(20,17,12,0.9) 0%, transparent 45%)',
          }}
        />
        <Container max="7xl" className="relative z-10 !px-6 lg:!px-10 pt-[calc(var(--header-height)+4rem)] pb-16 md:pt-[calc(var(--header-height)+6rem)] md:pb-24">
          <div className="eyebrow eyebrow--rule mb-6 !text-[var(--gold-soft)]">O pracowni</div>
          <h1 className="display-title text-5xl md:text-7xl max-w-3xl" dangerouslySetInnerHTML={{ __html: page?.title.rendered || 'O nas' }} />
          {lead && (
            <p className="mt-7 text-base md:text-lg font-light leading-relaxed text-[var(--cream-dim)] max-w-xl">{lead}</p>
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

      {/* Wartości – karty z treści WP (intro/mission/craft) */}
      <section className="py-[var(--space-section-sm)] md:py-[var(--space-section-md)]">
        <Container max="7xl">
          <SectionTitle eyebrow="Wartości" title="Co jest dla nas ważne" size="sm" className="mb-6" />
          <AboutValuesCards html={html} />
        </Container>
      </section>
    </>
  )
}

export default AboutPage 
