import type { Metadata } from 'next'
import ContactForm from '@/components/site/ContactForm'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Umów wizytę' }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export default async function ContactPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const topic = first(params.temat)
  const project = first(params.projekt)?.slice(0, 80)
  const choice = first(params.wybor)?.slice(0, 160)

  return (
    <>
      <section className="wrap stack" style={{ paddingTop: 64, paddingBottom: 40, gap: 22 }}>
        <h1 className="h1">Umów wizytę</h1>
        <p className="lead" style={{ maxWidth: '36em' }}>
          Napisz kilka zdań, a oddzwonimy i ustalimy termin rozmowy w pracowni. Wolisz od razu porozmawiać? Zadzwoń
          pod <a href={SITE.phoneHref} style={{ fontWeight: 500 }}>{SITE.phone}</a>.
        </p>
      </section>

      <section className="wrap kontakt-layout">
        <div style={{ flex: '2 1 560px', minWidth: 0 }}>
          <ContactForm choice={choice} initialTopic={topic} key={`${topic}|${project}|${choice}`} project={project} />
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
            <a className="tl" href={SITE.mapsUrl} rel="noreferrer" style={{ alignSelf: 'flex-start' }} target="_blank">
              Prowadź do pracowni
            </a>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 26, lineHeight: 1.1 }}>Co dalej</h2>
            <ol style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15.5, lineHeight: 1.55, color: 'var(--graphite-2)' }}>
              <li>Oddzwaniamy i ustalamy termin rozmowy.</li>
              <li>W pracowni oglądasz kamienie i projekty.</li>
              <li>Wycenę dostajesz, zanim cokolwiek zamówisz.</li>
            </ol>
          </div>
        </aside>
      </section>
    </>
  )
}
