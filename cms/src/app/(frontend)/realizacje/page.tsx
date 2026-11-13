import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { getWorks } from '@/lib/collection'
import { getGoogleReviews } from '@/lib/google-reviews-source'
import GoogleReviews from '@/components/site/GoogleReviews'
import SectionIntro from '@/components/site/SectionIntro'
import WorksBrowser from '@/components/site/WorksBrowser'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = pageMetadata({
  title: 'Realizacje: pierścionki i biżuteria na zamówienie',
  description: 'Biżuteria zrobiona dla konkretnych osób i krótko, jak powstała. Pracownia w Busku-Zdroju.',
  path: '/realizacje',
})

type WorksPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function WorksPage({ searchParams }: WorksPageProps) {
  const [works, reviews] = await Promise.all([getWorks(), getGoogleReviews()])
  const { r } = await searchParams
  const initialSlug = Array.isArray(r) ? r[0] : r

  return (
    <>
      <section className="wrap" style={{ paddingTop: 64, paddingBottom: 40 }}>
        <SectionIntro
          as="h1"
          intro="Biżuteria zrobiona dla konkretnych osób – i krótko, jak powstała."
          action={<Link className="tl" href="/naprawy">Naprawy i przeróbki →</Link>}
          title="Realizacje"
        />
      </section>

      <WorksBrowser initialSlug={initialSlug ?? null} works={works} />

      <GoogleReviews config={reviews} title="Opinie klientów" />

      <section className="dark">
        <div className="wrap" style={{ paddingTop: 80, paddingBottom: 80, display: 'flex', flexWrap: 'wrap', gap: '24px 64px', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="h2 h2-md" style={{ flex: '1 1 480px', fontSize: 'clamp(32px, 3.4vw, 48px)' }}>
            Twoja biżuteria może być następna na tej stronie
          </h2>
          <div className="row gap-14-28">
            <Link className="btn btn-light" href="/kontakt">Umów wizytę</Link>
            <Link className="tl tl-light" href="/na-zamowienie">Jak pracujemy na zamówienie</Link>
          </div>
        </div>
      </section>
    </>
  )
}
