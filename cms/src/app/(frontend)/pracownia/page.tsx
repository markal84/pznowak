import type { Metadata } from 'next'
import Link from 'next/link'
import { FAMILY, SITE } from '@/lib/site'
import Photo from '@/components/site/Photo'

export const metadata: Metadata = { title: 'Pracownia i historia rodziny' }

export default function StudioPage() {
  return (
    <>
      <section className="wrap" style={{ paddingTop: 72, paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 28 }}>
        <h1 className="h1" style={{ maxWidth: '13em', fontSize: 'clamp(46px, 6vw, 92px)', lineHeight: 0.98 }}>
          Od kuźni w Szańcu do stołu złotniczego w Busku
        </h1>
        <p className="lead" style={{ maxWidth: '36em' }}>
          Jesteśmy rodzinną pracownią z Buska-Zdroju. Rzemiosło przechodzi u nas z ojca na syna od {SITE.since} roku.
          Łączymy klasyczny warsztat z nowoczesnym projektowaniem i każdą rzecz robimy dla konkretnej osoby.
        </p>
      </section>

      <section aria-label="Historia rodziny" className="wrap" style={{ paddingBottom: 96 }}>
        <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
          {FAMILY.map((f, i) => (
            <li
              className="pracownia-row"
              key={f.name}
              style={{ flexDirection: i % 2 ? 'row-reverse' : 'row', justifyContent: i % 2 ? 'flex-end' : 'flex-start' }}
            >
              <figure>
                <Photo alt={f.alt} position={f.pos} sizes="(max-width: 720px) 100vw, 420px" src={f.img} />
              </figure>
              <div className="stack" style={{ flex: '1 1 420px', minWidth: 0, gap: 18 }}>
                <span className="year-big">{f.year}</span>
                <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 38, lineHeight: 1.1 }}>{f.name}</h2>
                <span style={{ fontSize: 15, color: 'var(--muted)' }}>{f.role}</span>
                <p style={{ maxWidth: '30em', fontSize: 17, lineHeight: 1.65, color: 'var(--graphite-2)' }}>{f.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="band" style={{ borderBottom: 0 }}>
        <div className="wrap" style={{ paddingTop: 96, paddingBottom: 96, display: 'flex', flexWrap: 'wrap', gap: '48px 80px', alignItems: 'center' }}>
          <div className="video-ph" role="img" aria-label="Miejsce na krótki film z pracowni" style={{ flex: '1 1 520px', minWidth: 0 }}>
            <svg aria-hidden="true" height="44" viewBox="0 0 44 44" width="44">
              <circle cx="22" cy="22" fill="none" r="20.5" stroke="#EEF0EA" strokeWidth="1.4" />
              <path d="M18 14 L30 22 L18 30 Z" fill="#EEF0EA" />
            </svg>
            [Film z pracowni, 60–90 s: Michał przy pracy]
          </div>
          <div className="stack" style={{ flex: '1 1 400px', minWidth: 0, gap: 20 }}>
            <h2 className="h2">Od Michała</h2>
            <p style={{ fontFamily: 'var(--serif)', fontSize: 23, lineHeight: 1.45 }}>
              [Kilka zdań od Michała, jego słowami: co lubi w tej pracy, czego nauczył się od ojca, na co patrzy, kiedy oprawia kamień]
            </p>
            <span style={{ fontSize: 15, color: 'var(--muted)' }}>Michał Nowak, złotnik</span>
          </div>
        </div>
      </section>

      <section className="dark">
        <div className="wrap sec stack" style={{ gap: 48 }}>
          <div className="row" style={{ gap: '20px 64px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <h2 className="h2" style={{ flex: '1 1 420px' }}>Na czym nam zależy</h2>
            <p className="text" style={{ flex: '1 1 340px', maxWidth: '30em' }}>
              Pierścionek nosi się codziennie przez lata. Dlatego wygląd to dla nas tylko połowa pracy.
            </p>
          </div>
          <ul className="cols-auto cols-260" style={{ listStyle: 'none', gap: '36px 48px' }}>
            {[
              ['Jasne informacje', 'Parametry kamieni i próby złota opisujemy wprost. Dobór materiałów jest częścią rozmowy o projekcie.'],
              ['Wygoda i trwałość', 'Sprawdzamy, czy pierścionek nie zahacza o ubrania, czy kamień siedzi pewnie i czy obrączka dobrze leży na palcu.'],
              ['Opieka po latach', 'Czyścimy, sprawdzamy oprawę i odświeżamy biżuterię, którą u nas zrobiono. Także tę sprzed kilkudziesięciu lat.'],
            ].map(([t, p]) => (
              <li className="item-rule" key={t} style={{ paddingTop: 20 }}>
                <h3 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: 26, lineHeight: 1.15, color: '#f6f5ef' }}>{t}</h3>
                <p style={{ fontSize: 15.5, lineHeight: 1.6 }}>{p}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 104, paddingBottom: 120, display: 'flex', flexWrap: 'wrap', gap: '48px 80px', alignItems: 'center' }}>
        <div className="stack" style={{ flex: '1 1 420px', minWidth: 0, gap: 22 }}>
          <h2 className="h2">Odwiedź pracownię</h2>
          <p className="text" style={{ maxWidth: '30em' }}>
            Pracownia mieści się przy ulicy {SITE.street} w Busku-Zdroju. Na rozmowę o projekcie umów się wcześniej, wtedy mamy dla Ciebie czas i kamienie do obejrzenia.
          </p>
          <p className="text" style={{ maxWidth: '30em' }}>
            Przy pracowni działa sklep z gotową biżuterią: kolczykami, wisiorkami i innymi [asortyment do potwierdzenia].
          </p>
          <dl className="hours" style={{ fontSize: 16 }}>
            {SITE.hours.map((h) => (
              <div key={h.days} style={{ display: 'contents' }}>
                <dt>{h.days}</dt>
                <dd>{h.time}</dd>
              </div>
            ))}
            <dt>Telefon</dt>
            <dd>
              <a href={SITE.phoneHref} style={{ textDecoration: 'none' }}>{SITE.phone}</a>
            </dd>
          </dl>
          <div className="row gap-14-28">
            <Link className="btn" href="/kontakt">Umów wizytę</Link>
            <a className="tl" href={SITE.mapsUrl} rel="noreferrer" target="_blank">Prowadź do pracowni</a>
          </div>
        </div>
        <div aria-label="Miejsce na mapę dojazdu do pracowni" className="map-ph" role="img" style={{ flex: '1 1 520px', minWidth: 0 }}>
          [Mapa Google: Kilińskiego 12, Busko-Zdrój]
        </div>
      </section>
    </>
  )
}
