import type { Metadata } from 'next'
import Link from 'next/link'
import GuideCards from '@/components/site/GuideCards'
import JsonLd from '@/components/site/JsonLd'
import SectionIntro from '@/components/site/SectionIntro'
import { GUIDES_PATH, getGuides, guidePath } from '@/lib/guides'
import { getPageTexts } from '@/lib/page-texts'
import { pageMetadata } from '@/lib/seo'
import { SITE } from '@/lib/site'
import { breadcrumbJsonLd, itemListJsonLd } from '@/lib/structured-data'

// Lista i teksty z panelu (Poradniki oraz Teksty stron → Poradniki).
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const { guides: texts } = await getPageTexts()
  return pageMetadata({ title: texts.metaTitle, description: texts.metaDescription, path: GUIDES_PATH })
}

export default async function GuidesPage() {
  const [guides, { guides: texts }] = await Promise.all([getGuides(), getPageTexts()])
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Poradniki', path: GUIDES_PATH }])} />
      <JsonLd data={itemListJsonLd(guides.map((g) => ({ name: g.title, path: guidePath(g.slug) })))} />
      <section className="wrap" style={{ paddingTop: 64, paddingBottom: 48 }}>
        <SectionIntro as="h1" intro={texts.intro} title={texts.title} />
      </section>
      <section className="wrap" style={{ paddingBottom: 104 }}>
        <GuideCards guides={guides} heading="h2" />
      </section>
      <section className="band">
        <div className="wrap sec-tight" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px 64px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="stack" style={{ gap: 12, flex: '1 1 480px', minWidth: 0 }}>
            <h2 className="h2 h2-md">Nie ma tu Twojego pytania?</h2>
            <p className="text" style={{ maxWidth: '34em' }}>
              Zapytaj wprost. Odpowiada złotnik, który wykona Twój pierścionek.
            </p>
          </div>
          <div className="row gap-14-28">
            <Link className="btn" href="/kontakt">
              Napisz do pracowni
            </Link>
            <a className="tl" href={SITE.phoneHref}>
              Zadzwoń: {SITE.phoneShort}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
