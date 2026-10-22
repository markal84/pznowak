import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import RingCreator from '@/components/site/RingCreator'
import { RING_CREATOR_ENABLED } from '@/lib/site'

// Wyłączony kreator nie ma strony (404), a nie przekierowania: 308 zapamiętują przeglądarki, więc po ponownym
// włączeniu kreatora część osób dalej trafiałaby na formularz kontaktowy.
export function generateMetadata(): Metadata {
  // Narzędzie schowane zleceniem A: nawet po ponownym włączeniu nie trafia do wyszukiwarki ani do mapy strony.
  const robots = { index: false, follow: false }
  if (!RING_CREATOR_ENABLED) return { robots }
  return {
    robots,
    title: 'Zaprojektuj pierścionek',
    description: 'Sześć kroków i kilka minut: wybierz kamień, szlif, oprawę i złoto, a my przygotujemy szkic do rozmowy.',
  }
}

export default function CreatorPage() {
  if (!RING_CREATOR_ENABLED) notFound()
  return (
    <>
      <section className="wrap" style={{ paddingTop: 48, paddingBottom: 28, display: 'flex', flexWrap: 'wrap', gap: '16px 72px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <h1 className="h1" style={{ flex: '1 1 460px', fontSize: 'clamp(42px, 5vw, 72px)' }}>Zaprojektuj pierścionek</h1>
        <p className="text" style={{ flex: '1 1 380px', maxWidth: '32em', fontSize: 16.5 }}>
          Sześć kroków, kilka minut. To szkic do rozmowy, a nie zamówienie: na spotkaniu dopracujemy proporcje,
          pokażemy kamienie na żywo i podamy cenę.
        </p>
      </section>
      <RingCreator />
    </>
  )
}
