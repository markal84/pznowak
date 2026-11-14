import type { Metadata } from 'next'
import ContactForm from '@/components/site/ContactForm'
import ContactMap from '@/components/site/ContactMap'
import { ContactPlanProvider, NextSteps } from '@/components/site/ContactPlan'
import NavigateLink from '@/components/site/NavigateLink'
import { consentText } from '@/lib/submissions/consent'
import { LIMITS, initialContactTopic } from '@/lib/submissions/options'
import JsonLd from '@/components/site/JsonLd'
import { pageMetadata } from '@/lib/seo'
import { SITE, openingHoursText } from '@/lib/site'
import { jewelryStoreJsonLd } from '@/lib/structured-data'

export const metadata: Metadata = pageMetadata({
  title: 'Kontakt i dojazd – Kilińskiego 12, Busko-Zdrój',
  description: `Umów wizytę w pracowni. Tel. ${SITE.phoneShort}. ${openingHoursText()}.`,
  path: '/kontakt',
})

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function ContactPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const topic = first(params.temat)
  const projectName = first(params.projekt)?.trim().slice(0, LIMITS.project)
  // Kamień wybrany na karcie pierścionka („Zamów z innym kamieniem”): wpisuje się do pola projektu, bo to pole
  // trafia do zgłoszenia i powiadomienia jako „Projekt”, więc pracownia widzi wybór bez nowej kolumny w bazie.
  const stone = first(params.kamien)?.replace(/\s+/g, ' ').trim().slice(0, 60)
  const project = projectName && stone ? `${projectName}, kamień: ${stone}`.slice(0, LIMITS.project) : projectName
  const choice = first(params.wybor)?.slice(0, 160)
  const initialTopic = initialContactTopic(topic, projectName)

  return (
    <>
      <JsonLd data={jewelryStoreJsonLd()} />
      <section className="wrap stack" style={{ paddingTop: 64, paddingBottom: 40, gap: 22 }}>
        <h1 className="h1">Umów wizytę</h1>
        <p className="lead" style={{ maxWidth: '36em' }}>
          Napisz kilka zdań, a oddzwonimy i ustalimy, jak się spotkać: w pracowni albo przez telefon. Wolisz od razu porozmawiać? Zadzwoń
          pod <a href={SITE.phoneHref} style={{ fontWeight: 500 }}>{SITE.phone}</a>.
        </p>
      </section>

      {/* Temat i forma rozmowy z formularza zmieniają „Co dalej” obok (ContactPlan.tsx); nowy adres = świeży stan. */}
      <ContactPlanProvider initialTopic={initialTopic} key={`${topic}|${project}|${choice}`}>
        <section className="wrap kontakt-layout">
          <div style={{ flex: '2 1 560px', minWidth: 0 }}>
            <ContactForm choice={choice} consentText={consentText('kontakt')} initialTopic={initialTopic} project={project} />
          </div>
          <aside className="stack" style={{ flex: '1 1 320px', minWidth: 0, gap: 36 }}>
            <div className="info-card">
              <h2>Pracownia</h2>
              <address>
                {SITE.street}
                <br />
                {SITE.city}
              </address>
              <dl className="hours">
                {SITE.hours.map((h) => (
                  <div key={h.days} style={{ display: 'contents' }}>
                    <dt>{h.days}</dt>
                    <dd>{h.time}</dd>
                  </div>
                ))}
              </dl>
              <div className="stack" style={{ gap: 6, fontSize: 16 }}>
                <a href={SITE.phoneHref} style={{ textDecoration: 'none', fontWeight: 500 }}>{SITE.phone}</a>
                <a href={`mailto:${SITE.email}`} style={{ textDecoration: 'none' }}>{SITE.email}</a>
              </div>
              <NavigateLink className="btn nav-btn">Prowadź do pracowni</NavigateLink>
            </div>
            <div className="stack" style={{ gap: 16 }}>
              <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 26, lineHeight: 1.1 }}>Co dalej</h2>
              <NextSteps />
            </div>
          </aside>
        </section>
      </ContactPlanProvider>

      <section aria-labelledby="dojazd" className="wrap stack map-section">
        <h2 id="dojazd" style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 34, lineHeight: 1.1 }}>
          Jak dojechać
        </h2>
        <p className="lead" style={{ maxWidth: '36em' }}>
          {SITE.street}, {SITE.city}. Przycisk „Prowadź do pracowni” uruchomi nawigację w aplikacji Mapy na telefonie.
        </p>
        <ContactMap />
      </section>
    </>
  )
}
