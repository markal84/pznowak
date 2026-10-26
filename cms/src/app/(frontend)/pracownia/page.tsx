import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'
import Link from 'next/link'
import { FAMILY, SITE } from '@/lib/site'
import ContactMap from '@/components/site/ContactMap'
import DoUzupelnienia from '@/components/site/DoUzupelnienia'
import Icon, { type IconName } from '@/components/site/Icon'
import Photo from '@/components/site/Photo'
import SectionIntro from '@/components/site/SectionIntro'

export const metadata: Metadata = pageMetadata({
  title: 'Pracownia i historia rodziny Nowaków od 1890',
  description: 'Cztery pokolenia złotników: od kuźni w Szańcu do stołu złotniczego w Busku-Zdroju.',
  path: '/pracownia',
})

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

      <section aria-label="Historia rodziny" className="wrap" style={{ paddingBottom: 88 }}>
        <ol className="chrono" data-reveal="">
          {FAMILY.map((f) => (
            <li className="chrono-item" key={f.name}>
              <span className="chrono-year">{f.year}</span>
              <Photo alt={f.alt} position={f.pos} sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 25vw" src={f.img} />
              <div className="chrono-body">
                <h2>{f.name}</h2>
                <span className="chrono-role">{f.role}</span>
                <p>{f.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <DoUzupelnienia as="div">
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
      </DoUzupelnienia>

      <section className="dark">
        <div className="wrap sec stack" style={{ gap: 48 }}>
          <SectionIntro
            intro="Pierścionek nosi się codziennie przez lata. Dlatego wygląd to dla nas tylko połowa pracy."
            title="Na czym nam zależy"
          />
          <ul className="cols-auto cols-260" data-reveal="" style={{ listStyle: 'none', gap: '36px 48px' }}>
            {(
              [
                ['karta', 'Jasne informacje', 'Parametry kamieni i próby złota opisujemy wprost. Dobór materiałów jest częścią rozmowy o projekcie.'],
                ['oprawa', 'Wygoda i trwałość', 'Sprawdzamy, czy pierścionek nie zahacza o ubrania, czy kamień siedzi pewnie i czy obrączka dobrze leży na palcu.'],
                ['renowacja', 'Opieka po latach', 'Czyścimy, sprawdzamy oprawę i odświeżamy biżuterię, którą u nas zrobiono. Także tę sprzed kilkudziesięciu lat.'],
              ] as [IconName, string, string][]
            ).map(([icon, t, p]) => (
              <li className="item-rule ic-host" key={t} style={{ paddingTop: 20 }}>
                <Icon name={icon} size={40} />
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
            Przy pracowni działa sklep z gotową biżuterią
            <DoUzupelnienia fallback=".">: kolczykami, wisiorkami i innymi [asortyment do potwierdzenia].</DoUzupelnienia>
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
        <div style={{ flex: '1 1 520px', minWidth: 0 }}>
          <ContactMap />
        </div>
      </section>
    </>
  )
}
