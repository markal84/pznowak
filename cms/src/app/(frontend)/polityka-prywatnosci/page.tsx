import type { Metadata } from 'next'
import LegalDocument from '@/components/site/LegalDocument'
import { POLITYKA_PRYWATNOSCI } from '@/content/legal'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Polityka prywatności',
  description: 'Jak pracownia Michała Nowaka przetwarza dane osobowe osób, które piszą przez pznowak.pl.',
  path: '/polityka-prywatnosci',
})

export default function PolitykaPrywatnosciPage() {
  return <LegalDocument lines={POLITYKA_PRYWATNOSCI} />
}
