import React from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import RootsTimeline from '@/components/RootsTimeline'
import { getPageBySlug } from '@/lib/wordpress'
import StudioGrid from '@/components/StudioGrid'
import AboutValuesCards from '@/components/AboutValuesCards'
import SectionTitle from '@/components/ui/SectionTitle'
import Button from '@/components/Button'

export const metadata: Metadata = {
  title: 'O pracowni',
  description: 'Rodzinna pracownia złotnicza w Busku-Zdroju. Cztery pokolenia, jedna tradycja ręcznego wykonania biżuterii.',
}

const AboutPage = async () => {
  const page = await getPageBySlug('o-nas')
  const html = page?.content?.rendered || ''
  const leadMatch = html.match(/<p>(.*?)<\/p>/i)
  const lead = leadMatch ? leadMatch[1].replace(/<[^>]+>/g, '') : 'Jesteśmy rodzinną pracownią złotniczą z Buska-Zdroju. Od czterech pokoleń wykonujemy biżuterię ręcznie, według indywidualnych projektów.'

  return (
    <>
      <section className="relative section-dark overflow-hidden">
        <Image src="/atelier-workshop-v2.png" alt="" fill priority sizes="100vw" className="object-cover opacity-35" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-graphite via-graphite/70 to-graphite/30" />
        <div className="container-x relative pt-14 md:pt-24 pb-14 md:pb-24 max-w-3xl">
          <p className="eyebrow reveal is-visible">O pracowni</p>
          <h1 className="mt-3 text-[2.6rem] md:text-[3.8rem] text-[#f6f2ea] reveal is-visible" data-delay="1">Cztery pokolenia. Jedna miara dokładności.</h1>
          <p className="mt-6 text-lg md:text-xl muted leading-relaxed reveal is-visible" data-delay="2">{lead}</p>
        </div>
      </section>

      <section className="section">
        <div className="container-x">
          <SectionTitle eyebrow="Warsztat" title="Jak pracujemy" lead="Od pierwszego szkicu po końcowe polerowanie pracujemy ręcznie, z wyczuciem proporcji i materiału. Każdy detal ma znaczenie, bo pierścionek ma służyć dłużej niż my." />
          <div className="mt-10 md:mt-14"><StudioGrid /></div>
        </div>
      </section>

      <section className="section bg-ivory-2">
        <div className="container-x">
          <RootsTimeline />
        </div>
      </section>

      <section className="section">
        <div className="container-x">
          <SectionTitle eyebrow="Wartości" title="Co jest dla nas ważne" />
          <div className="mt-10"><AboutValuesCards html={html} /></div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container-x">
          <div className="rounded-lg section-dark p-8 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center reveal">
            <div className="lg:col-span-8">
              <p className="eyebrow">Zapraszamy do pracowni</p>
              <h2 className="mt-2 text-[1.9rem] md:text-[2.4rem]">Najlepiej porozmawiać przy stole złotniczym</h2>
              <p className="mt-3 muted text-lg">Busko-Zdrój, ul. Kilińskiego 12. Warto zadzwonić wcześniej, żebyśmy mieli dla Ciebie czas.</p>
            </div>
            <div className="lg:col-span-4 flex lg:justify-end">
              <Button as="link" href="/kontakt" variant="light" size="lg">Kontakt i dojazd</Button>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default AboutPage
