import type { Metadata } from 'next'
import GalleryClient from '@/components/GalleryClient'
import SectionTitle from '@/components/ui/SectionTitle'

export const metadata: Metadata = {
  title: 'Galeria inspiracji',
  description: 'Zdjęcia biżuterii wykonanej w pracowni Michała Nowaka. Inspiracje do własnego projektu.',
}

export default function GalleryPage() {
  return (
    <>
      <section className="pt-10 md:pt-16 pb-8 md:pb-10 border-b border-line">
        <div className="container-x">
          <SectionTitle as="h1" size="lg" eyebrow="Galeria" title="Inspiracje z pracowni" lead="Zdjęcia realizacji z ostatnich lat. Jeśli coś przyciągnie wzrok, zapisz nazwę lub zrób zrzut ekranu i pokaż nam na rozmowie." />
        </div>
      </section>
      <section className="section pt-10 md:pt-14">
        <div className="container-x">
          <GalleryClient />
        </div>
      </section>
    </>
  )
}
