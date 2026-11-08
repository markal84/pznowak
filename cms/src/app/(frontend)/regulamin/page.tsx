import type { Metadata } from 'next'
import LegalDocument from '@/components/site/LegalDocument'
import { REGULAMIN } from '@/content/legal'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Regulamin',
  description: 'Regulamin serwisu pznowak.pl pracowni złotniczej Michała Nowaka w Busku-Zdroju.',
  path: '/regulamin',
})

export default function RegulaminPage() {
  return <LegalDocument lines={REGULAMIN} />
}
