'use client'

import { useEffect, useRef } from 'react'
import Tag from './Tag'
import {
  REST_ANGLE,
  grabForce,
  isSettled,
  pointerForces,
  restState,
  scrollForce,
  stepTag,
  type TagBox,
  type TagState,
} from './hangingTagPhysics'

type Props = {
  name: string
  sub?: string
  /** numer pokazywanego pierścionka: zmiana „podmienia” przywieszkę i lekko ją rozkołysuje */
  index: number
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

type Engine = { kick: (w: number, wy: number) => void }

/**
 * Przywieszka pod zdjęciem hero, zawieszona na sznurku na mosiężnej szpilce przy dolnej krawędzi zdjęcia.
 *
 * Komputer: przywieszka reaguje na kursor jak prawdziwa (podmuch, gdy kursor przechodzi obok; popchnięcie,
 * gdy przesuwa się po papierze; można ją chwycić i puścić), papier lekko się skręca, cień idzie za nim.
 * Telefon: kołysze się z bezwładnością przy przewijaniu strony, podskakuje po stuknięciu i przy zmianie
 * zdjęcia, a na Androidzie przechyla się z grawitacją, gdy przechylasz telefon (iOS wymagałby zgody, więc bez tego).
 * `prefers-reduced-motion: reduce`: przywieszka wisi nieruchomo, bez pętli animacji i bez nasłuchiwania.
 *
 * Fizyka w `hangingTagPhysics.ts`; tutaj tylko wejścia (kursor, dotyk, przewijanie, czujnik) i zapis transformacji.
 * Pętla `requestAnimationFrame` działa tylko wtedy, gdy przywieszka się rusza i jest widoczna.
 */
export default function HangingTag({ name, sub, index }: Props) {
  const anchor = useRef<HTMLSpanElement>(null)
  const swing = useRef<HTMLSpanElement>(null)
  const paper = useRef<HTMLSpanElement>(null)
  const shadow = useRef<HTMLSpanElement>(null)
  const shade = useRef<HTMLSpanElement>(null)
  const pin = useRef<HTMLSpanElement>(null)
  const engine = useRef<Engine | null>(null)
  const prevIndex = useRef(index)

  useEffect(() => {
    const root = anchor.current
    const sw = swing.current
    const pp = paper.current
    const sh = shadow.current
    const sd = shade.current
    const pn = pin.current
    if (!root || !sw || !pp || !sh || !sd || !pn) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduce.matches) return

    // Siła kołysania: telefon (dotyk) 0,7, komputer 0,9 względem fizyki bazowej (ustalone z Marcinem 11.11.2026).
    const gain = window.matchMedia('(pointer: coarse)').matches ? 0.7 : 0.9

    let s: TagState = restState()
    let rest = REST_ANGLE
    let restTarget = REST_ANGLE
    let raf = 0
    let last = 0
    let visible = true
    let box: TagBox = { left: 0, top: 0, width: 1, height: 1 }

    // Kursor / palec: ostatnie położenie i wygładzona prędkość.
    const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 }
    let grab: { id: number; offset: number } | null = null
    let tap: { id: number; x: number; y: number; t: number } | null = null

    // Przewijanie: wygładzona prędkość i przyspieszenie.
    let sy = window.scrollY
    let sv = 0
    let sa = 0

    const measure = () => {
      const pcx = pn.offsetLeft + pn.offsetWidth / 2
      const pcy = pn.offsetTop + pn.offsetHeight / 2
      box = { left: pp.offsetLeft - pcx, top: pp.offsetTop - pcy, width: pp.offsetWidth, height: pp.offsetHeight }
    }
    measure()

    const pivot = () => {
      const r = pn.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }

    let drawn = ''
    const render = () => {
      const key = `${s.a.toFixed(4)}|${s.ry.toFixed(4)}|${s.rx.toFixed(4)}`
      if (key === drawn) return
      drawn = key
      sw.style.transform = `rotate(${s.a.toFixed(4)}rad)`
      pp.style.transform = `rotateY(${s.ry.toFixed(4)}rad) rotateX(${s.rx.toFixed(4)}rad)`
      // Papier odwrócony od światła (z lewej, z góry) ciemnieje; odchylony od ściany rzuca dalszy, większy cień.
      sd.style.opacity = clamp(Math.max(0, s.ry) * 0.6 + Math.abs(s.rx) * 0.3, 0, 0.16).toFixed(3)
      const lift = Math.abs(s.rx) + Math.abs(s.ry)
      sh.style.transform = `translate(${(1.5 - s.ry * 6).toFixed(2)}px, ${(5 + lift * 10).toFixed(2)}px) scale(${(1 + lift * 0.03).toFixed(4)})`
    }

    const frame = (now: number) => {
      raf = 0
      const dt = clamp((now - last) / 1000, 0.001, 1 / 30)
      last = now

      // Przewijanie strony: szpilka jedzie razem ze stroną, przywieszka zostaje w tyle.
      const y = window.scrollY
      const vRaw = (y - sy) / dt
      sy = y
      const vS = sv + (vRaw - sv) * Math.min(1, dt / 0.035)
      const aRaw = (vS - sv) / dt
      sv = vS
      sa += (aRaw - sa) * Math.min(1, dt / 0.03)

      rest += (restTarget - rest) * Math.min(1, dt / 0.25)

      // Prędkość kursora gaśnie, gdy przestaje się ruszać.
      if (now - ptr.t > 50) {
        const k = Math.exp(-dt * 25)
        ptr.vx *= k
        ptr.vy *= k
      }

      const p = pivot()
      const dx = ptr.x - p.x
      const dy = ptr.y - p.y
      let alpha = scrollForce(sa, s, box.width) * gain
      let alphaY = 0
      let alphaX = 0
      if (grab) {
        alpha += grabForce(rest + (Math.atan2(dy, dx) - grab.offset - rest) * gain, s, rest)
      } else {
        const f = pointerForces({ dx, dy, vx: ptr.vx, vy: ptr.vy }, s, box, gain)
        alpha += f.alpha
        alphaY += f.alphaY
        alphaX += f.alphaX
      }

      s = stepTag(s, dt, { alpha, alphaY, alphaX, rest })
      render()

      const busy =
        grab !== null ||
        now - ptr.t < 140 ||
        Math.abs(sv) > 4 ||
        Math.abs(sa) > 40 ||
        Math.abs(rest - restTarget) > 0.0005
      if (busy || !isSettled(s, rest)) {
        wake()
      } else {
        s = { ...restState(), a: rest }
        render()
      }
    }

    function wake() {
      if (raf || !visible || document.hidden) return
      const now = performance.now()
      // Po uśpieniu liczymy od ostatniej klatki: pierwsze przesunięcie strony (szarpnięcie palcem albo kółkiem)
      // to właśnie największe przyspieszenie, więc go nie gubimy. Po dużym skoku (np. powrót z dołu strony) zaczynamy od nowa.
      if (now - last > 100) {
        if (Math.abs(window.scrollY - sy) > 400) sy = window.scrollY
        sv = 0
        sa = 0
        last = now - 1000 / 60
      }
      raf = requestAnimationFrame(frame)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!e.isPrimary) return
      const now = e.timeStamp || performance.now()
      const dt = (now - ptr.t) / 1000
      if (ptr.t > 0 && dt > 0.002 && dt < 0.2) {
        const k = Math.min(1, dt / 0.03)
        ptr.vx += ((e.clientX - ptr.x) / dt - ptr.vx) * k
        ptr.vy += ((e.clientY - ptr.y) / dt - ptr.vy) * k
      } else if (dt >= 0.2) {
        ptr.vx = 0
        ptr.vy = 0
      }
      ptr.x = e.clientX
      ptr.y = e.clientY
      ptr.t = now
      if (tap && tap.id === e.pointerId && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 10) tap = null
      wake()
    }

    const onPointerDown = (e: PointerEvent) => {
      if (!e.isPrimary) return
      ptr.x = e.clientX
      ptr.y = e.clientY
      ptr.vx = 0
      ptr.vy = 0
      ptr.t = e.timeStamp || performance.now()
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        if (e.button !== 0) return
        e.preventDefault()
        const p = pivot()
        grab = { id: e.pointerId, offset: Math.atan2(e.clientY - p.y, e.clientX - p.x) - s.a }
        try {
          pp.setPointerCapture(e.pointerId)
        } catch {}
        root.setAttribute('data-grab', '')
      } else {
        tap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }
      }
      wake()
    }

    const onPointerUp = (e: PointerEvent) => {
      if (grab && grab.id === e.pointerId) {
        grab = null
        root.removeAttribute('data-grab')
      }
      if (tap && tap.id === e.pointerId) {
        // Stuknięcie palcem: papier odskakuje od palca, koniec przywieszki podskakuje (mocniej dalej od szpilki).
        if (e.type === 'pointerup' && performance.now() - tap.t < 400) {
          const p = pivot()
          const lx = (e.clientX - p.x) * Math.cos(s.a) + (e.clientY - p.y) * Math.sin(s.a)
          const reach = clamp(lx / Math.max(box.left + box.width, 1), 0, 1)
          s = {
            ...s,
            w: s.w - (0.5 + reach * 1.3) * gain,
            wx: s.wx + 3.5 * gain,
            wy: s.wy + (reach - 0.5) * 6 * gain,
          }
        }
        tap = null
      }
      wake()
    }

    const onScroll = () => wake()

    // Android (bez zgody): grawitacja z czujnika przechyla przywieszkę, gdy telefon się przechyla.
    // Dodatni kąt `g.x` = telefon obrócony przeciwnie do wskazówek zegara; przywieszka „trzyma pion”, więc obraca się zgodnie.
    const onMotion = (e: DeviceMotionEvent) => {
      const g = e.accelerationIncludingGravity
      if (!g || g.x == null || g.y == null) return
      const angle = window.screen.orientation?.angle ?? 0
      if (angle !== 0 || g.y < 3) {
        restTarget = REST_ANGLE
      } else {
        restTarget = REST_ANGLE + clamp(0.5 * gain * Math.asin(clamp(g.x / 9.81, -1, 1)), -0.2, 0.2)
      }
      if (Math.abs(restTarget - rest) > 0.002) wake()
    }
    const motionNeedsPermission =
      typeof DeviceMotionEvent === 'undefined' ||
      typeof (DeviceMotionEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function'
    const useMotion = !motionNeedsPermission && window.matchMedia('(pointer: coarse)').matches

    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true
      if (visible) wake()
    })
    io.observe(root)
    const ro = new ResizeObserver(() => {
      measure()
      wake()
    })
    ro.observe(pp)
    const onVisibility = () => wake()

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerUp, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    pp.addEventListener('pointerdown', onPointerDown)
    if (useMotion) window.addEventListener('devicemotion', onMotion, { passive: true })

    // Ktoś włączył ograniczenie ruchu w trakcie: zatrzymujemy i wieszamy przywieszkę nieruchomo.
    const onReduce = () => {
      if (!reduce.matches) return
      cancelAnimationFrame(raf)
      raf = 0
      visible = false
      sw.style.transform = ''
      pp.style.transform = ''
      sh.style.transform = ''
      sd.style.opacity = ''
    }
    reduce.addEventListener('change', onReduce)

    engine.current = {
      kick: (w, wy) => {
        s = { ...s, w: s.w + w * gain, wy: s.wy + wy * gain }
        wake()
      },
    }

    return () => {
      cancelAnimationFrame(raf)
      engine.current = null
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibility)
      pp.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('devicemotion', onMotion)
      reduce.removeEventListener('change', onReduce)
    }
  }, [])

  // Zmiana pierścionka: nowa przywieszka „zawisa” i chwilę się kołysze (kierunek wg kierunku zmiany).
  useEffect(() => {
    const dir = Math.sign(index - prevIndex.current)
    prevIndex.current = index
    if (dir !== 0) engine.current?.kick(-1.05 * dir, 2.4 * dir)
  }, [index])

  return (
    <span aria-hidden="true" className="hero-tag hv-tag-d ht" ref={anchor}>
      <span className="ht-enter">
        <span className="ht-swing" ref={swing}>
          <span className="ht-shadow" ref={shadow}>
            <span />
          </span>
          <span className="ht-paper" ref={paper}>
            <Tag className="tag-live" key={name} name={name} size="md" sub={sub} />
            <span className="ht-shade" ref={shade} />
          </span>
          <span className="ht-cord" />
        </span>
        <span className="ht-pin" ref={pin} />
      </span>
    </span>
  )
}
