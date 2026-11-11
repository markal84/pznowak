/**
 * Fizyka przywieszki w hero: sztywna papierowa przywieszka na krótkim sznurku, obracana wokół szpilki
 * wbitej przy dolnej krawędzi zdjęcia. Sznurek i papier stawiają opór (sprężyna skrętna z utwardzeniem
 * przy większym wychyleniu), powietrze tłumi ruch (opór liniowy i kwadratowy). Dzięki temu przywieszka
 * kołysze się jak prawdziwa, ale nigdy nie odchyla się tak, żeby tekst przestał być czytelny.
 *
 * Trzy stopnie swobody:
 * - `a`  obrót w płaszczyźnie ekranu wokół szpilki (rad, dodatni = zgodnie ze wskazówkami zegara, prawy koniec w dół),
 * - `ry` skręt papieru wokół pionowej osi przez otwór (rad, „trzepot”),
 * - `rx` pochylenie papieru do przodu i do tyłu (rad).
 *
 * Czyste funkcje bez DOM, żeby dało się je testować i stroić osobno.
 */

export type TagState = {
  a: number
  w: number
  ry: number
  wy: number
  rx: number
  wx: number
}

export type TagForces = {
  /** przyspieszenie kątowe obrotu wokół szpilki (rad/s²) */
  alpha: number
  /** przyspieszenie skrętu i pochylenia papieru (rad/s²) */
  alphaY: number
  alphaX: number
  /** kąt spoczynku (rad): lekki zwis plus ewentualne przechylenie telefonu */
  rest: number
}

/** Częstotliwość wahań ok. 1,2 Hz i tłumienie jak dla papieru w powietrzu (kilka wyraźnych wahnięć). */
const SWING_K = (2 * Math.PI * 1.2) ** 2
const SWING_C = 2 * 0.17 * (2 * Math.PI * 1.2)
/** Opór powietrza rośnie z kwadratem prędkości: szybkie machnięcia gasną szybciej niż łagodne kołysanie. */
const SWING_CQ = 0.22
/** Utwardzenie sprężyny: przy ok. 17° opór jest o ~70% większy, więc duże wychylenia są krótkie. */
const SWING_K3 = SWING_K * 8
/** Twarda granica wychylenia (sznurek i papier dalej nie pozwolą). */
export const MAX_SWING = 0.42

const FLUTTER_K = (2 * Math.PI * 2.4) ** 2
const FLUTTER_C = 2 * 0.32 * (2 * Math.PI * 2.4)
export const MAX_FLUTTER = 0.26

/** Lekki zwis prawego końca w spoczynku (ok. 2°), żeby było widać, że przywieszka wisi. */
export const REST_ANGLE = 0.035

export const restState = (): TagState => ({ a: REST_ANGLE, w: 0, ry: 0, wy: 0, rx: 0, wx: 0 })

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** Jeden krok symulacji (półjawny Euler). `dt` w sekundach; dłuższe klatki dzielimy na kroki po maks. 1/240 s. */
export function stepTag(s: TagState, dt: number, f: TagForces): TagState {
  let { a, w, ry, wy, rx, wx } = s
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
  const h = dt / steps
  for (let i = 0; i < steps; i++) {
    const d = a - f.rest
    const acc = f.alpha - SWING_K * d - SWING_K3 * d * d * d - SWING_C * w - SWING_CQ * w * Math.abs(w)
    w += acc * h
    a += w * h
    if (a > f.rest + MAX_SWING) {
      a = f.rest + MAX_SWING
      if (w > 0) w *= -0.25
    } else if (a < f.rest - MAX_SWING) {
      a = f.rest - MAX_SWING
      if (w < 0) w *= -0.25
    }

    wy += (f.alphaY - FLUTTER_K * ry - FLUTTER_C * wy) * h
    ry = clamp(ry + wy * h, -MAX_FLUTTER, MAX_FLUTTER)
    wx += (f.alphaX - FLUTTER_K * rx - FLUTTER_C * wx) * h
    rx = clamp(rx + wx * h, -MAX_FLUTTER, MAX_FLUTTER)
  }
  return { a, w, ry, wy, rx, wx }
}

/** Czy przywieszka już się uspokoiła (wtedy pętla animacji może zasnąć). */
export function isSettled(s: TagState, rest: number): boolean {
  return (
    Math.abs(s.a - rest) < 0.0008 &&
    Math.abs(s.w) < 0.004 &&
    Math.abs(s.ry) < 0.0008 &&
    Math.abs(s.wy) < 0.004 &&
    Math.abs(s.rx) < 0.0008 &&
    Math.abs(s.wx) < 0.004
  )
}

/** Geometria przywieszki względem szpilki (px, układ ekranu, oś y w dół), przy kącie 0. */
export type TagBox = { left: number; top: number; width: number; height: number }

export type PointerSample = {
  /** położenie kursora względem szpilki (px) */
  dx: number
  dy: number
  /** prędkość kursora (px/s) */
  vx: number
  vy: number
}

/**
 * Kursor jak palec lub podmuch:
 * - dotyk (kursor przesuwa się po papierze): koniec przywieszki pod kursorem dąży do prędkości kursora,
 *   czyli przywieszkę można popchnąć, „pogłaskać” albo potrącić; prędkość kątowa ograniczona do czytelnej,
 * - podmuch (kursor obok): słaby moment siły malejący z odległością.
 * `gain` skaluje całą reakcję (prędkość, do której dąży przywieszka, i skręt papieru).
 * Zwraca przyspieszenia (rad/s²) dla obrotu oraz skrętu i pochylenia papieru.
 */
export function pointerForces(p: PointerSample, s: TagState, box: TagBox, gain = 1) {
  const speed = Math.hypot(p.vx, p.vy)
  if (speed < 8) return { alpha: 0, alphaY: 0, alphaX: 0, touching: false }
  const cos = Math.cos(s.a)
  const sin = Math.sin(s.a)
  // Kursor w układzie obróconej przywieszki.
  const lx = p.dx * cos + p.dy * sin
  const ly = -p.dx * sin + p.dy * cos
  const ox = Math.max(box.left - lx, 0, lx - (box.left + box.width))
  const oy = Math.max(box.top - ly, 0, ly - (box.top + box.height))
  const outside = Math.hypot(ox, oy)
  const r2 = p.dx * p.dx + p.dy * p.dy + 1
  // Prędkość kątowa, jaką miałby punkt przywieszki pod kursorem, gdyby nadążał za kursorem.
  const follow = clamp((p.dx * p.vy - p.dy * p.vx) / r2, -3.2, 3.2) * gain
  // Skręt papieru: poziomy ruch kursora „odwraca” papier, pionowy pochyla. Siła rośnie z odległością od szpilki.
  const reach = clamp(lx / Math.max(box.left + box.width, 1), 0, 1)
  const vxN = clamp(p.vx / 1000, -1.6, 1.6)
  const vyN = clamp(p.vy / 1000, -1.6, 1.6)
  if (outside <= 4) {
    return {
      alpha: (follow - s.w) * 9,
      alphaY: -vxN * 55 * (0.35 + reach) * gain,
      alphaX: vyN * 22 * (0.35 + reach) * gain,
      touching: true,
    }
  }
  const fall = Math.exp(-outside / 110)
  if (fall < 0.02) return { alpha: 0, alphaY: 0, alphaX: 0, touching: false }
  return {
    alpha: follow * 1.1 * fall,
    alphaY: -vxN * 16 * fall * gain,
    alphaX: vyN * 7 * fall * gain,
    touching: false,
  }
}

/**
 * Bezwładność przy przewijaniu strony: gdy strona przyspiesza w górę (przewijanie w dół), szpilka jedzie w górę,
 * a środek ciężkości przywieszki (na prawo od szpilki) zostaje w tyle, więc prawy koniec opada.
 * `scrollAcc` to przyspieszenie przewijania (px/s², dodatnie = przewijanie w dół przyspiesza), `width` szerokość przywieszki.
 */
export function scrollForce(scrollAcc: number, s: TagState, width: number): number {
  const acc = clamp(scrollAcc, -24000, 24000)
  return ((acc * 1.5) / Math.max(width, 80)) * 0.22 * Math.cos(s.a)
}

/** Chwyt myszą: przywieszka obraca się tak, by chwycony punkt szedł za kursorem (z oporem i granicą wychylenia). */
export function grabForce(targetAngle: number, s: TagState, rest: number): number {
  const target = clamp(targetAngle, rest - MAX_SWING * 0.85, rest + MAX_SWING * 0.85)
  return (target - s.a) * 190 - s.w * 16
}
