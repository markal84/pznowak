import GalleryClient from '@/components/GalleryClient'
import PageHero from '@/components/ui/PageHero'

export const metadata = {
  title: 'Galeria',
  description: 'Galeria realizacji pracowni złotniczej Michała Nowaka — inspiracje dla Twojego projektu biżuterii.',
}

export default function GalleryPage() {
  return (
    <>
      <PageHero
        eyebrow="Galeria inspiracji"
        title={<>Realizacje, które <em>już mają właścicieli.</em></>}
        lead="Zobacz przykłady naszych prac i znajdź punkt wyjścia dla własnego projektu."
      />
      <GalleryClient />
    </>
  )
}
