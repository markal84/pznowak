'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { pickSelectedWork, type PublicWork, type WorkKind } from '@/lib/works'
import Photo from './Photo'
import Tag from './Tag'

export type Work = PublicWork

type KindFilter = 'all' | WorkKind

const KINDS: { id: KindFilter; label: string }[] = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'zamowienie', label: 'Na zamówienie' },
  { id: 'przerobka', label: 'Przeróbki' },
]

type WorksBrowserProps = {
  works: Work[]
  /** Realizacja z adresu `?r=` rozstrzygnięta na serwerze; klient bierze adres z przeglądarki, ta wartość tylko gdy go nie ma. */
  initialSlug?: string | null
  /** Podgląd i lokalnie: teksty „do potwierdzenia” mają żółtą ramkę (`showPlaceholders()` liczy serwer, klient nie zna `SITE_ENV`). */
  markUnconfirmed?: boolean
}

/**
 * Strona „Realizacje”: górne okno z wybraną historią i kafelki pod spodem. Kliknięcie kafelka podmienia okno bez
 * przeładowania, wpisuje `?r=slug` do adresu (nowy wpis w historii przeglądarki) i na telefonie przewija do okna.
 * Bez JS kafelek to zwykły link na `/realizacje?r=slug`, który serwer renderuje od razu z wybraną historią.
 */
export default function WorksBrowser({ works, initialSlug = null, markUnconfirmed = false }: WorksBrowserProps) {
  const searchParams = useSearchParams()
  const urlSlug = searchParams ? searchParams.get('r') : initialSlug
  const selected = pickSelectedWork(works, urlSlug)
  const [kind, setKind] = useState<KindFilter>('all')
  const windowRef = useRef<HTMLElement>(null)

  if (!selected) {
    return (
      <section className="wrap" style={{ paddingBottom: 96 }}>
        <div className="work-empty">
          <p>Pierwsze historie dodajemy wkrótce. Tymczasem zobacz gotowe pierścionki albo opisz, co chcesz zamówić.</p>
          <div className="row gap-14-28">
            <Link className="btn" href="/pierscionki">Pierścionki w katalogu</Link>
            <Link className="tl" href="/kontakt?temat=nowy">Opisz swój pomysł</Link>
          </div>
        </div>
      </section>
    )
  }

  const tiles = works.filter((w) => kind === 'all' || w.kind === kind)

  /** Płynnie do okna, ale tylko gdy nie widać go w większości (telefon); `scroll-margin-top` omija przyklejony nagłówek. */
  function bringWindowIntoView() {
    const el = windowRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const visible = Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0)
    if (visible >= Math.min(rect.height, innerHeight) * 0.6 && rect.top >= 0) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  function choose(event: MouseEvent<HTMLAnchorElement>, work: Work) {
    // Ctrl/Cmd/Shift/środkowy przycisk: przeglądarka otwiera link po swojemu (nowa karta).
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (work.slug !== selected?.slug) window.history.pushState(null, '', `?r=${encodeURIComponent(work.slug)}`)
    requestAnimationFrame(bringWindowIntoView)
  }

  return (
    <>
      <section aria-label="Wybrana realizacja" className="wrap work-stage" ref={windowRef}>
        <WorkWindow key={selected.slug} markUnconfirmed={markUnconfirmed} work={selected} />
        <p aria-live="polite" className="visually-hidden" role="status">
          {`Realizacja: ${selected.title}`}
        </p>
      </section>

      <section aria-label="Wszystkie realizacje" className="wrap stack" style={{ paddingBottom: 104, gap: 28 }}>
        <div aria-label="Rodzaj realizacji" className="row" role="group" style={{ gap: 10, borderTop: '1px solid var(--line)', paddingTop: 24 }}>
          {KINDS.map((c) => (
            <button aria-pressed={c.id === kind} className="chip" key={c.id} onClick={() => setKind(c.id)} type="button">
              {c.label}
            </button>
          ))}
        </div>
        {tiles.length > 0 ? (
          <ul className="work-grid">
            {tiles.map((w) => {
              const current = w.slug === selected.slug
              return (
                <li className="work-card" key={w.slug}>
                  <a
                    aria-current={current ? 'true' : undefined}
                    className="work-tile stack"
                    href={`/realizacje?r=${encodeURIComponent(w.slug)}`}
                    onClick={(event) => choose(event, w)}
                  >
                    <span className="card-overlay">
                      <Photo alt={w.photos[0].alt} ratio="11" sizes="(max-width: 720px) 50vw, 300px" src={w.photos[0].src} />
                      <Tag className="tag-corner" name={w.kindLabel} />
                    </span>
                    <h3>{w.title}</h3>
                  </a>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="work-none">Nie mamy jeszcze takich realizacji na stronie. Wybierz „Wszystkie”.</p>
        )}
      </section>
    </>
  )
}

type Slide =
  | { kind: 'photo'; src: string; alt: string; width: number | null; height: number | null }
  | { kind: 'video'; src: string; caption: string; poster: string | null }

function WorkWindow({ work, markUnconfirmed }: { work: Work; markUnconfirmed: boolean }) {
  const [index, setIndex] = useState(0)
  // Zdjęcia, potem filmy. Po zmianie realizacji komponent powstaje od nowa (key), więc `index` zawsze zaczyna od okładki.
  const slides: Slide[] = [
    ...work.photos.map((p): Slide => ({ kind: 'photo', ...p })),
    ...work.videos.map((v): Slide => ({ kind: 'video', ...v })),
  ]
  const slide = slides[Math.min(index, slides.length - 1)]
  // Zdjęcie „pionowe” wypełnia ramkę, „poziome” mieści się w całości na rozmytym tle z tego samego zdjęcia.
  const fit = slide.kind === 'photo' && slide.width && slide.height && slide.width > slide.height ? 'contain' : 'cover'
  const meta = [work.kindLabel, work.year ? String(work.year) : null].filter(Boolean).join(', ')
  const mark = markUnconfirmed && work.needsConfirmation

  const rows = (
    <dl className="dl-stack">
      {work.task ? <div><dt>Zadanie</dt><dd>{work.task}</dd></div> : null}
      {work.whatWeDid ? <div><dt>Co zrobiliśmy</dt><dd>{work.whatWeDid}</dd></div> : null}
      {work.duration ? (
        <div><dt>Czas</dt><dd>{work.duration}</dd></div>
      ) : mark ? (
        <div><dt>Czas</dt><dd><span className="todo" data-todo="">[czas do uzupełnienia]</span></dd></div>
      ) : null}
    </dl>
  )

  return (
    <article className="feature work-window">
      <div className="work-gallery">
        <div className="work-frame" data-fit={fit}>
          {slide.kind === 'video' ? (
            <video
              aria-label={`Film: ${slide.caption}`}
              className="work-video"
              controls
              key={slide.src}
              playsInline
              poster={slide.poster ?? undefined}
              preload="metadata"
              src={slide.src}
            />
          ) : (
            <>
              {fit === 'contain' ? <Image alt="" aria-hidden className="work-backdrop" fill sizes="96px" src={slide.src} /> : null}
              <Image alt={slide.alt} className="work-main" fill priority sizes="(max-width: 960px) 100vw, 640px" src={slide.src} />
            </>
          )}
        </div>
        {slide.kind === 'video' ? <p className="work-video-caption">{slide.caption}</p> : null}
        {slides.length > 1 ? (
          <ul aria-label="Zdjęcia i filmy tej realizacji" className="work-thumbs">
            {slides.map((p, i) => (
              <li key={p.src}>
                <button
                  aria-current={i === index ? 'true' : undefined}
                  aria-label={p.kind === 'video' ? `Film: ${p.caption}` : `Zdjęcie ${i + 1} z ${work.photos.length}`}
                  className="work-thumb"
                  data-video={p.kind === 'video' ? '' : undefined}
                  onClick={() => setIndex(i)}
                  type="button"
                >
                  {p.kind === 'video' ? (
                    p.poster ? <Image alt="" fill sizes="72px" src={p.poster} /> : null
                  ) : (
                    <Image alt="" fill sizes="72px" src={p.src} />
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="feature-copy">
        <span style={{ fontSize: 14, color: 'var(--muted)' }}>{meta}</span>
        <h2 className="h2 h2-md" style={{ fontSize: 'clamp(30px, 3vw, 44px)' }}>{work.title}</h2>
        {mark ? <div className="todo todo-block" data-todo="">{rows}</div> : rows}
        <div className="row gap-14-28 work-actions">
          <Link className="btn" href="/kontakt?temat=nowy">{work.ctaLabel}</Link>
          {work.product ? <Link className="tl" href={`/pierscionki/${work.product.slug}`}>Zobacz w katalogu</Link> : null}
        </div>
      </div>
    </article>
  )
}
