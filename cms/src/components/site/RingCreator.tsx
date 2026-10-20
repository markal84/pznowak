'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  CUTS,
  GEMS,
  computeRing,
  type CutId,
  type GemId,
  type MetalId,
  type PaveId,
  type SettingId,
  type WidthId,
} from '@/lib/ring-geometry'
import { PREVIEW_NOTICE, SITE, SUBMISSIONS_ENABLED } from '@/lib/site'

const OCCASIONS = [
  { id: 'zareczyny', label: 'Zaręczyny', hint: 'Pierścionek zaręczynowy', icon: 'okazja' },
  { id: 'rocznica', label: 'Rocznica', hint: 'Na ważną datę', icon: 'kalendarz' },
  { id: 'prezent', label: 'Prezent', hint: 'Dla bliskiej osoby', icon: 'prezent' },
  { id: 'dla-siebie', label: 'Dla siebie', hint: 'Bo tak', icon: 'pierscionek' },
] as const

const SETTINGS: { id: SettingId; label: string; hint: string }[] = [
  { id: 'lapki-4', label: 'Cztery łapki', hint: 'Klasyka. Do kamienia wpada najwięcej światła.' },
  { id: 'lapki-6', label: 'Sześć łapek', hint: 'Kamień trzymany pewniej, kształt bardziej okrągły.' },
  { id: 'kaszta', label: 'Kaszta', hint: 'Kamień w metalowej obwódce. Wygodny na co dzień, nie zahacza.' },
  { id: 'halo', label: 'Halo', hint: 'Wianek drobnych diamentów. Kamień wydaje się większy.' },
  { id: 'trylogia', label: 'Trylogia', hint: 'Trzy kamienie: przeszłość, teraźniejszość i przyszłość.' },
]

const METALS: { id: MetalId; label: string; gradient: string; name: string }[] = [
  { id: 'au', label: 'Żółte', name: 'żółte złoto', gradient: 'linear-gradient(135deg, #8A6A28, #EBD08A 45%, #B38B3E)' },
  { id: 'ag', label: 'Białe', name: 'białe złoto', gradient: 'linear-gradient(135deg, #85898D, #F4F4F1 45%, #AEB1B4)' },
  { id: 'dwa', label: 'Dwukolorowe', name: 'żółte i białe złoto', gradient: 'linear-gradient(135deg, #B38B3E 0 50%, #D9DADB 50% 100%)' },
]

const WIDTHS: { id: WidthId; label: string; hint: string }[] = [
  { id: 'cienka', label: 'Delikatna', hint: 'Lekka, dyskretna' },
  { id: 'klasyczna', label: 'Klasyczna', hint: 'Najczęstszy wybór' },
  { id: 'szeroka', label: 'Wyraźna', hint: 'Mocniejszy akcent' },
]

const PAVES: { id: PaveId; label: string }[] = [
  { id: 'nie', label: 'Gładkie' },
  { id: 'tak', label: 'Z drobnymi diamentami' },
]

const STEP_LABELS = ['Okazja', 'Kamień', 'Szlif', 'Oprawa', 'Złoto', 'Podsumowanie'] as const
const LAST = STEP_LABELS.length - 1

export default function RingCreator() {
  const [step, setStep] = useState(0)
  const [moved, setMoved] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [occasion, setOccasion] = useState<(typeof OCCASIONS)[number]['id']>('zareczyny')
  const [when, setWhen] = useState('')
  const [gem, setGem] = useState<GemId>('szafir')
  const [cut, setCut] = useState<CutId>('owal')
  const [setting, setSetting] = useState<SettingId>('halo')
  const [metal, setMetal] = useState<MetalId>('au')
  const [width, setWidth] = useState<WidthId>('klasyczna')
  const [pave, setPave] = useState<PaveId>('nie')
  const [engraving, setEngraving] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [consent, setConsent] = useState(false)
  const [sweep, setSweep] = useState(0)
  const [message, setMessage] = useState<string | null>(null)

  const geo = useMemo(() => computeRing({ gem, cut, setting, metal, width, pave }), [gem, cut, setting, metal, width, pave])
  const gemInfo = GEMS[gem]
  const cutInfo = CUTS[cut]
  const settingInfo = SETTINGS.find((s) => s.id === setting)!
  const metalInfo = METALS.find((m) => m.id === metal)!
  const widthInfo = WIDTHS.find((w) => w.id === width)!
  const occasionInfo = OCCASIONS.find((o) => o.id === occasion)!

  const goTo = (next: number) => {
    setDirection(next >= step ? 'forward' : 'back')
    setMoved(true)
    setStep(next)
    setMessage(null)
  }

  const summary: [string, string][] = [
    ['Okazja', occasionInfo.label],
    ...(when.trim() ? ([['Na kiedy', when.trim()]] as [string, string][]) : []),
    ['Kamień', gemInfo.label],
    ['Szlif', cutInfo.label],
    ['Oprawa', settingInfo.label],
    ['Złoto', metalInfo.label],
    ['Obrączka', widthInfo.label + (pave === 'tak' ? ', z diamentami' : ', gładka')],
    ['Grawer', engraving ? `„${engraving}”` : 'bez graweru'],
  ]

  const previewLabel = `Podgląd pierścionka: ${gemInfo.label.toLowerCase()}, szlif ${cutInfo.label.toLowerCase()}, oprawa ${settingInfo.label.toLowerCase()}, ${metalInfo.name}`

  const onSend = () => {
    if (!SUBMISSIONS_ENABLED) {
      setMessage(PREVIEW_NOTICE)
      return
    }
  }

  const bodyClass = `wiz-body${moved ? (direction === 'back' ? ' stepBack' : ' stepIn') : ''}`

  return (
    <>
      <nav aria-label="Kroki kreatora" className="wrap" style={{ paddingBottom: 28 }}>
        <ol className="wiz-steps">
          {STEP_LABELS.map((label, i) => (
            <li key={label}>
              <button
                aria-current={i === step ? 'step' : undefined}
                className={`wiz-step${i < step ? ' done' : ''}`}
                onClick={() => goTo(i)}
                type="button"
              >
                <span className="wiz-num">{i < step ? '✓' : i + 1}</span>
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section className="wrap wiz-layout">
        <div className="wiz-left">
          <div aria-live="polite" className="preview">
            <svg aria-label={previewLabel} role="img" style={{ display: 'block', width: '100%', height: 'auto' }} viewBox="0 0 400 400">
              <defs>
                <radialGradient cx="50%" cy="38%" id="kr-bg" r="72%"><stop offset="0" stopColor="#2F5249" /><stop offset="1" stopColor="#142B25" /></radialGradient>
                <linearGradient id="kr-au" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#6E5018" /><stop offset="0.3" stopColor="#E6C97E" /><stop offset="0.55" stopColor="#B38B3E" /><stop offset="0.78" stopColor="#F5E4B0" /><stop offset="1" stopColor="#86621F" /></linearGradient>
                <linearGradient id="kr-ag" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#74787C" /><stop offset="0.3" stopColor="#F1F1EE" /><stop offset="0.55" stopColor="#AEB1B4" /><stop offset="0.78" stopColor="#FBFBF9" /><stop offset="1" stopColor="#83878B" /></linearGradient>
                <radialGradient cx="38%" cy="30%" id="kr-gem" r="82%"><stop offset="0" stopColor={geo.g1} /><stop offset="0.55" stopColor={geo.g2} /><stop offset="1" stopColor={geo.g3} /></radialGradient>
                <radialGradient cx="38%" cy="30%" id="kr-side" r="82%"><stop offset="0" stopColor="#FFFFFF" /><stop offset="0.55" stopColor="#D9E2EA" /><stop offset="1" stopColor="#8D9DAC" /></radialGradient>
                <clipPath id="kr-clip"><path d={geo.gemPath} /></clipPath>
                <clipPath id="kr-sclip"><path d={geo.sidePath} /></clipPath>
                <clipPath id="kr-bandclip"><path clipRule="evenodd" d={geo.bandPath} /></clipPath>
              </defs>
              <rect fill="url(#kr-bg)" height="400" width="400" />
              <ellipse cx="200" cy="374" fill="#000" opacity="0.22" rx="110" ry="8" />
              <path d={geo.bandPath} fill={geo.bandFill} fillRule="evenodd" stroke="#2B2414" strokeOpacity="0.35" strokeWidth="1" />
              {sweep > 0 ? (
                <g clipPath="url(#kr-bandclip)" key={sweep}>
                  <rect className="svg-sweep" fill="#fff" fillOpacity="0.5" height="260" width="46" x="60" y="110" />
                </g>
              ) : null}
              <path d={geo.innerRing} fill="none" stroke="#000" strokeOpacity="0.22" strokeWidth="3" />
              <path d={geo.highlight} fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity="0.6" strokeWidth="2.5" />
              <g display={geo.paveDisplay ? 'inline' : 'none'}><path d={geo.pavePath} fill="#F4F6F8" stroke="#7F8C98" strokeWidth="0.8" /></g>
              <g display={geo.trioDisplay ? 'inline' : 'none'}>
                <path d={geo.sidePath} fill="url(#kr-side)" stroke="#8D9DAC" strokeWidth="1" />
                <path clipPath="url(#kr-sclip)" d={geo.sideLines} fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.8" />
                <path d={geo.sideTable} fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.8" />
                <path d={geo.sideProngs} fill={geo.headFill} stroke="#2B2414" strokeOpacity="0.4" strokeWidth="0.8" />
              </g>
              <g display={geo.haloDisplay ? 'inline' : 'none'}>
                <path d={geo.haloMetal} fill="none" stroke={geo.headFill} strokeLinejoin="round" strokeWidth="15" />
                <path d={geo.haloDots} fill="#F4F6F8" stroke="#7F8C98" strokeWidth="0.8" />
              </g>
              <g display={geo.bezelDisplay ? 'inline' : 'none'}><path d={geo.bezelPath} fill={geo.headFill} stroke="#2B2414" strokeOpacity="0.45" strokeWidth="1" /></g>
              <g className="gem-in" key={`${gem}-${cut}`}>
                <path d={geo.gemPath} fill="url(#kr-gem)" stroke={geo.gemStroke} strokeWidth="1.2" />
                <path clipPath="url(#kr-clip)" d={geo.gemLines} fill="none" stroke="#fff" strokeOpacity="0.42" strokeWidth="1" />
                <path d={geo.gemTable} fill="#fff" fillOpacity="0.1" stroke="#fff" strokeOpacity="0.55" strokeWidth="1" />
                <path d={geo.glint} fill="#fff" opacity="0.85" />
              </g>
              <g display={geo.prongDisplay ? 'inline' : 'none'}><path d={geo.prongPath} fill={geo.headFill} stroke="#2B2414" strokeOpacity="0.45" strokeWidth="0.9" /></g>
            </svg>
          </div>

          <div className="tag tag-xl card-summary" style={{ padding: '26px 30px 24px 60px', ['--c' as string]: '24px' }}>
            <span aria-hidden="true" className="hole" style={{ left: 20, width: 13, height: 13, marginTop: -7 }} />
            <div className="card-head">
              <span className="t">Karta projektu</span>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>uzupełnia się na bieżąco</span>
            </div>
            <dl>
              {summary.map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="wiz-panel">
          {step === 0 ? (
            <div className={bodyClass} key="s0">
              <h2 className="wiz-h">Na jaką okazję?</h2>
              <p className="wiz-p">Od tego zależą proporcje i to, o co zapytamy na spotkaniu.</p>
              <div className="opt-grid opt-grid-2">
                {OCCASIONS.map((o) => (
                  <button aria-pressed={o.id === occasion} className="opt" key={o.id} onClick={() => setOccasion(o.id)} type="button">
                    <Image alt="" height={28} src={`/grafiki/ikony/${o.icon}.svg`} width={28} />
                    <span className="t">{o.label}</span>
                    <span className="h">{o.hint}</span>
                  </button>
                ))}
              </div>
              <div className="field">
                <label htmlFor="kr-data">
                  Na kiedy <span className="opt-note">(opcjonalnie)</span>
                </label>
                <input className="fld" id="kr-data" maxLength={60} onChange={(e) => setWhen(e.target.value)} placeholder="np. zaręczyny w czerwcu" type="text" value={when} />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className={bodyClass} key="s1">
              <h2 className="wiz-h">Wybierz kamień</h2>
              <p className="wiz-p">Kolory na ekranie są orientacyjne. Prawdziwe kamienie pokażemy w pracowni.</p>
              <div className="opt-grid opt-grid-2">
                {(Object.keys(GEMS) as GemId[]).map((id) => (
                  <button aria-pressed={id === gem} className="opt" key={id} onClick={() => setGem(id)} type="button">
                    <span
                      aria-hidden="true"
                      className="swatch"
                      style={{ background: `radial-gradient(circle at 35% 30%, ${GEMS[id].c[0]}, ${GEMS[id].c[1]} 55%, ${GEMS[id].c[2]})` }}
                    />
                    <span className="t">{GEMS[id].label}</span>
                    <span className="h">{GEMS[id].hint}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className={bodyClass} key="s2">
              <h2 className="wiz-h">Kształt kamienia</h2>
              <p className="wiz-p">Szlif decyduje o tym, jak kamień łapie światło i jak wygląda na dłoni.</p>
              <div className="opt-grid opt-grid-4">
                {(Object.keys(CUTS) as CutId[]).map((id) => (
                  <button aria-pressed={id === cut} className="opt opt-center" key={id} onClick={() => setCut(id)} type="button">
                    <Image alt="" height={56} src={`/grafiki/szlify/${id}.svg`} width={56} />
                    <span className="t-sm">{CUTS[id].label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className={bodyClass} key="s3">
              <h2 className="wiz-h">Jak osadzić kamień?</h2>
              <p className="wiz-p">Oprawa wpływa na wygląd, ale też na to, jak pierścionek znosi codzienne noszenie.</p>
              <div className="opt-col">
                {SETTINGS.map((s) => (
                  <button aria-pressed={s.id === setting} className="opt opt-row" key={s.id} onClick={() => setSetting(s.id)} type="button">
                    <Image alt="" height={56} src={`/grafiki/oprawy/${s.id}.svg`} style={{ flex: '0 0 auto' }} width={56} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span className="t">{s.label}</span>
                      <span className="h">{s.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className={bodyClass} key="s4" style={{ gap: 22 }}>
              <h2 className="wiz-h">Złoto i obrączka</h2>
              <div aria-labelledby="kr-zl" className="opt-col" role="group">
                <span id="kr-zl" style={{ fontSize: 14, color: 'var(--muted)' }}>Kolor złota</span>
                <div className="opt-grid opt-grid-3">
                  {METALS.map((m) => (
                    <button
                      aria-pressed={m.id === metal}
                      className="opt"
                      key={m.id}
                      onClick={() => {
                        if (m.id !== metal) setSweep((v) => v + 1)
                        setMetal(m.id)
                      }}
                      type="button"
                    >
                      <span aria-hidden="true" className="swatch" style={{ background: m.gradient }} />
                      <span className="t" style={{ fontSize: 15 }}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div aria-labelledby="kr-sz" className="opt-col" role="group">
                <span id="kr-sz" style={{ fontSize: 14, color: 'var(--muted)' }}>Obrączka</span>
                <div className="opt-grid opt-grid-3">
                  {WIDTHS.map((w) => (
                    <button aria-pressed={w.id === width} className="opt" key={w.id} onClick={() => setWidth(w.id)} type="button">
                      <span className="t" style={{ fontSize: 15 }}>{w.label}</span>
                      <span className="h" style={{ fontSize: 13 }}>{w.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div aria-labelledby="kr-pv" className="opt-col" role="group">
                <span id="kr-pv" style={{ fontSize: 14, color: 'var(--muted)' }}>Ramiona obrączki</span>
                <div className="opt-grid opt-grid-2">
                  {PAVES.map((p) => (
                    <button aria-pressed={p.id === pave} className="opt" key={p.id} onClick={() => setPave(p.id)} type="button">
                      <span className="t" style={{ fontSize: 15 }}>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="kr-grawer">
                  Grawer w środku <span className="opt-note">(opcjonalnie, do 24 znaków)</span>
                </label>
                <input
                  className="fld"
                  id="kr-grawer"
                  maxLength={24}
                  onChange={(e) => setEngraving(e.target.value.slice(0, 24))}
                  placeholder="np. A & M 14.06.2027"
                  type="text"
                  value={engraving}
                />
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className={bodyClass} key="s5">
              <h2 className="wiz-h">Twój szkic jest gotowy</h2>
              <p className="wiz-p" style={{ lineHeight: 1.6 }}>
                Wyślij go do pracowni. Oddzwonimy, umówimy spotkanie i na podstawie karty przygotujemy szkic i wycenę.
                Pierścionki na zamówienie kosztują zwykle [X–Y] zł.
              </p>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                <div className="field">
                  <label htmlFor="kr-imie">Imię</label>
                  <input autoComplete="given-name" className="fld" id="kr-imie" onChange={(e) => setName(e.target.value)} type="text" value={name} />
                </div>
                <div className="field">
                  <label htmlFor="kr-tel">Telefon</label>
                  <input autoComplete="tel" className="fld" id="kr-tel" onChange={(e) => setPhone(e.target.value)} type="tel" value={phone} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="kr-uwagi">
                  Coś jeszcze? <span className="opt-note">(opcjonalnie)</span>
                </label>
                <textarea
                  className="fld"
                  id="kr-uwagi"
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="np. mam zdjęcie inspiracji, rozmiar do sprawdzenia"
                  rows={3}
                  style={{ resize: 'vertical', lineHeight: 1.5 }}
                  value={notes}
                />
              </div>
              <label className="check">
                <input checked={consent} onChange={(e) => setConsent(e.target.checked)} type="checkbox" />
                <span>Zgadzam się na kontakt w sprawie projektu. Polityka prywatności [wkrótce]</span>
              </label>
              <button className="btn" onClick={onSend} style={{ alignSelf: 'flex-start' }} type="button">
                Wyślij projekt do pracowni
              </button>
              {message ? (
                <p className="notice notice-preview" role="status">
                  {message} <a href={SITE.phoneHref}>{SITE.phone}</a> · <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="wiz-nav">
            {step > 0 ? (
              <button className="btn btn-line" onClick={() => goTo(step - 1)} type="button">
                Wstecz
              </button>
            ) : null}
            <span className="wiz-count">Krok {step + 1} z {STEP_LABELS.length}</span>
            {step < LAST ? (
              <button className="btn" onClick={() => goTo(step + 1)} type="button">
                {step >= LAST - 1 ? 'Przejdź do podsumowania' : `Dalej: ${STEP_LABELS[step + 1].toLowerCase()}`}
              </button>
            ) : (
              <Link className="tl" href="/kontakt">
                Wolę napisać zwykłą wiadomość
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
