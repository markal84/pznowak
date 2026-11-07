'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'

const SRC = '/filmy/pracownia.mp4'
const POSTER = '/filmy/pracownia-poster.jpg'
const CAPTIONS = '/filmy/pracownia-etapy.vtt'
const LABEL = 'Film z pracowni: topienie złota, praca przy stole, oprawa kamieni i gotowy pierścionek'

/**
 * Film z pracowni (zlecenie T): 30 s, 4:5, bez dźwięku, w pętli.
 * - Napisy etapów z `pracownia-etapy.vtt` (źródło prawdy): ścieżka `captions` w trybie `hidden`, tekst
 *   aktywnego wpisu pokazujemy sami (bez `default` na `<track>`: iOS Safari rysowałby wtedy własny, drugi napis) jako etykietę w lewym dolnym rogu (wygląd przywieszki `Tag`).
 * - Autoodtwarzanie włączamy dopiero w przeglądarce i tylko bez `prefers-reduced-motion: reduce`;
 *   wtedy zostaje okładka i przycisk odtwarzania. Bez JS film ma natywne kontrolki i działa bez napisów.
 * - Przycisk pauzy jest zawsze (WCAG 2.2.2: ruch dłuższy niż 5 s musi dać się zatrzymać).
 * - Poza ekranem film stoi, żeby nie zużywać procesora i baterii.
 */
export default function StudioFilm({ className, style }: { className?: string; style?: CSSProperties }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<HTMLTrackElement>(null)
  const [enhanced, setEnhanced] = useState(false)
  const [autoplay, setAutoplay] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [caption, setCaption] = useState('')
  const [captionVisible, setCaptionVisible] = useState(false)
  // Pauza wybrana przez użytkownika: wtedy powrót filmu na ekran nie wznawia odtwarzania.
  const userPaused = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    // React nie zawsze przenosi `muted` do atrybutu; bez wyciszenia przeglądarki blokują autoodtwarzanie.
    video.muted = true
    video.defaultMuted = true
    setEnhanced(true)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    userPaused.current = reduced
    setAutoplay(!reduced)

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    setPlaying(!video.paused)

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!userPaused.current && video.paused) video.play().catch(() => {})
        } else if (!video.paused) {
          video.pause()
        }
      },
      { threshold: 0.25 },
    )
    io.observe(video)

    return () => {
      io.disconnect()
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [])

  useEffect(() => {
    const track = trackRef.current?.track
    if (!track) return
    track.mode = 'hidden'
    const onCueChange = () => {
      const cue = track.activeCues?.[0] as VTTCue | undefined
      if (cue) {
        setCaption(cue.text)
        setCaptionVisible(true)
      } else {
        // Tekst zostaje do końca wygaszania, znika tylko przezroczystość.
        setCaptionVisible(false)
      }
    }
    track.addEventListener('cuechange', onCueChange)
    return () => track.removeEventListener('cuechange', onCueChange)
  }, [])

  const toggle = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      userPaused.current = false
      video.play().catch(() => {})
    } else {
      userPaused.current = true
      video.pause()
    }
  }

  return (
    <div className={['studio-film', className].filter(Boolean).join(' ')} data-playing={playing ? '' : undefined} style={style}>
      <video
        aria-label={LABEL}
        autoPlay={autoplay}
        controls={!enhanced}
        loop
        muted
        playsInline
        poster={POSTER}
        preload="metadata"
        ref={videoRef}
      >
        <source src={SRC} type="video/mp4" />
        <track kind="captions" label="Etapy pracy" ref={trackRef} src={CAPTIONS} srcLang="pl" />
      </video>
      {enhanced ? (
        <>
          <span aria-hidden="true" className="tag studio-film-caption" data-visible={captionVisible ? '' : undefined}>
            <span className="hole" />
            <span className="nm">{caption}</span>
          </span>
          {/* Duża nakładka „odtwórz” dla myszy i dotyku; zmienia się tylko jej widoczność (bez przesunięć układu).
              Dostępna kontrolka to mały przycisk w rogu, więc nakładka jest ukryta przed czytnikami i klawiaturą. */}
          <button
            aria-hidden="true"
            className="studio-film-play"
            data-shown={playing ? undefined : ''}
            onClick={toggle}
            tabIndex={-1}
            type="button"
          >
            <svg height="44" viewBox="0 0 44 44" width="44">
              <circle cx="22" cy="22" fill="none" r="20.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M18 14 L30 22 L18 30 Z" fill="currentColor" />
            </svg>
          </button>
          <button aria-label={playing ? 'Zatrzymaj film' : 'Odtwórz film'} className="studio-film-btn" onClick={toggle} type="button">
            {playing ? (
              <svg aria-hidden="true" height="14" viewBox="0 0 14 14" width="14">
                <rect fill="currentColor" height="12" width="3.5" x="2.5" y="1" />
                <rect fill="currentColor" height="12" width="3.5" x="8" y="1" />
              </svg>
            ) : (
              <svg aria-hidden="true" height="14" viewBox="0 0 14 14" width="14">
                <path d="M3 1 L12.5 7 L3 13 Z" fill="currentColor" />
              </svg>
            )}
          </button>
        </>
      ) : null}
    </div>
  )
}
