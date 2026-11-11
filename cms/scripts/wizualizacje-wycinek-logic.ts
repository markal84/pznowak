/**
 * Zlecenie Y.2: wizualizacje „w wycinku”. Zamiast prosić generator o cały kadr i szukać potem kamienia w różnicy
 * oryginał ↔ wynik (to zawodziło przy białym diamencie: biały kamień i białe odblaski w fasetach różnią się od
 * oryginału za mało), maskę kamienia wyznaczamy NA ORYGINALE – po kolorze kamienia oryginału (np. niebieski diament
 * w Cyane, różowe szafiry w Aion) w obszarze podpowiedzi. Generator dostaje tylko kwadratowy wycinek wokół kamienia,
 * a do zdjęcia wraca wyłącznie obszar maski; reszta kadru zostaje pikselami oryginału.
 *
 * Weryfikacja automatyczna (bez modelu, przed oceną Terry): (a) poza maską brak zmian, (b) w masce kolor zgodny
 * z kamieniem – dla bieli „jasny, bezbarwny, z ogniem” zamiast „różny od oryginału”, (c) wokół maski generator nie
 * przesunął oprawy (inaczej na granicy wklejenia byłby szew).
 *
 * Tylko czyste funkcje na surowych pikselach (RGB, wiersz po wierszu) – obróbkę plików robi `wizualizacje-wycinek-obraz.ts`.
 */
import { convexHull } from './wizualizacje-w-logic'

/** Zakres odcienia w stopniach (kąt h w Lab, 0–360); `[od, do]` z `od > do` przechodzi przez 0 (np. róż/czerwień). */
export type HueRange = [number, number]

/** Jak rozpoznać kamień oryginału na zdjęciu (w `wizualizacje-w.json`: `kamien_oryginalu` przy fasonie lub zdjęciu). */
export type OriginalStoneHint = {
  odcien: HueRange
  /** Minimalne nasycenie (C* w Lab) piksela kamienia; domyślnie 14. */
  chroma_min?: number
  /**
   * Ręczna podpowiedź obszaru `[x0, y0, x1, y1]` (ułamki kadru). Bez niej obszar bierzemy z maski fasonu
   * (przyjęty wcześniej wariant), a bez obu – cały kadr.
   */
  obszar?: [number, number, number, number]
  /**
   * Kamień bezbarwny albo wielobarwny (diament, mystic topaz): maska = elipsa wpisana w `obszar`, bez szukania koloru.
   * Wymaga `obszar` dokładnie obejmującego kamień.
   */
  maska_z_obszaru?: boolean
  /** `wiele`: każda plama koloru osobno (kilka kamieni albo kamień z boku: korona i pawilon rozdzielone oprawą). */
  maska?: 'jeden' | 'wiele'
}

/** Kryteria koloru w masce wyniku (w `kamienie.<klucz>.kontrola`). Kamień bez `kontrola` sprawdza tylko resztki starego koloru. */
export type StoneCheck = {
  /** Biały diament: jasny, bezbarwny, z ogniem. */
  bialy?: boolean
  /** Odcień kamienia docelowego (kolorowe kamienie). */
  odcien?: HueRange
  /** Minimalna mediana nasycenia (C*) pikseli kamienia (kolorowe kamienie). */
  chroma_min?: number
}

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lin = (c: number) => {
    const v = c / 255
    return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92
  }
  const [R, G, B] = [lin(r), lin(g), lin(b)]
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047)
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B)
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883)
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)]
}

/** L, C (nasycenie) i h (odcień, stopnie) każdego piksela. */
export function lch(rgb: Uint8Array | Buffer, n: number) {
  const L = new Float32Array(n)
  const C = new Float32Array(n)
  const H = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const [l, a, b] = rgbToLab(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2])
    L[i] = l
    C[i] = Math.hypot(a, b)
    H[i] = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
  }
  return { L, C, H }
}

export const inHue = (h: number, [from, to]: HueRange) => (from <= to ? h >= from && h <= to : h >= from || h <= to)

/** Złoto oprawy (łapki nachodzą na kamień): ciepły żółty/pomarańczowy, nie liczy się do koloru kamienia. */
const GOLD: HueRange = [55, 100]

/** Spójne obszary (8-sąsiedztwo) pikseli `on`; zwraca etykiety i rozmiary (indeks 0 = tło). */
function components(on: Uint8Array, width: number) {
  const n = on.length
  const label = new Int32Array(n)
  const sizes: number[] = [0]
  const stack: number[] = []
  let current = 0
  for (let start = 0; start < n; start++) {
    if (!on[start] || label[start]) continue
    current++
    let size = 0
    label[start] = current
    stack.push(start)
    while (stack.length) {
      const p = stack.pop()!
      size++
      const x = p % width
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          if ((dx < 0 && x === 0) || (dx > 0 && x === width - 1)) continue
          const q = p + dy * width + dx
          if (q >= 0 && q < n && on[q] && !label[q]) {
            label[q] = current
            stack.push(q)
          }
        }
      }
    }
    sizes.push(size)
  }
  return { label, sizes }
}

export function growMask(mask: Uint8Array, width: number, steps: number) {
  let out = mask
  const n = mask.length
  for (let g = 0; g < steps; g++) {
    const next = out.slice()
    for (let i = 0; i < n; i++) {
      if (out[i]) continue
      const x = i % width
      if ((i >= width && out[i - width]) || (i + width < n && out[i + width]) || (x > 0 && out[i - 1]) || (x < width - 1 && out[i + 1])) next[i] = 1
    }
    out = next
  }
  return out
}

function fillHull(mask: Uint8Array, width: number, points: [number, number][]) {
  const hull = convexHull(points)
  if (hull.length < 3) {
    for (const [x, y] of points) mask[y * width + x] = 1
    return
  }
  const xs = hull.map((p) => p[0])
  const ys = hull.map((p) => p[1])
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
    for (let x = Math.min(...xs); x <= Math.max(...xs); x++) {
      let inside = true
      for (let i = 0; i < hull.length && inside; i++) {
        const [ax, ay] = hull[i]
        const [bx, by] = hull[(i + 1) % hull.length]
        if ((bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0) inside = false
      }
      if (inside) mask[y * width + x] = 1
    }
  }
}

/** Obszar podpowiedzi jako maska: ręczny prostokąt albo maska fasonu poszerzona o ~4 % szerokości kadru. */
export function hintRegion(width: number, height: number, hint: OriginalStoneHint, prior?: Uint8Array | null): Uint8Array {
  const n = width * height
  if (hint.obszar) {
    const [x0, y0, x1, y1] = hint.obszar
    const region = new Uint8Array(n)
    for (let y = Math.floor(y0 * height); y < Math.ceil(y1 * height); y++) {
      for (let x = Math.floor(x0 * width); x < Math.ceil(x1 * width); x++) region[y * width + x] = 1
    }
    return region
  }
  if (prior && prior.some(Boolean)) return growMask(Uint8Array.from(prior, (v) => (v ? 1 : 0)), width, Math.round(width * 0.04))
  return new Uint8Array(n).fill(1)
}

/**
 * Maska kamienia (albo kamieni) oryginału: piksele w odcieniu kamienia oryginału i z nasyceniem od `chroma_min`,
 * w obszarze podpowiedzi. `jeden`: największy spójny obszar → otoczka wypukła (szlif ma wypukły obrys, więc
 * wypełnia też białe odblaski i ciemne fasety, które koloru nie mają). `wiele` (obrączka): każdy obszar od 0,02 %
 * kadru osobno. Na koniec poszerzenie o `grow` px – krawędź kamienia pod łapkami też ma stary kolor.
 * null, gdy nic nie pasuje albo wynik nie wygląda na kamień (za mały / ponad 30 % kadru).
 */
export function originalStoneMask(
  rgb: Uint8Array | Buffer,
  width: number,
  height: number,
  hint: OriginalStoneHint,
  region: Uint8Array,
  mode: 'jeden' | 'wiele' = 'jeden',
  grow = 2,
) {
  const n = width * height
  if (hint.maska_z_obszaru && hint.obszar) {
    const [x0, y0, x1, y1] = hint.obszar
    const cx = ((x0 + x1) / 2) * width
    const cy = ((y0 + y1) / 2) * height
    const rx = ((x1 - x0) / 2) * width
    const ry = ((y1 - y0) / 2) * height
    const ellipse = new Uint8Array(n)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) ellipse[y * width + x] = 1
    }
    const area = ellipse.reduce((sum, v) => sum + v, 0)
    return area ? { mask: Uint8Array.from(ellipse, (v) => (v ? 255 : 0)), area: area / n } : null
  }
  const { C, H } = lch(rgb, n)
  const chromaMin = hint.chroma_min ?? 14
  const on = new Uint8Array(n)
  for (let i = 0; i < n; i++) on[i] = region[i] && C[i] >= chromaMin && inHue(H[i], hint.odcien) ? 1 : 0
  // Odblaski tną kamień na wyspy: domknięcie o 1 px skleja je w jeden obszar przed wyborem największego.
  const { label, sizes } = components(growMask(on, width, 1), width)
  let mask = new Uint8Array(n)
  if (mode === 'wiele') {
    const minSize = Math.max(6, n * 0.0002)
    const groups = new Map<number, [number, number][]>()
    for (let i = 0; i < n; i++) {
      const l = label[i]
      if (!l || sizes[l] < minSize || !on[i]) continue
      if (!groups.has(l)) groups.set(l, [])
      groups.get(l)!.push([i % width, Math.floor(i / width)])
    }
    for (const points of groups.values()) fillHull(mask, width, points)
  } else {
    let best = 0
    for (let l = 1; l < sizes.length; l++) if (sizes[l] > (sizes[best] ?? 0)) best = l
    if (!best || sizes[best] < n * 0.0005) return null
    // Kamień bywa pocięty łapkami i ciemnymi fasetami na kilka plam koloru (korona i pawilon przy ujęciu z boku):
    // bierzemy też plamy od 4 % największej, które leżą przy niej (w jej obrysie poszerzonym o połowę wymiaru).
    const boxes = new Map<number, { x0: number; x1: number; y0: number; y1: number }>()
    for (let i = 0; i < n; i++) {
      const l = label[i]
      if (!l) continue
      const x = i % width
      const y = Math.floor(i / width)
      const b = boxes.get(l)
      if (!b) boxes.set(l, { x0: x, x1: x, y0: y, y1: y })
      else {
        if (x < b.x0) b.x0 = x
        if (x > b.x1) b.x1 = x
        if (y < b.y0) b.y0 = y
        if (y > b.y1) b.y1 = y
      }
    }
    const main = boxes.get(best)!
    const mx = (main.x1 - main.x0 + 1) / 2
    const my = (main.y1 - main.y0 + 1) / 2
    const keep = new Set<number>([best])
    for (const [l, b] of boxes) {
      if (l === best || sizes[l] < sizes[best] * 0.04) continue
      const cx = (b.x0 + b.x1) / 2
      const cy = (b.y0 + b.y1) / 2
      if (cx >= main.x0 - mx && cx <= main.x1 + mx && cy >= main.y0 - my && cy <= main.y1 + my) keep.add(l)
    }
    const points: [number, number][] = []
    for (let i = 0; i < n; i++) if (keep.has(label[i]) && on[i]) points.push([i % width, Math.floor(i / width)])
    fillHull(mask, width, points)
  }
  // Obrzeże (Y.2, Cyane: „turkusowy ślad na dolnym styku”): fragmenty starego kamienia widoczne między łapkami tuż za
  // obrysem – piksele w odcieniu kamienia (ten sam próg nasycenia, bo przy niższym łapało szaroniebieskie tło), do
  // 3·`grow` px od maski, dołączone do maski.
  const near = growMask(mask, width, grow * 3)
  for (let i = 0; i < n; i++) if (near[i] && !mask[i] && region[i] && C[i] >= chromaMin * 1.5 && inHue(H[i], hint.odcien)) mask[i] = 1
  mask = growMask(mask, width, grow)
  let area = 0
  for (let i = 0; i < n; i++) area += mask[i]
  if (!area || area / n > 0.3) return null
  return { mask: Uint8Array.from(mask, (v) => (v ? 255 : 0)), area: area / n }
}

export type Box = { left: number; top: number; width: number; height: number }

/**
 * Kwadratowy wycinek wokół maski (współrzędne w pikselach obrazu `width`×`height`): bok = większy wymiar kamienia
 * × (1 + 2·`margin`), co najmniej `minSide`, przesunięty tak, żeby mieścił się w kadrze. Generator dostaje kamień
 * duży i z oprawą dookoła (kontekst światła), a przez kwadrat jego wynik nie jest rozciągany.
 */
export function cropBox(mask: Uint8Array, maskWidth: number, width: number, height: number, margin = 0.6, minSide = 256): Box {
  const maskHeight = mask.length / maskWidth
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue
    const x = i % maskWidth
    const y = Math.floor(i / maskWidth)
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  if (x0 === Infinity) throw new Error('cropBox: pusta maska')
  const sx = width / maskWidth
  const sy = height / maskHeight
  const cx = ((x0 + x1 + 1) / 2) * sx
  const cy = ((y0 + y1 + 1) / 2) * sy
  const stone = Math.max((x1 - x0 + 1) * sx, (y1 - y0 + 1) * sy)
  const side = Math.round(Math.min(Math.max(stone * (1 + 2 * margin), minSide), width, height))
  const left = Math.round(Math.min(Math.max(cx - side / 2, 0), width - side))
  const top = Math.round(Math.min(Math.max(cy - side / 2, 0), height - side))
  return { left, top, width: side, height: side }
}

export type CutoutVerdict = {
  ok: boolean
  /** Udział pikseli poza maską (z marginesem na miękką krawędź), które różnią się od oryginału o ΔE > 2. */
  outsideChanged: number
  /** Mediana ΔE między wynikiem generatora a oryginałem w pierścieniu tuż za maską (oprawa wokół kamienia). */
  ringDelta: number
  inside: {
    meanL: number
    p90L: number
    stdL: number
    /** Mediana nasycenia pikseli kamienia (bez złota łapek). */
    chroma: number
    /** Udział pikseli w odcieniu kamienia oryginału (resztki starego koloru). */
    residue: number
    /** Udział pikseli w odcieniu docelowym wśród nasyconych (kolorowe kamienie). */
    targetShare: number
    /** Udział jasnych, nasyconych iskier w innym odcieniu niż złoto i stary kolor („ogień” diamentu). */
    fire: number
  }
  reasons_pl: string[]
}

export const THRESHOLDS = {
  outsideChanged: 0.001,
  ringDelta: 16,
  residue: 0.06,
  whiteChroma: 9,
  whiteP90L: 72,
  whiteStdL: 12,
  targetShare: 0.5,
} as const

const quantile = (values: number[], q: number) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
}

/**
 * Weryfikacja wycinka. Wszystkie obrazy RGB w tej samej rozdzielczości: `original` – zdjęcie, `result` – zdjęcie po
 * wklejeniu, `generated` – wynik generatora dopasowany do kadru (do pierścienia wokół maski), `mask` 0/255,
 * `core` – maska bez miękkiej krawędzi (do statystyk koloru), `feather` px – szerokość miękkiej krawędzi.
 */
export function verifyCutout(
  input: {
    original: Uint8Array | Buffer
    result: Uint8Array | Buffer
    generated: Uint8Array | Buffer
    mask: Uint8Array
    width: number
    height: number
    feather: number
    /** Poprawka: pas wokół maski, w którym zmiany są zamierzone (0/1); dalej – jak zwykle bez zmian. */
    band?: Uint8Array
  },
  originalHue: HueRange,
  check: StoneCheck | undefined,
): CutoutVerdict {
  const { original, result, generated, mask, width, height, feather, band } = input
  const n = width * height
  const bin = Uint8Array.from(mask, (v) => (v ? 1 : 0))
  const grownMask = growMask(bin, width, feather + 1)
  const outer = band ? Uint8Array.from(grownMask, (v, i) => (v || band[i] ? 1 : 0)) : grownMask
  // pierścień oprawy zawsze wokół maski (nie wokół pasu poprawki): generator nie może przesunąć oprawy tuż przy kamieniu
  const ring = growMask(grownMask, width, Math.max(3, Math.round(Math.sqrt(bin.reduce((s, v) => s + v, 0)) * 0.12)))
  // rdzeń: maska zwężona o szerokość miękkiej krawędzi (odwrotność poszerzenia tła)
  const core = Uint8Array.from(growMask(Uint8Array.from(bin, (v) => 1 - v), width, feather), (v) => 1 - v)

  const o = lch(original, n)
  const r = lch(result, n)
  const g = lch(generated, n)
  const de = (a: ReturnType<typeof lch>, b: ReturnType<typeof lch>, i: number) => {
    const ha = (a.H[i] * Math.PI) / 180
    const hb = (b.H[i] * Math.PI) / 180
    return Math.hypot(a.L[i] - b.L[i], a.C[i] * Math.cos(ha) - b.C[i] * Math.cos(hb), a.C[i] * Math.sin(ha) - b.C[i] * Math.sin(hb))
  }

  let outsideCount = 0
  let outsideChanged = 0
  const ringValues: number[] = []
  const Ls: number[] = []
  const chromas: number[] = []
  let residue = 0
  let saturated = 0
  let target = 0
  let fire = 0
  let coreCount = 0
  for (let i = 0; i < n; i++) {
    if (ring[i] && !grownMask[i]) ringValues.push(de(o, g, i))
    if (!outer[i]) {
      outsideCount++
      if (de(o, r, i) > 2) outsideChanged++
      continue
    }
    if (!core[i]) continue
    coreCount++
    const L = r.L[i]
    const C = r.C[i]
    const h = r.H[i]
    Ls.push(L)
    const gold = C >= 12 && inHue(h, GOLD)
    if (!gold) chromas.push(C)
    if (C >= 15 && inHue(h, originalHue) && !(check?.odcien && inHue(h, check.odcien))) residue++
    if (C >= 15 && !gold) {
      saturated++
      if (check?.odcien && inHue(h, check.odcien)) target++
    }
    if (L >= 60 && C >= 18 && !gold && !inHue(h, originalHue)) fire++
  }
  const meanL = Ls.reduce((s, v) => s + v, 0) / Math.max(1, Ls.length)
  const stdL = Math.sqrt(Ls.reduce((s, v) => s + (v - meanL) ** 2, 0) / Math.max(1, Ls.length))
  const verdict: CutoutVerdict = {
    ok: true,
    outsideChanged: outsideChanged / Math.max(1, outsideCount),
    ringDelta: quantile(ringValues, 0.5),
    inside: {
      meanL,
      p90L: quantile(Ls, 0.9),
      stdL,
      chroma: quantile(chromas, 0.5),
      residue: residue / Math.max(1, coreCount),
      targetShare: target / Math.max(1, saturated),
      fire: fire / Math.max(1, coreCount),
    },
    reasons_pl: [],
  }
  const fail = (reason: string) => {
    verdict.ok = false
    verdict.reasons_pl.push(reason)
  }
  const pct = (v: number) => `${(v * 100).toFixed(1)} %`
  if (verdict.outsideChanged > THRESHOLDS.outsideChanged) fail(`poza maską zmieniło się ${pct(verdict.outsideChanged)} pikseli`)
  if (verdict.ringDelta > THRESHOLDS.ringDelta) {
    fail(`generator przesunął albo przerysował oprawę wokół kamienia (ΔE ${verdict.ringDelta.toFixed(1)} > ${THRESHOLDS.ringDelta}) – na granicy byłby szew`)
  }
  const inside = verdict.inside
  // resztki starego koloru liczymy tylko dla kamieni z `kontrola` (np. stonowany szmaragd ma odcień blisko niebieskiego)
  if (check && inside.residue > THRESHOLDS.residue) fail(`w kamieniu zostało ${pct(inside.residue)} starego koloru`)
  if (check?.bialy) {
    if (inside.chroma > THRESHOLDS.whiteChroma) fail(`biel nie jest bezbarwna (nasycenie ${inside.chroma.toFixed(1)} > ${THRESHOLDS.whiteChroma})`)
    if (inside.p90L < THRESHOLDS.whiteP90L) fail(`kamień za ciemny jak na biały diament (jasność p90 ${inside.p90L.toFixed(0)} < ${THRESHOLDS.whiteP90L})`)
    if (inside.stdL < THRESHOLDS.whiteStdL) fail(`kamień płaski, bez blasku (kontrast ${inside.stdL.toFixed(1)} < ${THRESHOLDS.whiteStdL})`)
  } else if (check?.odcien) {
    if (inside.targetShare < THRESHOLDS.targetShare) fail(`za mało docelowego odcienia (${pct(inside.targetShare)} nasyconych pikseli)`)
    if (check.chroma_min && inside.chroma < check.chroma_min) fail(`kolor za blady (nasycenie ${inside.chroma.toFixed(1)} < ${check.chroma_min})`)
  }
  return verdict
}

/** Zdanie do następnej próby z powodów odrzutu automatycznego. */
export function cutoutHint(verdict: CutoutVerdict, check: StoneCheck | undefined): string {
  const parts: string[] = []
  if (verdict.ringDelta > THRESHOLDS.ringDelta) parts.push('keep the prongs, the halo and the metal around the stone pixel-identical and in exactly the same place')
  if (check && verdict.inside.residue > THRESHOLDS.residue) parts.push('remove every trace of the previous stone colour, also at the girdle and under the prongs')
  if (check?.bialy) {
    if (verdict.inside.chroma > THRESHOLDS.whiteChroma) parts.push('the diamond must be truly colourless – no blue, grey or yellow cast')
    if (verdict.inside.p90L < THRESHOLDS.whiteP90L || verdict.inside.stdL < THRESHOLDS.whiteStdL) {
      parts.push('make it bright with crisp contrast between white flashes and dark facets, like a real brilliant-cut diamond')
    }
  } else if (check?.odcien) parts.push('make the colour clearly and evenly the target gemstone colour')
  return parts.length ? `${parts.join('; ')}.` : ''
}

// ---------- poprawka (bez generatora) ----------

/** Lab → sRGB (0–255), odwrotność `rgbToLab`. */
export function labToRgb(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200
  const inv = (f: number) => (f ** 3 > 0.008856 ? f ** 3 : (f - 16 / 116) / 7.787)
  const X = inv(fx) * 0.95047
  const Y = inv(fy)
  const Z = inv(fz) * 1.08883
  const gamma = (c: number) => {
    const v = Math.min(1, Math.max(0, c))
    return Math.round(Math.min(255, Math.max(0, (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255)))
  }
  return [
    gamma(3.2406 * X - 1.5372 * Y - 0.4986 * Z),
    gamma(-0.9689 * X + 1.8758 * Y + 0.0415 * Z),
    gamma(0.0557 * X - 0.204 * Y + 1.057 * Z),
  ]
}

/** Rozmycie Gaussa (separowalne, brzegi powielone). */
export function gaussBlur(values: Float32Array, width: number, height: number, sigma: number): Float32Array {
  const k = Math.ceil(3 * sigma)
  const kernel = Array.from({ length: 2 * k + 1 }, (_, i) => Math.exp(-((i - k) ** 2) / (2 * sigma * sigma)))
  const sum = kernel.reduce((s, v) => s + v, 0)
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum
  const tmp = new Float32Array(values.length)
  const out = new Float32Array(values.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let s = 0
      for (let j = -k; j <= k; j++) s += kernel[j + k] * values[y * width + Math.min(width - 1, Math.max(0, x + j))]
      tmp[y * width + x] = s
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let s = 0
      for (let j = -k; j <= k; j++) s += kernel[j + k] * tmp[Math.min(height - 1, Math.max(0, y + j)) * width + x]
      out[y * width + x] = s
    }
  }
  return out
}

/** Poszerzenie maski kołem o promieniu `radius` px (odległość euklidesowa, przybliżenie fazowe 3–4). */
export function dilateDisc(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const INF = 1e9
  const d = new Float32Array(mask.length).fill(INF)
  for (let i = 0; i < mask.length; i++) if (mask[i]) d[i] = 0
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= width || y >= height ? INF : d[y * width + x])
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      d[i] = Math.min(d[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4)
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x
      d[i] = Math.min(d[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4)
    }
  }
  return Uint8Array.from(d, (v) => (v <= radius * 3 ? 1 : 0))
}

/** Odległość kątowa odcieni (stopnie, 0–180). */
const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

export type StoneFixOptions = {
  /** Odcień kamienia oryginału (`kamien_oryginalu.odcien`); pełne koło [0, 360] = niebieski [200, 280]. */
  originalHue: HueRange
  /** Pas wokół maski (ułamek większego wymiaru kamienia); domyślnie 0.12, czyli promień ≈ 6 %. */
  bandFrac?: number
  /** Szafir granatowy: docelowa mediana L w masce (gamma na L/100), np. 12 albo 14. */
  lift?: number
  /** Mnożnik nasycenia w masce (np. 0.85 – stonowany szmaragd). */
  calm?: number
  /** Detal faset z oryginału: L += detail · (L_oryg − blur(L_oryg, σ 2.5)). */
  detail?: number
  /**
   * Drugi, szerszy pas (ułamek większego wymiaru kamienia, np. 0.25) na odbicia starego kamienia w diamentach bocznych
   * i metalu: jasne piksele (L ≥ 45) w odcieniu starego kamienia ±20°, C ≥ 6, poza maską – odbarwione (C × 0.35), złoto nietknięte.
   */
  reflectFrac?: number
}

export type StoneFixStats = {
  bandPx: number
  spillPx: number
  /** Odbarwione odbicia starego koloru (drugi pas). */
  reflectPx?: number
  maskPx: number
  targetHue: number
  targetChroma: number
  lift?: [number, number]
}

/**
 * Poprawka lokalna wyniku po wklejeniu (bez generatora): stary kolor przy krawędzi kamienia (także tuż za maską –
 * rondysta i pawilon widoczne pod galerią) dostaje odcień docelowy z wnętrza kamienia; szafir granatowy opcjonalnie
 * rozjaśniony (gamma na L), szmaragd opcjonalnie stonowany i z detalem faset oryginału. Zmienia wyłącznie piksele
 * w pasie `band` (maska poszerzona o ≈ 6 % wymiaru kamienia). Obrazy RGB w tej samej rozdzielczości, `mask` 0/1.
 */
export function stoneFix(
  result: Uint8Array | Buffer,
  original: Uint8Array | Buffer,
  mask: Uint8Array,
  width: number,
  height: number,
  options: StoneFixOptions,
): { rgb: Uint8Array; band: Uint8Array; stats: StoneFixStats } {
  const n = width * height
  const L = new Float32Array(n)
  const A = new Float32Array(n)
  const B = new Float32Array(n)
  const C = new Float32Array(n)
  const H = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const [l, a, b] = rgbToLab(result[i * 3], result[i * 3 + 1], result[i * 3 + 2])
    L[i] = l
    A[i] = a
    B[i] = b
    C[i] = Math.hypot(a, b)
    H[i] = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360
  }
  let [x0, y0, x1, y1] = [width, height, -1, -1]
  let maskPx = 0
  for (let i = 0; i < n; i++) {
    if (!mask[i]) continue
    maskPx++
    const x = i % width
    const y = (i - x) / width
    x0 = Math.min(x0, x)
    x1 = Math.max(x1, x)
    y0 = Math.min(y0, y)
    y1 = Math.max(y1, y)
  }
  const size = Math.max(x1 - x0, y1 - y0, 1)
  const radius = Math.max(2, Math.round((size * (options.bandFrac ?? 0.12)) / 2))
  const inner = dilateDisc(mask, width, height, radius)
  const wide = options.reflectFrac ? dilateDisc(mask, width, height, Math.max(radius, Math.round((size * options.reflectFrac) / 2))) : inner
  const band = Uint8Array.from(inner, (v, i) => (v || wide[i] ? 1 : 0))

  // odcień docelowy: moda histogramu odcienia (kosze 10°, wygładzone ±1 kosz, ważone C) w masce, bez złota
  const hist = new Float64Array(36)
  for (let i = 0; i < n; i++) if (mask[i] && C[i] >= 12 && !inHue(H[i], GOLD)) hist[Math.min(35, Math.floor(H[i] / 10))] += C[i]
  let best = 0
  let bestValue = -1
  for (let k = 0; k < 36; k++) {
    const v = hist[(k + 35) % 36] + hist[k] + hist[(k + 1) % 36]
    if (v > bestValue) [best, bestValue] = [k, v]
  }
  const target = best * 10 + 5
  const near = (h: number) => hueDistance(h, target) <= 28

  // „stary kolor”: odcień kamienia oryginału ±20°, z dala od docelowego
  const [from, to] = options.originalHue
  const full = to - from >= 355 || (to - from + 360) % 360 >= 355
  const old: HueRange = full ? [200, 280] : [(from - 20 + 360) % 360, (to + 20) % 360]
  const spill = new Float32Array(n)
  const reflect = new Float32Array(n)
  let spillPx = 0
  let reflectPx = 0
  for (let i = 0; i < n; i++) {
    if (!band[i] || !inHue(H[i], old) || near(H[i]) || inHue(H[i], GOLD)) continue
    // jasne odbicia poza maską (diamenty boczne, metal): odbarwić, nie przemalowywać na kolor docelowy
    if (options.reflectFrac && !mask[i] && L[i] >= 45 && C[i] >= 6) {
      reflect[i] = 1
      reflectPx++
    } else if (inner[i] && C[i] >= 5 && L[i] >= 12) {
      spill[i] = 1
      spillPx++
    }
  }
  const good: number[] = []
  const colored: number[] = []
  for (let i = 0; i < n; i++) {
    if (!mask[i]) continue
    if (C[i] >= 12) colored.push(C[i])
    if (near(H[i]) && C[i] >= 10) good.push(C[i])
  }
  const targetChroma = good.length > 50 ? quantile(good, 0.75) : quantile(colored, 0.5)
  const th = (target * Math.PI) / 180
  const w = gaussBlur(spill, width, height, 1.5)
  for (let i = 0; i < n; i++) {
    const wi = band[i] ? Math.min(1, w[i]) : 0
    if (!wi) continue
    const c = Math.min(C[i], targetChroma)
    A[i] = A[i] * (1 - wi) + c * Math.cos(th) * wi
    B[i] = B[i] * (1 - wi) + c * Math.sin(th) * wi
  }
  if (reflectPx) {
    const wr = gaussBlur(reflect, width, height, 1.5)
    for (let i = 0; i < n; i++) {
      // tylko piksele odcienia starego kamienia (rozmycie nie przechodzi na złoto ani na sąsiednie kolory)
      const wi = band[i] && !mask[i] && inHue(H[i], old) && !near(H[i]) && !inHue(H[i], GOLD) ? Math.min(1, Math.max(reflect[i], wr[i])) : 0
      if (!wi) continue
      // oznaczony piksel w pełni (drobne iskry), rozmycie tylko miękko domyka brzeg
      const m = 1 - wi * 0.65
      A[i] *= m
      B[i] *= m
    }
  }

  const stats: StoneFixStats = { bandPx: band.reduce((s, v) => s + v, 0), spillPx, maskPx, targetHue: target, targetChroma }
  if (options.reflectFrac) stats.reflectPx = reflectPx
  const soft = gaussBlur(Float32Array.from(mask), width, height, 2)
  if (options.lift) {
    const inside: number[] = []
    for (let i = 0; i < n; i++) if (mask[i]) inside.push(L[i])
    const p50 = quantile(inside, 0.5)
    if (p50 < options.lift) {
      const g = Math.log(options.lift / 100) / Math.log(Math.max(p50, 1) / 100)
      for (let i = 0; i < n; i++) {
        if (!soft[i]) continue
        const Ln = 100 * (Math.min(100, Math.max(0, L[i])) / 100) ** g
        const ratio = Math.min(1.6, Math.max(1, (Ln + 1) / (L[i] + 1)))
        const m = 1 - soft[i] + soft[i] * ratio
        A[i] *= m
        B[i] *= m
        L[i] = L[i] * (1 - soft[i]) + Ln * soft[i]
      }
      const after: number[] = []
      for (let i = 0; i < n; i++) if (mask[i]) after.push(L[i])
      stats.lift = [Number(p50.toFixed(1)), Number(quantile(after, 0.5).toFixed(1))]
    }
  }
  if (options.detail) {
    const Lo = new Float32Array(n)
    for (let i = 0; i < n; i++) Lo[i] = rgbToLab(original[i * 3], original[i * 3 + 1], original[i * 3 + 2])[0]
    const blurred = gaussBlur(Lo, width, height, 2.5)
    for (let i = 0; i < n; i++) L[i] += options.detail * (Lo[i] - blurred[i]) * soft[i]
  }
  if (options.calm !== undefined && options.calm !== 1) {
    for (let i = 0; i < n; i++) {
      const m = 1 - soft[i] + soft[i] * options.calm
      A[i] *= m
      B[i] *= m
    }
  }
  const rgb = Uint8Array.from(result)
  for (let i = 0; i < n; i++) {
    if (!band[i]) continue
    const [r, g, b] = labToRgb(Math.min(100, Math.max(0, L[i])), A[i], B[i])
    rgb[i * 3] = r
    rgb[i * 3 + 1] = g
    rgb[i * 3 + 2] = b
  }
  return { rgb, band, stats }
}

/** Siła poprawki dla kamienia: próba 1 łagodna, próba 2 mocniejsza (szafir: jaśniej, szmaragd: stonowany + detal faset). */
export function stoneFixOptions(stoneKey: string, originalHue: HueRange, strength: 1 | 2): StoneFixOptions {
  const options: StoneFixOptions = { originalHue, reflectFrac: 0.25 }
  if (stoneKey.startsWith('szafir')) options.lift = strength === 1 ? 12 : 14
  if (stoneKey.startsWith('szmaragd') && strength === 2) {
    options.calm = 0.85
    options.detail = 0.4
  }
  return options
}

/** Zarzut geometrii w ocenie Terry (obrys, szlif, rozmiar, położenie, „wklejony”) – tego poprawka koloru nie naprawi. */
const GEOMETRY = /obrys|szlif|kształt|rozmiar|wielkoś|położeni|przesun|większ|mniejsz|wklejon|zniekształc|proporcj/i
const NEGATIVE = /\bnie\b|zmien|większ|mniejsz|przesun|wklejon|odbieg|niezgod|zniekształc|\binn[yaei]\b|sugeruj|zaburz/i
/** Zarzut koloru: stary kolor, obwódka, fiolet/róż/turkus/niebieski przy krawędzi, za ciemny/czarny, za intensywny. */
const COLOUR =
  /star\w* (kolor|barw)|pozostałoś|resztk|obwódk|poświat|fiolet|różow|turkus|niebiesk|(za|zbyt|bardziej) (ciemn|intensywn|mocn|nasycon)|spokojniejsz|czarn|pierwotn\w* barw/i
/** Zdanie stwierdzające brak wady („nie widać poświaty”) nie jest zarzutem. */
const DENIAL = /nie widać|\bbrak\w*\b|\bbez\b/i

export type FixQualification = { ok: boolean; why_pl: string }

/** Czy odrzucona próba nadaje się na źródło poprawki (score ≥ 72, ten sam pierścionek i szlif, zarzut koloru, nie geometrii). */
export function fixQualifies(check: {
  score: number
  same_ring: boolean
  stone_cut_preserved: boolean
  reason_pl: string
  artifacts_pl: string[]
}): FixQualification {
  if (check.score < 72) return { ok: false, why_pl: `score ${check.score} < 72` }
  if (!check.same_ring || !check.stone_cut_preserved) return { ok: false, why_pl: 'zarzut geometrii (same_ring / stone_cut_preserved = false)' }
  const sentences = [check.reason_pl, ...check.artifacts_pl].flatMap((t) => t.split(/(?<=[.;])\s+/))
  const geometry = sentences.find((t) => GEOMETRY.test(t) && NEGATIVE.test(t))
  if (geometry) return { ok: false, why_pl: `zarzut geometrii: „${geometry.trim()}”` }
  const colour = sentences.find((t) => COLOUR.test(t) && !DENIAL.test(t))
  if (!colour) return { ok: false, why_pl: 'zarzut nie dotyczy koloru' }
  return { ok: true, why_pl: `zarzut koloru: „${colour.trim()}”` }
}

// ---------- kamienie bezbarwne: maska i przemalowanie lokalne (prototyp Celaeno) ----------

/** Wąski pas wzdłuż łamanej (rząd pavé): punkty w ułamkach kadru, `szerokosc` – połowa szerokości pasa (ułamek szerokości kadru). */
export type PaveStrip = {
  punkty: [number, number][]
  szerokosc: number
  /** Plamy dalej od linii niż `odchylenie` × połowa szerokości to nie kamienie rzędu (domyślnie 1 – cały pas). */
  odchylenie?: number
}

/** Maska pasów (0/1): piksele w odległości ≤ połowa szerokości od którejś łamanej. */
export function stripMask(width: number, height: number, strips: PaveStrip[]): Uint8Array {
  const out = new Uint8Array(width * height)
  for (const strip of strips) {
    const r = strip.szerokosc * width
    const pts = strip.punkty.map(([x, y]) => [x * width, y * height] as const)
    for (let s = 0; s + 1 < pts.length; s++) {
      const [ax, ay] = pts[s]
      const [bx, by] = pts[s + 1]
      const [x0, x1] = [Math.max(0, Math.floor(Math.min(ax, bx) - r)), Math.min(width - 1, Math.ceil(Math.max(ax, bx) + r))]
      const [y0, y1] = [Math.max(0, Math.floor(Math.min(ay, by) - r)), Math.min(height - 1, Math.ceil(Math.max(ay, by) + r))]
      const len2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / len2))
          if ((x - ax - t * (bx - ax)) ** 2 + (y - ay - t * (by - ay)) ** 2 <= r * r) out[y * width + x] = 1
        }
      }
    }
  }
  return out
}

/** Zwężenie maski o `steps` px (odwrotność `growMask`). */
export const shrinkMask = (mask: Uint8Array, width: number, steps: number) =>
  Uint8Array.from(growMask(Uint8Array.from(mask, (v) => 1 - v), width, steps), (v) => 1 - v)

/**
 * Maska drobnych kamieni bezbarwnych (diamenty pavé) w pasach rzędów. Pojedynczy piksel nie wystarcza: ciemne fasety
 * diamentu odbijają złoto (ciepłe, C 11–24), a błyski złotych kulek oprawy są prawie bezbarwne (C 4–11, odcień 80–115).
 * Dlatego liczymy gęstość pikseli neutralnych (C < `chromaMax`, bez ciepłych błysków złota) w kółku o promieniu `radius`:
 * kamień to zwarta plama neutralnych pikseli, kulka złota – nie. Z maski wyjęte nasycone złoto (C ≥ 20, odcień 55–100),
 * potem domknięcie i poszerzenie o `grow` px na ciemne fasety na brzegu kamienia.
 */
export function colourlessMask(
  rgb: Uint8Array | Buffer,
  width: number,
  height: number,
  strips: PaveStrip[],
  options: { chromaMax?: number; density?: number; radius?: number; grow?: number } = {},
): Uint8Array {
  const { chromaMax = 10, density = 0.45, radius = 3, grow = 1 } = options
  const n = width * height
  const { L, C, H } = lch(rgb, n)
  const zone = stripMask(width, height, strips)
  const goldSpecular = (i: number) => L[i] > 80 && C[i] >= 4 && inHue(H[i], [70, 125])
  const neutral = Uint8Array.from({ length: n }, (_, i) => (C[i] < chromaMax && L[i] > 6 && !goldSpecular(i) ? 1 : 0))
  // gęstość: suma w kwadracie (2r+1)² z obrazu całkowego
  const sum = new Float64Array((width + 1) * (height + 1))
  for (let y = 0; y < height; y++) {
    let row = 0
    for (let x = 0; x < width; x++) {
      row += neutral[y * width + x]
      sum[(y + 1) * (width + 1) + x + 1] = sum[y * (width + 1) + x + 1] + row
    }
  }
  const area = (2 * radius + 1) ** 2
  const gold = (i: number) => C[i] >= 20 && inHue(H[i], GOLD)
  const dense = new Uint8Array(n)
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const i = y * width + x
      if (!zone[i] || gold(i)) continue
      const [x0, y0, x1, y1] = [x - radius, y - radius, x + radius + 1, y + radius + 1]
      const k = sum[y1 * (width + 1) + x1] - sum[y0 * (width + 1) + x1] - sum[y1 * (width + 1) + x0] + sum[y0 * (width + 1) + x0]
      if (k / area >= density) dense[i] = 1
    }
  }
  const closed = growMask(shrinkMask(growMask(dense, width, 1), width, 1), width, grow)
  return Uint8Array.from(closed, (v, i) => (v && zone[i] && !gold(i) ? 1 : 0))
}

/** Odcień (moda, kosze 10°) i nasycenie (P75) kamienia na zdjęciu wzorca: nasycone piksele poza złotem w zakresie `range`. */
export function referenceColour(
  rgb: Uint8Array | Buffer,
  n: number,
  range: HueRange = [0, 360],
  minChroma = 15,
): { hue: number; chroma: number } {
  const { C, H } = lch(rgb, n)
  const hist = new Float64Array(36)
  // `range`: odcień kamienia (tło i oprawa wzorca bywają nasycone, np. brązowe tło ~45°)
  for (let i = 0; i < n; i++) if (C[i] >= minChroma && !inHue(H[i], GOLD) && inHue(H[i], range)) hist[Math.min(35, Math.floor(H[i] / 10))] += C[i]
  let best = 0
  for (let k = 1; k < 36; k++) {
    const v = (k: number) => hist[(k + 35) % 36] + hist[k] + hist[(k + 1) % 36]
    if (v(k) > v(best)) best = k
  }
  const hue = best * 10 + 5
  const near: number[] = []
  for (let i = 0; i < n; i++) if (C[i] >= minChroma && inHue(H[i], range) && hueDistance(H[i], hue) <= 20) near.push(C[i])
  return { hue, chroma: quantile(near, 0.75) }
}

/**
 * Przemalowanie lokalne kamieni bezbarwnych na kolorowe (bez generatora): w masce odcień i C wzorca, jasność
 * przemapowana liniowo L' = a + b·L (fasety oryginału zostają), najjaśniejsze błyski (L > `highlight`) jaśniejsze
 * i mniej nasycone – jak odblask; miękka krawędź (σ `soft` px).
 */
export function recolourColourless(
  rgb: Uint8Array | Buffer,
  mask: Uint8Array,
  width: number,
  height: number,
  target: { hue: number; chroma: number },
  options: { a?: number; b?: number; highlight?: number; soft?: number } = {},
): Uint8Array {
  const { a = 12, b = 0.45, highlight = 90, soft = 1 } = options
  const n = width * height
  const alpha = gaussBlur(Float32Array.from(mask), width, height, soft)
  const th = (target.hue * Math.PI) / 180
  const out = Uint8Array.from(rgb)
  const top = a + b * highlight
  for (let i = 0; i < n; i++) {
    const w = Math.min(1, mask[i] ? 1 : alpha[i] * 1.5)
    if (w < 0.01) continue
    const [L, A, B] = rgbToLab(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2])
    const Ln = L > highlight ? top + ((L - highlight) / (100 - highlight)) * (95 - top) : a + b * L
    // błysk: im jaśniej, tym mniej nasycony (biało-niebieski odblask zamiast jednolitej plamy)
    const C = target.chroma * (1 - 0.7 * Math.max(0, Math.min(1, (L - highlight + 10) / 20)))
    const [r, g, bl] = labToRgb(L * (1 - w) + Ln * w, A * (1 - w) + C * Math.cos(th) * w, B * (1 - w) + C * Math.sin(th) * w)
    out[i * 3] = r
    out[i * 3 + 1] = g
    out[i * 3 + 2] = bl
  }
  return out
}

// ---------- kamienie pavé jako koła (Celaeno) ----------

export type PaveStone = { strip: number; x: number; y: number; r: number; added: boolean; t: number; /** odległość od linii pasa (px) */ off: number }

/** Rzut punktu na łamaną: długość łuku od początku (px). */
function arcPosition(points: [number, number][], x: number, y: number) {
  let best = { d: Infinity, t: 0 }
  let acc = 0
  for (let s = 0; s + 1 < points.length; s++) {
    const [ax, ay] = points[s]
    const [bx, by] = points[s + 1]
    const len = Math.hypot(bx - ax, by - ay) || 1
    const u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (len * len)))
    const d = Math.hypot(x - ax - u * (bx - ax), y - ay - u * (by - ay))
    if (d < best.d) best = { d, t: acc + u * len }
    acc += len
  }
  return { ...best, length: acc }
}

/** Wielomian stopnia `deg` (najmniejsze kwadraty) y(t); przy za małej liczbie punktów niższy stopień. */
export function polyFit(ts: number[], ys: number[], deg: number): (t: number) => number {
  const d = Math.max(0, Math.min(deg, ts.length - 1))
  const m = d + 1
  const A = Array.from({ length: m }, () => new Array<number>(m + 1).fill(0))
  for (let k = 0; k < ts.length; k++) {
    const pow = Array.from({ length: 2 * m }, (_, j) => ts[k] ** j)
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) A[i][j] += pow[i + j]
      A[i][m] += ys[k] * pow[i]
    }
  }
  for (let i = 0; i < m; i++) {
    let p = i
    for (let r = i + 1; r < m; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r
    ;[A[i], A[p]] = [A[p], A[i]]
    const div = A[i][i] || 1e-12
    for (let j = i; j <= m; j++) A[i][j] /= div
    for (let r = 0; r < m; r++) {
      if (r === i) continue
      const f = A[r][i]
      for (let j = i; j <= m; j++) A[r][j] -= f * A[i][j]
    }
  }
  const c = A.map((row) => row[m])
  return (t: number) => c.reduce((s, ci, j) => s + ci * t ** j, 0)
}

/**
 * Kamienie pavé z plam maski. Plamy jednego kamienia (np. górna i dolna połówka – błysk i faseta) scalone, gdy leżą
 * blisko wzdłuż rzędu (Δ łuku < 0.4 rozstawu). Kamień = koło: środek = centroid, średnica z zasięgu scalonej plamy,
 * nie mniej niż 0.8 mediany rzędu i nie więcej niż 0.9 × odległość do sąsiada (na Celaeno kamienie nie zawsze się
 * stykają – między nimi bywają złote kulki). Plama dalej od linii pasa niż `odchylenie` × połowa szerokości odpada – to
 * błysk obrzeża albo żeberka, nie kamień. Wzdłuż rzędu krzywa (wielomian 2–3 st. po długości łuku pasa); w przerwach
 * ≈ k × rozstaw k − 1 nowych kamieni, o ile koło nie leży w > 50 % na złocie (C ≥ 12, odcień 55–100).
 */
export function paveStones(rgb: Uint8Array | Buffer, mask: Uint8Array, width: number, height: number, strips: PaveStrip[]) {
  const n = width * height
  const { C, H } = lch(rgb, n)
  const { label, sizes } = components(mask, width)
  const K = sizes.length
  const sx = new Float64Array(K)
  const sy = new Float64Array(K)
  const bx0 = new Float64Array(K).fill(Infinity)
  const by0 = new Float64Array(K).fill(Infinity)
  const bx1 = new Float64Array(K).fill(-Infinity)
  const by1 = new Float64Array(K).fill(-Infinity)
  for (let i = 0; i < n; i++) {
    const k = label[i]
    if (!k) continue
    const x = i % width
    const y = (i - x) / width
    sx[k] += x
    sy[k] += y
    bx0[k] = Math.min(bx0[k], x)
    bx1[k] = Math.max(bx1[k], x)
    by0[k] = Math.min(by0[k], y)
    by1[k] = Math.max(by1[k], y)
  }
  const goldShare = (x: number, y: number, r: number) => {
    let gold = 0
    let all = 0
    for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) {
      for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
        if (xx < 0 || yy < 0 || xx >= width || yy >= height || (xx - x) ** 2 + (yy - y) ** 2 > r * r) continue
        all++
        const i = yy * width + xx
        if (C[i] >= 12 && inHue(H[i], GOLD)) gold++
      }
    }
    return all ? gold / all : 1
  }
  const median = (v: number[]) => (v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] : 0)
  type Blob = { x: number; y: number; t: number; d: number; size: number; box: [number, number, number, number] }
  const stones: PaveStone[] = []
  /** Brakujące miejsca odrzucone, bo koło leży w > 50 % na złocie. */
  const skipped: { strip: number; x: number; y: number; gold: number }[] = []
  const before: number[] = []
  const after: number[] = []
  for (const [s, strip] of strips.entries()) {
    const pts = strip.punkty.map(([x, y]) => [x * width, y * height] as [number, number])
    const half = strip.szerokosc * width
    const found: Blob[] = []
    for (let k = 1; k < K; k++) {
      if (sizes[k] < 4) continue
      const x = sx[k] / sizes[k]
      const y = sy[k] / sizes[k]
      const pos = arcPosition(pts, x, y)
      if (pos.d <= half) found.push({ x, y, t: pos.t, d: pos.d, size: sizes[k], box: [bx0[k], by0[k], bx1[k], by1[k]] })
    }
    found.sort((a, b) => a.t - b.t)
    before.push(found.length)
    if (!found.length) {
      after.push(0)
      continue
    }
    // scalanie: przerwy wzdłuż rzędu krótsze niż 0.4 typowego rozstawu (mediana przerw ≥ połowy P75)
    const tGaps = found.slice(1).map((p, i) => p.t - found[i].t)
    const p75 = [...tGaps].sort((a, b) => a - b)[Math.floor(tGaps.length * 0.75)] ?? 0
    const tau = 0.4 * median(tGaps.filter((g) => g >= 0.5 * p75))
    const merged: Blob[] = []
    for (const blob of found) {
      const last = merged[merged.length - 1]
      if (last && blob.t - last.t < tau) {
        const size = last.size + blob.size
        merged[merged.length - 1] = {
          x: (last.x * last.size + blob.x * blob.size) / size,
          y: (last.y * last.size + blob.y * blob.size) / size,
          t: (last.t * last.size + blob.t * blob.size) / size,
          d: (last.d * last.size + blob.d * blob.size) / size,
          size,
          box: [Math.min(last.box[0], blob.box[0]), Math.min(last.box[1], blob.box[1]), Math.max(last.box[2], blob.box[2]), Math.max(last.box[3], blob.box[3])],
        }
      } else merged.push(blob)
    }
    // plama obok rzędu (błysk na obrzeżu albo żeberku, nie kamień): dalej od linii pasa niż `maxOff` – odpada
    const diameterOf = (b: Blob) => Math.max(b.box[2] - b.box[0], b.box[3] - b.box[1]) + 1
    const maxOff = (strip.odchylenie ?? 1) * half
    for (let i = merged.length - 1; i >= 0; i--) if (merged[i].d > maxOff) merged.splice(i, 1)
    const spacing = merged.length > 1 ? median(merged.slice(1).map((p, i) => p.t - merged[i].t)) : 0
    const own = merged.map(diameterOf)
    const rowDiameter = median(own)
    const row: (PaveStone & { own: number })[] = merged.map((p, i) => ({ strip: s, x: p.x, y: p.y, r: 0, added: false, t: p.t, off: p.d, own: own[i] }))
    if (spacing > 0) {
      const deg = merged.length >= 6 ? 3 : 2
      const fx = polyFit(merged.map((p) => p.t), merged.map((p) => p.x), deg)
      const fy = polyFit(merged.map((p) => p.t), merged.map((p) => p.y), deg)
      for (let i = 0; i + 1 < merged.length; i++) {
        const gap = merged[i + 1].t - merged[i].t
        const k = Math.round(gap / spacing)
        for (let j = 1; j < k; j++) {
          const t = merged[i].t + (gap * j) / k
          const [x, y] = [fx(t), fy(t)]
          const gold = goldShare(x, y, rowDiameter / 2)
          if (gold <= 0.5) row.push({ strip: s, x, y, r: 0, added: true, t, off: 0, own: rowDiameter })
          else skipped.push({ strip: s, x, y, gold })
        }
      }
    }
    row.sort((a, b) => a.t - b.t)
    for (const [i, stone] of row.entries()) {
      const near = [row[i - 1], row[i + 1]].filter(Boolean).map((o) => Math.hypot(o.x - stone.x, o.y - stone.y))
      const cap = near.length ? 0.9 * Math.min(...near) : Infinity
      stone.r = Math.min(cap, Math.max(stone.own, 0.8 * rowDiameter)) / 2
      const { own: _own, ...plain } = stone
      stones.push(plain)
    }
    after.push(row.length)
  }
  return { stones, before, after, skipped }
}

/** Maska z kół kamieni (0/1), przycięta do „nie-złota” (C ≥ 20 w odcieniu złota zostaje metalem). */
export function stoneCircleMask(rgb: Uint8Array | Buffer, stones: PaveStone[], width: number, height: number): Uint8Array {
  const n = width * height
  const { C, H } = lch(rgb, n)
  const out = new Uint8Array(n)
  for (const { x, y, r } of stones) {
    for (let yy = Math.max(0, Math.floor(y - r)); yy <= Math.min(height - 1, Math.ceil(y + r)); yy++) {
      for (let xx = Math.max(0, Math.floor(x - r)); xx <= Math.min(width - 1, Math.ceil(x + r)); xx++) {
        const i = yy * width + xx
        if ((xx - x) ** 2 + (yy - y) ** 2 <= r * r && !(C[i] >= 20 && inHue(H[i], GOLD))) out[i] = 1
      }
    }
  }
  return out
}
