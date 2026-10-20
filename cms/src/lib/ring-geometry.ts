/**
 * Geometria podglądu pierścionka w kreatorze. Port 1:1 z design/opus5.5/tools/ring-geometry.js
 * (plansza Kreator.dc.html). compute(state) zwraca wartości podstawiane do szablonu SVG.
 */
type Point = [number, number]
type Cmd = ['M', Point[]] | ['L', Point[]] | ['C', Point[]] | ['Z', Point[]]
type Kind = 'radial' | 'step' | 'princess'

const K = 0.5523

function ell(rx: number, ry: number): Cmd[] {
  return [
    ['M', [[-rx, 0]]],
    ['C', [[-rx, -ry * K], [-rx * K, -ry], [0, -ry]]],
    ['C', [[rx * K, -ry], [rx, -ry * K], [rx, 0]]],
    ['C', [[rx, ry * K], [rx * K, ry], [0, ry]]],
    ['C', [[-rx * K, ry], [-rx, ry * K], [-rx, 0]]],
    ['Z', []],
  ]
}

function poly(p: Point[]): Cmd[] {
  const rest: Cmd[] = p.slice(1).map((q): Cmd => ['L', [q]])
  return [['M', [p[0]]], ...rest, ['Z', []]]
}

export type CutId = 'okragly' | 'owal' | 'markiza' | 'gruszka' | 'szmaragdowy' | 'poduszka' | 'princessa' | 'serce'
export type GemId = 'diament' | 'szafir' | 'szmaragd' | 'rubin' | 'tanzanit' | 'morganit' | 'topaz' | 'wlasny'
export type SettingId = 'lapki-4' | 'lapki-6' | 'kaszta' | 'halo' | 'trylogia'
export type MetalId = 'au' | 'ag' | 'dwa'
export type WidthId = 'cienka' | 'klasyczna' | 'szeroka'
export type PaveId = 'nie' | 'tak'

export const CUTS: Record<CutId, { label: string; cmds: Cmd[]; kind: Kind; p4: number[] }> = {
  okragly: { label: 'Okrągły', cmds: ell(1, 1), kind: 'radial', p4: [45, 135, 225, 315] },
  owal: { label: 'Owal', cmds: ell(0.74, 1), kind: 'radial', p4: [50, 130, 230, 310] },
  markiza: {
    label: 'Markiza',
    cmds: [['M', [[0, -1]]], ['C', [[0.56, -0.55], [0.56, 0.55], [0, 1]]], ['C', [[-0.56, 0.55], [-0.56, -0.55], [0, -1]]], ['Z', []]],
    kind: 'radial',
    p4: [90, 270, 0, 180],
  },
  gruszka: {
    label: 'Gruszka',
    cmds: [
      ['M', [[0, -1]]],
      ['C', [[0.35, -0.6], [0.76, -0.12], [0.76, 0.32]]],
      ['C', [[0.76, 0.74], [0.42, 1], [0, 1]]],
      ['C', [[-0.42, 1], [-0.76, 0.74], [-0.76, 0.32]]],
      ['C', [[-0.76, -0.12], [-0.35, -0.6], [0, -1]]],
      ['Z', []],
    ],
    kind: 'radial',
    p4: [270, 20, 160, 90],
  },
  szmaragdowy: {
    label: 'Szmaragdowy',
    cmds: poly([[-0.5, -1], [0.5, -1], [0.72, -0.78], [0.72, 0.78], [0.5, 1], [-0.5, 1], [-0.72, 0.78], [-0.72, -0.78]]),
    kind: 'step',
    p4: [55, 125, 235, 305],
  },
  poduszka: {
    label: 'Poduszka',
    cmds: [
      ['M', [[-0.5, -0.9]]],
      ['C', [[-0.17, -0.95], [0.17, -0.95], [0.5, -0.9]]],
      ['C', [[0.82, -0.86], [0.86, -0.82], [0.9, -0.5]]],
      ['C', [[0.95, -0.17], [0.95, 0.17], [0.9, 0.5]]],
      ['C', [[0.86, 0.82], [0.82, 0.86], [0.5, 0.9]]],
      ['C', [[0.17, 0.95], [-0.17, 0.95], [-0.5, 0.9]]],
      ['C', [[-0.82, 0.86], [-0.86, 0.82], [-0.9, 0.5]]],
      ['C', [[-0.95, 0.17], [-0.95, -0.17], [-0.9, -0.5]]],
      ['C', [[-0.86, -0.82], [-0.82, -0.86], [-0.5, -0.9]]],
      ['Z', []],
    ],
    kind: 'radial',
    p4: [45, 135, 225, 315],
  },
  princessa: { label: 'Princessa', cmds: poly([[-0.86, -0.86], [0.86, -0.86], [0.86, 0.86], [-0.86, 0.86]]), kind: 'princess', p4: [45, 135, 225, 315] },
  serce: {
    label: 'Serce',
    cmds: [
      ['M', [[0, 0.92]]],
      ['C', [[-0.38, 0.62], [-0.98, 0.22], [-0.98, -0.3]]],
      ['C', [[-0.98, -0.74], [-0.5, -0.98], [0, -0.56]]],
      ['C', [[0.5, -0.98], [0.98, -0.74], [0.98, -0.3]]],
      ['C', [[0.98, 0.22], [0.38, 0.62], [0, 0.92]]],
      ['Z', []],
    ],
    kind: 'radial',
    p4: [90, 270, 200, 340],
  },
}

export const GEMS: Record<GemId, { label: string; hint: string; c: [string, string, string] }> = {
  diament: { label: 'Diament', hint: 'Bezbarwny, ponadczasowy', c: ['#FFFFFF', '#D9E2EA', '#8D9DAC'] },
  szafir: { label: 'Szafir', hint: 'Głęboki niebieski', c: ['#7F9CEB', '#26449E', '#0E1C52'] },
  szmaragd: { label: 'Szmaragd', hint: 'Soczysta zieleń', c: ['#86D8AC', '#1E7A4E', '#0A3A24'] },
  rubin: { label: 'Rubin', hint: 'Intensywna czerwień', c: ['#F58A9C', '#B3173C', '#550616'] },
  tanzanit: { label: 'Tanzanit', hint: 'Fiolet wpadający w błękit', c: ['#B0A2F2', '#5B47B8', '#2A1C6A'] },
  morganit: { label: 'Morganit', hint: 'Delikatny róż brzoskwini', c: ['#FCE3DC', '#E7A9A2', '#B06D6B'] },
  topaz: { label: 'Topaz niebieski', hint: 'Jasny, chłodny błękit', c: ['#B4E7F5', '#3C9CC4', '#195674'] },
  wlasny: { label: 'Mój kamień', hint: 'Przyniesiesz własny', c: ['#E9E7E1', '#A9A69E', '#5E5B55'] },
}

const CX = 200
const CY = 242
const R = 116
const SY = 100
const S = 46

const f = (n: number) => Math.round(n * 10) / 10

function abs(cmds: Cmd[], s: number, cx: number, cy: number): string {
  return cmds
    .map((c) => c[0] + c[1].map((p) => `${f(cx + p[0] * s)} ${f(cy + p[1] * s)}`).join(' '))
    .join(' ')
}

function sample(cmds: Cmd[]): Point[] {
  const pts: Point[] = []
  let cur: Point = [0, 0]
  cmds.forEach((c) => {
    const [t, p] = c
    if (t === 'M') {
      cur = p[0]
      pts.push(cur)
    } else if (t === 'L') {
      for (let i = 1; i <= 16; i++) {
        const u = i / 16
        pts.push([cur[0] + (p[0][0] - cur[0]) * u, cur[1] + (p[0][1] - cur[1]) * u])
      }
      cur = p[0]
    } else if (t === 'C') {
      for (let j = 1; j <= 24; j++) {
        const v = j / 24
        const a = Math.pow(1 - v, 3)
        const b = 3 * Math.pow(1 - v, 2) * v
        const d = 3 * (1 - v) * v * v
        const e = v * v * v
        pts.push([
          a * cur[0] + b * p[0][0] + d * p[1][0] + e * p[2][0],
          a * cur[1] + b * p[0][1] + d * p[1][1] + e * p[2][1],
        ])
      }
      cur = p[2]
    }
  })
  return pts
}

function atAngle(pts: Point[], deg: number): Point {
  const target = (deg * Math.PI) / 180
  let best = pts[0]
  let bd = 9
  pts.forEach((p) => {
    const a = Math.atan2(p[1], p[0])
    const d = Math.abs(Math.atan2(Math.sin(a - target), Math.cos(a - target)))
    if (d < bd) {
      bd = d
      best = p
    }
  })
  return best
}

function evenly(pts: Point[], spacing: number, scale: number): Point[] {
  const out: Point[] = [pts[0]]
  let acc = 0
  let prev = pts[0]
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i]
    const dx = (p[0] - prev[0]) * scale
    const dy = (p[1] - prev[1]) * scale
    acc += Math.sqrt(dx * dx + dy * dy)
    if (acc >= spacing) {
      out.push(p)
      acc = 0
    }
    prev = p
  }
  const first = out[0]
  const last = out[out.length - 1]
  if (out.length > 2 && Math.hypot((last[0] - first[0]) * scale, (last[1] - first[1]) * scale) < spacing * 0.75) out.pop()
  return out
}

function circles(list: Point[], r: number): string {
  return list
    .map((p) => `M${f(p[0] - r)} ${f(p[1])} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`)
    .join(' ')
}

function facetLines(cmds: Cmd[], kind: Kind, s: number, cx: number, cy: number): string {
  if (kind === 'radial') {
    const l: string[] = []
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + (i * Math.PI) / 4
      l.push(
        `M${f(cx + Math.cos(a) * s * 0.35)} ${f(cy + Math.sin(a) * s * 0.35)} L${f(cx + Math.cos(a) * s * 1.6)} ${f(cy + Math.sin(a) * s * 1.6)}`,
      )
    }
    return l.join(' ')
  }
  const vs = cmds.filter((c) => c[1].length).map((c) => c[1][c[1].length - 1])
  let out = vs
    .map((p) => `M${f(cx + p[0] * s)} ${f(cy + p[1] * s)} L${f(cx + p[0] * s * 0.5)} ${f(cy + p[1] * s * 0.5)}`)
    .join(' ')
  out += ' ' + abs(cmds, s * 0.75, cx, cy)
  if (kind === 'princess') {
    const q = s * 0.43
    out += ` M${f(cx - q)} ${f(cy - q)} L${f(cx + q)} ${f(cy + q)} M${f(cx + q)} ${f(cy - q)} L${f(cx - q)} ${f(cy + q)}`
  }
  return out
}

export type RingState = {
  gem: GemId
  cut: CutId
  setting: SettingId
  metal: MetalId
  width: WidthId
  pave: PaveId
}

const THICKNESS: Record<WidthId, number> = { cienka: 10, klasyczna: 14, szeroka: 19 }

export function computeRing(st: RingState) {
  const cut = CUTS[st.cut]
  const gem = GEMS[st.gem]
  const th = THICKNESS[st.width]
  const r = R - th
  const bandPath = `M${CX - R} ${CY} a${R} ${R} 0 1 0 ${2 * R} 0 a${R} ${R} 0 1 0 ${-2 * R} 0 Z M${CX - r} ${CY} a${r} ${r} 0 1 1 ${2 * r} 0 a${r} ${r} 0 1 1 ${-2 * r} 0 Z`
  const hlR = R - th * 0.35
  const a1 = (205 * Math.PI) / 180
  const a2 = (245 * Math.PI) / 180
  const pts = sample(cut.cmds)
  const setting = st.setting
  const stoneScale = setting === 'trylogia' ? S * 0.86 : S
  const prongAngles = setting === 'lapki-6' ? [30, 90, 150, 210, 270, 330] : cut.p4
  const showProngs = setting !== 'kaszta'
  const prongs: Point[] = showProngs
    ? prongAngles.map((d) => {
        const p = atAngle(pts, d)
        return [CX + p[0] * stoneScale * 1.02, SY + p[1] * stoneScale * 1.02] as Point
      })
    : []
  const haloScale = stoneScale * 1.36
  const haloDots: Point[] =
    setting === 'halo'
      ? evenly(pts, 13, haloScale).map((p) => [CX + p[0] * haloScale, SY + p[1] * haloScale] as Point)
      : []
  const trio = setting === 'trylogia'
  const side: Point[] = [[CX - 66, 143], [CX + 66, 143]]
  const round = ell(1, 1)
  const sideS = 23
  const pave: Point[] = []
  if (st.pave === 'tak') {
    const pr = R - th / 2
    for (let deg = 198; deg <= 342; deg += 5.5) {
      if (deg > 236 && deg < 304) continue
      const ar = (deg * Math.PI) / 180
      pave.push([CX + Math.cos(ar) * pr, CY + Math.sin(ar) * pr])
    }
  }
  const band = st.metal === 'ag' ? 'ag' : 'au'
  const head = st.metal === 'au' ? 'au' : 'ag'
  const sideProngPoints = side.flatMap((c) =>
    [45, 135, 225, 315].map((d) => {
      const a = (d * Math.PI) / 180
      return [c[0] + Math.cos(a) * sideS, c[1] + Math.sin(a) * sideS] as Point
    }),
  )
  return {
    bandPath,
    innerRing: `M${CX - r} ${CY} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`,
    highlight: `M${f(CX + Math.cos(a1) * hlR)} ${f(CY + Math.sin(a1) * hlR)} A${hlR} ${hlR} 0 0 1 ${f(CX + Math.cos(a2) * hlR)} ${f(CY + Math.sin(a2) * hlR)}`,
    bandFill: `url(#kr-${band})`,
    headFill: `url(#kr-${head})`,
    gemPath: abs(cut.cmds, stoneScale, CX, SY),
    gemTable: abs(cut.cmds, stoneScale * 0.5, CX, SY),
    gemLines: facetLines(cut.cmds, cut.kind, stoneScale, CX, SY),
    glint: `M${f(CX - stoneScale * 0.42)} ${f(SY - stoneScale * 0.3)} l${f(stoneScale * 0.16)} ${f(-stoneScale * 0.16)} l${f(stoneScale * 0.07)} ${f(stoneScale * 0.07)} Z`,
    g1: gem.c[0],
    g2: gem.c[1],
    g3: gem.c[2],
    gemStroke: gem.c[2],
    prongPath: circles(prongs, setting === 'lapki-6' ? 5.2 : 6),
    prongDisplay: showProngs,
    bezelPath: abs(cut.cmds, stoneScale * 1.17, CX, SY),
    bezelDisplay: setting === 'kaszta',
    haloMetal: abs(cut.cmds, haloScale, CX, SY),
    haloDots: circles(haloDots, 4.6),
    haloDisplay: setting === 'halo',
    sidePath: trio ? side.map((c) => abs(round, sideS, c[0], c[1])).join(' ') : 'M0 0',
    sideTable: trio ? side.map((c) => abs(round, sideS * 0.5, c[0], c[1])).join(' ') : 'M0 0',
    sideLines: trio ? side.map((c) => facetLines(round, 'radial', sideS, c[0], c[1])).join(' ') : 'M0 0',
    sideProngs: trio ? circles(sideProngPoints, 3.8) : 'M0 0',
    trioDisplay: trio,
    pavePath: pave.length ? circles(pave, Math.max(2.4, th * 0.2)) : 'M0 0',
    paveDisplay: pave.length > 0,
  }
}
