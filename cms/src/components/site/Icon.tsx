import type { CSSProperties, ReactNode } from 'react'

/**
 * Zestaw ikon pracowni w stylu ilustracji etapów z „Na zamówienie” (public/grafiki/etapy):
 * cienka linia w kolorze tekstu (grafit, na granacie jasna), złoty akcent tylko na kamieniach, połysku i złocie.
 * Siatka 32 × 32, linia 1,35, zaokrąglone końce; czytelne od 28 px.
 *
 * Ruch: elementy z klasami `ic-*` ożywają, gdy wskaźnik albo fokus jest w rodzicu z klasą `ic-host`
 * (błysk, rysowanie linii, przesunięcie). Bez ruchu przy `prefers-reduced-motion`. Style w globals.css.
 */
export type IconName =
  | 'pierscionek'
  | 'obraczki'
  | 'szkic'
  | 'naprawa'
  | 'rozmiar'
  | 'czyszczenie'
  | 'lupa'
  | 'oprawa'
  | 'kamien'
  | 'lancuszek'
  | 'grawer'
  | 'renowacja'
  | 'zdjecie'
  | 'przetopienie'
  | 'kalendarz'
  | 'karta'

/** Punkt obrotu w układzie ikony (dla `ic-tap`, `ic-turn`, `ic-sway`). */
const pivot = (x: number, y: number): CSSProperties => ({ transformOrigin: `${x}px ${y}px` })

/** Błysk: krzyżyk jak w ilustracjach etapów. */
const spark = (x: number, y: number, s = 2.2) => (
  <path className="g ic-spark" d={`M${x} ${y - s} V${y + s} M${x - s} ${y} H${x + s}`} />
)

const ICONS: Record<IconName, ReactNode> = {
  pierscionek: (
    <>
      <ellipse cx="16" cy="21.5" rx="8" ry="6" />
      <ellipse cx="16" cy="22.4" rx="6" ry="4.1" strokeOpacity=".45" />
      <path d="M13.2 15.9 L12.4 10.4 M18.8 15.9 L19.6 10.4" />
      <path className="g" d="M11.5 10 L13.5 7 H18.5 L20.5 10 L16 15 Z M11.5 10 H20.5" />
      {spark(25.5, 6.5)}
    </>
  ),
  obraczki: (
    <>
      <circle cx="12" cy="16.5" r="7.5" />
      <circle cx="12" cy="16.5" r="5.8" strokeOpacity=".45" />
      <g className="ic-nudge">
        <circle className="g" cx="20" cy="16.5" r="7.5" />
        <circle className="g" cx="20" cy="16.5" r="5.8" strokeOpacity=".45" />
      </g>
      {spark(27, 5.5, 1.8)}
    </>
  ),
  szkic: (
    <>
      <circle className="ic-dash" cx="13" cy="19.5" r="7" strokeDasharray="2.2 2.2" />
      <path className="g" d="M9.5 9.5 L11.2 7 H14.8 L16.5 9.5 L13 13 Z M9.5 9.5 H16.5" />
      <path d="M20 26.5 L21 22.5 L28 9.5 L30 10.6 L23 23.6 Z M21 22.5 L23 23.6" />
    </>
  ),
  naprawa: (
    <>
      <ellipse cx="11" cy="24" rx="7" ry="3.6" />
      <ellipse cx="11" cy="24.6" rx="5" ry="2.2" strokeOpacity=".45" />
      <g className="ic-tap" style={pivot(21, 26)}>
        <rect height="4.5" rx="1" width="12" x="15" y="5" />
        <path d="M21 9.5 V26" />
      </g>
      <path className="g ic-spark" d="M15.6 17.4 L17.4 15.6 M12.2 16 V13.6" />
    </>
  ),
  rozmiar: (
    <>
      <path d="M3.5 14.6 L28.5 12 V20 L3.5 17.4 Z" />
      <path d="M9 14.1 V15.3 M14 13.6 V14.8 M19 13.1 V14.3 M24 12.6 V13.8" strokeOpacity=".5" />
      <ellipse className="g ic-slide" cx="15" cy="16" rx="2.4" ry="5.4" />
    </>
  ),
  czyszczenie: (
    <>
      <ellipse cx="13" cy="18" rx="9" ry="6" />
      <ellipse cx="13" cy="18.8" rx="7" ry="4.1" strokeOpacity=".45" />
      <path className="ic-draw" d="M4 28 C 9 25.5, 14 29.5, 21 26.5" pathLength={1} strokeOpacity=".6" />
      {spark(25, 8, 2.6)}
      {spark(28, 15.5, 1.5)}
    </>
  ),
  lupa: (
    <>
      <path className="g" d="M9.5 11.5 L11 9.5 H15 L16.5 11.5 L13 16 Z M9.5 11.5 H16.5" />
      <g className="ic-scan">
        <circle cx="13" cy="13" r="8.5" />
        <path d="M19.2 20.6 L26 27.4 L27.4 26 L20.6 19.2" />
      </g>
    </>
  ),
  oprawa: (
    <>
      <path className="g" d="M9.5 13 L12.5 9 H19.5 L22.5 13 L16 21.5 Z M9.5 13 H22.5" />
      <path className="g" d="M12.5 9 L14 13 L16 21.5 L18 13 L19.5 9" strokeOpacity=".55" />
      <path
        className="ic-draw"
        d="M10.5 24.5 C 9 20, 8.6 15, 10.6 11.6 M21.5 24.5 C 23 20, 23.4 15, 21.4 11.6 M13.5 25 C 13 21, 13 17, 13.6 12.4 M18.5 25 C 19 21, 19 17, 18.4 12.4"
        pathLength={1}
      />
      <path d="M8.5 25.5 H23.5" />
    </>
  ),
  kamien: (
    <>
      <path className="g" d="M5 13 L9.5 7.5 H20.5 L25 13 L15 26 Z M5 13 H25" />
      <path className="g" d="M9.5 7.5 L12 13 L15 26 L18 13 L20.5 7.5 M12 13 L15 7.5 L18 13" strokeOpacity=".55" />
      <path d="M29.5 2.5 L21.5 8 M30.5 4.5 L22.5 9.4" />
      {spark(5, 4, 1.8)}
    </>
  ),
  lancuszek: (
    <>
      <ellipse cx="8" cy="17" rx="5.5" ry="3.4" />
      <path className="g ic-draw" d="M12.4 15.6 H19.6 A1.4 1.4 0 0 1 19.6 18.4 H12.4 A1.4 1.4 0 0 1 12.4 15.6 Z" pathLength={1} />
      <ellipse cx="24" cy="17" rx="5.5" ry="3.4" />
      {spark(16, 9.5, 1.8)}
    </>
  ),
  grawer: (
    <>
      <ellipse cx="12" cy="22" rx="9" ry="4.5" />
      <ellipse cx="12" cy="22.8" rx="7" ry="2.9" strokeOpacity=".45" />
      <path className="g ic-draw" d="M7.5 23.4 C 8.5 22.4, 9.5 24.2, 10.5 23.2 S 12.5 22.4, 13.5 23.4 S 15.5 24.2, 16.5 23.2" pathLength={1} />
      <path d="M23.5 3.5 A3.6 3.6 0 0 1 28.5 8.5 L26 11 L21 6 Z M23.4 8.6 L14.6 17.4 L13.8 18.8" />
    </>
  ),
  renowacja: (
    <>
      <circle cx="16" cy="18.6" r="5" />
      <path className="g" d="M12.9 11.8 L14.3 9.9 H17.7 L19.1 11.8 L16 14.4 Z M12.9 11.8 H19.1" />
      <g className="ic-turn" style={pivot(16, 16)}>
        <path d="M27.5 16 A11.5 11.5 0 1 1 23.5 7.3 M23.5 7.3 L20.1 6.6 M23.5 7.3 L22.3 4" />
      </g>
    </>
  ),
  zdjecie: (
    <>
      <rect height="18" rx="1.5" width="23" x="4.5" y="7" />
      <circle cx="16" cy="19" r="3.8" />
      <path className="g" d="M13.2 13.6 L14.4 12 H17.6 L18.8 13.6 L16 15.9 Z M13.2 13.6 H18.8" />
      {spark(23.5, 11, 1.6)}
    </>
  ),
  przetopienie: (
    <>
      <path d="M7.5 13 H24.5 L22.4 24.6 A2 2 0 0 1 20.4 26.3 H11.6 A2 2 0 0 1 9.6 24.6 Z" />
      <path className="g" d="M9 16.5 Q16 18.3 23 16.5" />
      <path className="g ic-drip" d="M16 3.5 C 17.8 6.3, 18.5 7.4, 18.5 8.5 A2.5 2.5 0 0 1 13.5 8.5 C 13.5 7.4, 14.2 6.3, 16 3.5 Z" />
    </>
  ),
  kalendarz: (
    <>
      <rect height="19" rx="1.5" width="22" x="5" y="7.5" />
      <path d="M5 12.5 H27 M11 5 V9.5 M21 5 V9.5" />
      <path
        d="M10 17 h.01 M14 17 h.01 M10 21.5 h.01 M14 21.5 h.01 M23 17 h.01 M23 21.5 h.01"
        strokeOpacity=".6"
        strokeWidth="1.8"
      />
      <path className="g ic-spark" d="M18.5 16.2 L20.6 19 L18.5 21.8 L16.4 19 Z" />
    </>
  ),
  karta: (
    <>
      <g className="ic-sway" style={pivot(9.5, 16)}>
        <path d="M9.5 9 H27 V23 H9.5 L5 18.5 V13.5 Z" />
        <circle cx="9.5" cy="16" r="1.3" />
        <path className="g" d="M14 13.8 H23" />
        <path d="M14 18 H20.5" strokeOpacity=".55" />
      </g>
    </>
  ),
}

type IconProps = { name: IconName; size?: number; className?: string }

export default function Icon({ name, size = 40, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={['icon', className].filter(Boolean).join(' ')}
      fill="none"
      focusable="false"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.35}
      viewBox="0 0 32 32"
      width={size}
    >
      {ICONS[name]}
    </svg>
  )
}
