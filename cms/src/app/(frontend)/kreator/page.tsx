import type { Metadata } from 'next'
import RingCreator from '@/components/site/RingCreator'

export const metadata: Metadata = {
  title: 'Zaprojektuj pierścionek',
  description: 'Sześć kroków i kilka minut: wybierz kamień, szlif, oprawę i złoto, a my przygotujemy szkic do rozmowy.',
}

export default function CreatorPage() {
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
