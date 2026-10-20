'use client'

import Link from 'next/link'
import { useState } from 'react'

type ProfileId = 'plaska' | 'polokragla' | 'komfort' | 'fazowana'
type FinishId = 'polerowane' | 'matowe' | 'szczotkowane'
type GoldId = 'zolte' | 'biale'

const PROFILES: { id: ProfileId; label: string; hint: string }[] = [
  { id: 'plaska', label: 'Płaska', hint: 'Nowoczesna, wyraźna krawędź. Dobrze wygląda w szerszych obrączkach.' },
  { id: 'polokragla', label: 'Półokrągła', hint: 'Klasyczna, zaokrąglona na zewnątrz, płaska od środka.' },
  { id: 'komfort', label: 'Komfort', hint: 'Zaokrąglona z obu stron. Łatwo ją wsunąć i wygodnie się nosi na co dzień.' },
  { id: 'fazowana', label: 'Fazowana', hint: 'Płaski wierzch ze ściętymi krawędziami, które łapią światło.' },
]
const WIDTHS = [3, 4, 5, 6, 7]
const FINISHES: { id: FinishId; label: string }[] = [
  { id: 'polerowane', label: 'Polerowane' },
  { id: 'matowe', label: 'Matowe' },
  { id: 'szczotkowane', label: 'Szczotkowane' },
]
const GOLDS: { id: GoldId; label: string; color: string }[] = [
  { id: 'zolte', label: 'Żółte', color: '#CDA85C' },
  { id: 'biale', label: 'Białe', color: '#D3D3CE' },
]

const f = (n: number) => Math.round(n * 10) / 10

function shape(profile: ProfileId, W: number) {
  const H = 64
  const x0 = (300 - W) / 2
  const y0 = 40
  const x1 = x0 + W
  const y1 = y0 + H
  const cx = 150
  if (profile === 'plaska') {
    const r = 5
    return {
      band: `M${f(x0 + r)} ${y0} H${f(x1 - r)} Q${f(x1)} ${y0} ${f(x1)} ${y0 + r} V${y1 - r} Q${f(x1)} ${y1} ${f(x1 - r)} ${y1} H${f(x0 + r)} Q${f(x0)} ${y1} ${f(x0)} ${y1 - r} V${y0 + r} Q${f(x0)} ${y0} ${f(x0 + r)} ${y0} Z`,
      shine: `M${f(x0 + W * 0.18)} ${y0 + 7} H${f(x1 - W * 0.18)}`,
    }
  }
  if (profile === 'polokragla') {
    return {
      band: `M${f(x0)} ${y1} V${y0 + H * 0.62} C${f(x0)} ${y0 - H * 0.18} ${f(x1)} ${y0 - H * 0.18} ${f(x1)} ${y0 + H * 0.62} V${y1} Z`,
      shine: `M${f(cx - W * 0.28)} ${y0 + H * 0.28} Q${cx} ${y0 + 2} ${f(cx + W * 0.28)} ${y0 + H * 0.28}`,
    }
  }
  if (profile === 'fazowana') {
    return {
      band: `M${f(x0)} ${y1} V${y0 + H * 0.38} L${f(x0 + W * 0.13)} ${y0} H${f(x1 - W * 0.13)} L${f(x1)} ${y0 + H * 0.38} V${y1} Z`,
      shine: `M${f(x0 + W * 0.2)} ${y0 + 6} H${f(x1 - W * 0.2)}`,
    }
  }
  return {
    band: `M${f(x0)} ${y0 + H * 0.5} C${f(x0)} ${y0 - H * 0.12} ${f(x1)} ${y0 - H * 0.12} ${f(x1)} ${y0 + H * 0.5} C${f(x1)} ${y1 + H * 0.02} ${f(x0)} ${y1 + H * 0.02} ${f(x0)} ${y0 + H * 0.5} Z`,
    shine: `M${f(cx - W * 0.28)} ${y0 + H * 0.24} Q${cx} ${y0 + 3} ${f(cx + W * 0.28)} ${y0 + H * 0.24}`,
  }
}

export default function BandConfigurator() {
  const [profile, setProfile] = useState<ProfileId>('komfort')
  const [width, setWidth] = useState(5)
  const [finish, setFinish] = useState<FinishId>('polerowane')
  const [gold, setGold] = useState<GoldId>('zolte')
  const [sweep, setSweep] = useState(0)

  const W = width * 30
  const sh = shape(profile, W)
  const p = PROFILES.find((x) => x.id === profile)!
  const fin = FINISHES.find((x) => x.id === finish)!
  const g = GOLDS.find((x) => x.id === gold)!
  const widthLabel = `${width} mm szerokości`
  const summary = `Profil ${p.label.toLowerCase()}, ${width} mm, ${fin.label.toLowerCase()}, ${g.label.toLowerCase()} złoto`
  const texture = finish === 'matowe' ? 'url(#mat)' : finish === 'szczotkowane' ? 'url(#szczotka)' : 'none'
  const choice = `${p.label.toLowerCase()}, ${width} mm, ${fin.label.toLowerCase()}, ${g.label.toLowerCase()} złoto`

  const pickGold = (id: GoldId) => {
    if (id !== gold) setSweep((v) => v + 1)
    setGold(id)
  }
  const pickFinish = (id: FinishId) => {
    if (id !== finish) setSweep((v) => v + 1)
    setFinish(id)
  }

  return (
    <div className="bands">
      <div className="bands-view">
        <div className="cap">
          <span>Przekrój obrączki, skala orientacyjna</span>
          <span>{widthLabel}</span>
        </div>
        <svg aria-label={`Przekrój obrączki: ${summary.toLowerCase()}`} role="img" style={{ display: 'block', width: '100%', maxHeight: 360 }} viewBox="0 0 300 170">
          <defs>
            <pattern height="4" id="mat" patternUnits="userSpaceOnUse" width="4">
              <circle cx="1" cy="1" fill="#000" fillOpacity="0.14" r="0.6" />
              <circle cx="3" cy="3" fill="#fff" fillOpacity="0.25" r="0.5" />
            </pattern>
            <pattern height="3" id="szczotka" patternUnits="userSpaceOnUse" width="300">
              <line stroke="#000" strokeOpacity="0.13" strokeWidth="0.7" x1="0" x2="300" y1="1" y2="1" />
            </pattern>
            <clipPath id="band-clip"><path d={sh.band} /></clipPath>
          </defs>
          <path d={sh.band} fill={g.color} />
          <path d={sh.band} fill={texture} />
          {sweep > 0 ? (
            <g clipPath="url(#band-clip)" key={sweep}>
              <rect className="svg-sweep" fill="#fff" fillOpacity="0.5" height="80" width="26" x="50" y="30" />
            </g>
          ) : null}
          <path d={sh.shine} fill="none" stroke="#fff" strokeLinecap="round" strokeOpacity={finish === 'polerowane' ? 0.85 : 0.25} strokeWidth="2.4" />
          <path d={sh.band} fill="none" stroke="#22262A" strokeOpacity="0.35" strokeWidth="0.8" />
          <line stroke="#A9B6AF" strokeWidth="0.8" x1={(300 - W) / 2} x2={(300 + W) / 2} y1="138" y2="138" />
          <line stroke="#A9B6AF" strokeWidth="0.8" x1={(300 - W) / 2} x2={(300 - W) / 2} y1="132" y2="144" />
          <line stroke="#A9B6AF" strokeWidth="0.8" x1={(300 + W) / 2} x2={(300 + W) / 2} y1="132" y2="144" />
          <text fill="#EEF0EA" fontFamily="Schibsted Grotesk, sans-serif" fontSize="8" textAnchor="middle" x="150" y="158">{widthLabel}</text>
          <text fill="#A9B6AF" fontFamily="Schibsted Grotesk, sans-serif" fontSize="7" textAnchor="middle" x="150" y="26">strona zewnętrzna</text>
          <text fill="#A9B6AF" fontFamily="Schibsted Grotesk, sans-serif" fontSize="7" textAnchor="middle" x="150" y="122">przylega do palca</text>
        </svg>
        <p className="sum" aria-live="polite">{summary}</p>
      </div>

      <div className="bands-controls">
        <h2 className="wiz-h">Dobierzcie wstępnie parę</h2>
        <div aria-labelledby="o-profil" className="stack" role="group" style={{ gap: 10 }}>
          <span id="o-profil" style={{ fontSize: 14, color: 'var(--muted)' }}>Profil</span>
          <div className="row" style={{ gap: 8 }}>
            {PROFILES.map((x) => (
              <button aria-pressed={x.id === profile} className="chip chip-on-silver" key={x.id} onClick={() => setProfile(x.id)} type="button">
                {x.label}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--graphite-2)' }}>{p.hint}</span>
        </div>
        <div aria-labelledby="o-szer" className="stack" role="group" style={{ gap: 10 }}>
          <span id="o-szer" style={{ fontSize: 14, color: 'var(--muted)' }}>Szerokość</span>
          <div className="row" style={{ gap: 8 }}>
            {WIDTHS.map((w) => (
              <button aria-pressed={w === width} className="chip chip-on-silver" key={w} onClick={() => setWidth(w)} type="button">
                {w} mm
              </button>
            ))}
          </div>
        </div>
        <div aria-labelledby="o-wyk" className="stack" role="group" style={{ gap: 10 }}>
          <span id="o-wyk" style={{ fontSize: 14, color: 'var(--muted)' }}>Wykończenie</span>
          <div className="row" style={{ gap: 8 }}>
            {FINISHES.map((x) => (
              <button aria-pressed={x.id === finish} className="chip chip-on-silver" key={x.id} onClick={() => pickFinish(x.id)} type="button">
                {x.label}
              </button>
            ))}
          </div>
        </div>
        <div aria-labelledby="o-zloto" className="stack" role="group" style={{ gap: 10 }}>
          <span id="o-zloto" style={{ fontSize: 14, color: 'var(--muted)' }}>Kolor złota</span>
          <div className="row" style={{ gap: 8 }}>
            {GOLDS.map((x) => (
              <button aria-pressed={x.id === gold} className="chip chip-on-silver" key={x.id} onClick={() => pickGold(x.id)} type="button">
                <span aria-hidden="true" className="chip-dot" style={{ background: x.color, width: 12, height: 12 }} />
                {x.label}
              </button>
            ))}
          </div>
        </div>
        <div className="stack" style={{ gap: 12, borderTop: '1px solid var(--line-soft)', paddingTop: 22 }}>
          <Link
            className="btn"
            href={`/kontakt?temat=obraczki&wybor=${encodeURIComponent(choice)}`}
            style={{ alignSelf: 'flex-start' }}
          >
            Umów przymiarkę obrączek
          </Link>
          <span className="small" style={{ fontSize: 14, lineHeight: 1.5 }}>
            Wybór zapiszemy w wiadomości. Na przymiarce pokażemy próbki szerokości i wykończeń na żywo. Cena zależy od szerokości, wagi i próby złota.
          </span>
        </div>
      </div>
    </div>
  )
}
