import GalleryClient from '@/components/GalleryClient'
import { getGallery } from '@/lib/collection'

export const dynamic = 'force-dynamic'

export default async function GalleryPage() {
  const gallery = await getGallery()
  return <GalleryClient gallery={gallery} />
}