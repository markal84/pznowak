import type { Metadata } from 'next'
import GalleryClient from '@/components/GalleryClient'
import { getGallery } from '@/lib/collection'

export const metadata: Metadata = {
  title: 'Galeria biżuterii',
  description:
    'Zobacz pierścionki i biżuterię tworzone w pracowni Michała Nowaka. Przyjrzyj się detalom na zdjęciach.',
}
export const dynamic = 'force-dynamic'

export default async function GalleryPage() {
  const gallery = await getGallery()
  return <GalleryClient gallery={gallery} />
}
