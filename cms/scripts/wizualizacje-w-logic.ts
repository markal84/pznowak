/**
 * Wizualizacje kamieni przez Codex headless (zlecenie W): konfiguracja, prompty i wynik bez wywołań modeli,
 * żeby dało się je sprawdzić testem. Używa tego `scripts/wizualizacje-codex.ts` i `tests/int/wizualizacje-w.int.spec.ts`.
 *
 * Podział ról: Codex (GPT-6.1 Terra, rozumowanie low) tylko przekazuje gotowy prompt narzędziu do obrazów – jakość
 * zależy od promptu, nie od modelu, który go przekazuje. Ocenę robi osobne wywołanie Terry (medium), tylko do odczytu.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SWATCH_IDS, type SwatchId } from '../src/lib/stone-variants'
import { WARIANTY_DIR, type VariantSpec } from './warianty-v-logic'

const here = path.dirname(fileURLToPath(import.meta.url))

export const CONFIG_PATH = path.join(WARIANTY_DIR, 'wizualizacje-w.json')
/** Wpisy w formacie `warianty.json` – osobny plik, żeby `staging:warianty` nie opublikował próbki przed akceptacją Kamili. */
export const PROPOSALS_PATH = path.join(WARIANTY_DIR, 'warianty-w.json')
export const REPO_ROOT = path.resolve(here, '../..')

export const GEN_MODEL = { id: 'gpt-6.1-terra', effort: 'low' } as const
export const CHECK_MODEL = { id: 'gpt-6.1-terra', effort: 'medium' } as const
export const MAX_ATTEMPTS = 3
/** Odległość dHash (0–256) między oryginałem a wynikiem: powyżej model narysował inny kadr – odrzut bez oceny Terry. */
export const MAX_HASH_DISTANCE = 48

export type Stone = {
  key: string
  nazwa: string
  z: string
  swatch: SwatchId
  en: string
  kolor_en: string
  wzorce: { slug: string; pliki: string[] }[]
}
export type Design = {
  slug: string
  name: string
  zrodlo: string[]
  nazwa_wariantu: Record<string, string>
  alt: string
  kamienie: string[]
}
export type Config = { kamienie: Record<string, Stone>; fasony: Design[] }

export type Job = { design: Design; stone: Stone; id: string; file: string }

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

export function loadConfig(source: string = CONFIG_PATH): Config {
  const raw = JSON.parse(readFileSync(source, 'utf8')) as Config
  const kamienie: Record<string, Stone> = {}
  for (const [key, stone] of Object.entries(raw.kamienie ?? {})) {
    if (!isText(stone.nazwa) || !isText(stone.z) || !isText(stone.en) || !isText(stone.kolor_en)) {
      throw new Error(`wizualizacje-w.json, kamień ${key}: wymagane „nazwa”, „z”, „en”, „kolor_en”`)
    }
    if (!SWATCH_IDS.includes(stone.swatch)) throw new Error(`wizualizacje-w.json, kamień ${key}: „swatch” spoza listy`)
    if (!stone.wzorce?.length) throw new Error(`wizualizacje-w.json, kamień ${key}: brak wzorców koloru`)
    kamienie[key] = { ...stone, key }
  }
  for (const design of raw.fasony ?? []) {
    if (!isText(design.slug) || !isText(design.name) || !design.zrodlo?.length) {
      throw new Error('wizualizacje-w.json: fason bez „slug”, „name” albo „zrodlo”')
    }
    for (const key of design.kamienie) {
      if (!kamienie[key]) throw new Error(`wizualizacje-w.json, ${design.slug}: nieznany kamień „${key}”`)
    }
  }
  return { kamienie, fasony: raw.fasony }
}

export function jobs(config: Config, only: string[] = []): Job[] {
  const all = config.fasony.flatMap((design) =>
    design.kamienie.map((key) => ({
      design,
      stone: config.kamienie[key],
      id: `${design.slug}-${key}`,
      file: `${design.slug}-${key}.webp`,
    })),
  )
  if (!only.length) return all
  return all.filter((job) => only.some((o) => o === job.design.slug || o === job.id))
}

/** Pierwszy istniejący plik z listy (ścieżki względem `data/`). */
export function firstExisting(dataDir: string, candidates: string[]): string | null {
  for (const candidate of candidates) {
    const full = path.join(dataDir, candidate)
    if (existsSync(full)) return full
  }
  return null
}

export function variantName(job: Job): string {
  const template = job.design.nazwa_wariantu[job.stone.key] ?? job.design.nazwa_wariantu.domyslnie ?? '{nazwa}'
  return template.replace('{nazwa}', job.stone.nazwa)
}

export function variantSpec(job: Job): VariantSpec {
  return {
    stone: variantName(job),
    swatch: job.stone.swatch,
    file: job.file,
    alt: job.design.alt.replace('{z}', job.stone.z),
    isVisualization: true,
  }
}

/** Wpisy do `warianty-w.json` (format `warianty.json` z V) w kolejności konfiguracji, tylko przyjęte obrazy. */
export function proposals(config: Config, accepted: Set<string>) {
  return config.fasony
    .map((design) => ({
      slug: design.slug,
      name: design.name,
      variants: jobs(config, [design.slug])
        .filter((job) => accepted.has(job.id))
        .map(variantSpec),
    }))
    .filter((entry) => entry.variants.length > 0)
}

// ---------- opis zdjęcia źródłowego (raz na fason) ----------

export const DESCRIBE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['centre_stone_en', 'other_stones_en', 'metal_en', 'notes_pl'],
  properties: {
    centre_stone_en: { type: 'string', description: 'centre stone: cut/shape, colour, how it is set (prongs, bezel, halo)' },
    other_stones_en: { type: 'string', description: 'all other stones: where they are, how many roughly, colour; "none" if none' },
    metal_en: { type: 'string', description: 'metal colour(s) and notable details of the setting and band' },
    notes_pl: { type: 'string', description: 'krótko po polsku: co na zdjęciu łatwo zepsuć przy edycji' },
  },
} as const

export type Description = { centre_stone_en: string; other_stones_en: string; metal_en: string; notes_pl: string }

export const describePrompt = () =>
  [
    'Na zdjęciu jest jeden pierścionek z pracowni jubilerskiej. Nie uruchamiaj żadnych poleceń, patrz tylko na obraz.',
    'Opisz rzeczowo po angielsku (do promptu edycji obrazu): kamień główny (szlif/kształt, kolor, sposób oprawy),',
    'pozostałe kamienie (gdzie, ile mniej więcej, jaki kolor) i metal. W notes_pl napisz po polsku, które detale',
    'łatwo zgubić przy przemalowaniu kamienia głównego.',
  ].join(' ')

// ---------- generowanie ----------

export function generationPrompt(job: Job, description: Description, refCount: number, retryHint?: string): string {
  const refs = refCount === 1 ? 'IMAGE 2' : `IMAGES 2–${refCount + 1}`
  const otherStones = /^none\b/i.test(description.other_stones_en.trim())
    ? ''
    : ` All other stones (${description.other_stones_en}) keep their current colour and look.`
  const imagePrompt = [
    'Edit IMAGE 1, a real product photo of a handmade ring from a jewellery workshop. This is a photorealistic retouch of that photo, not a new render.',
    `CHANGE ONLY the centre stone (${description.centre_stone_en}): make it a natural ${job.stone.en} – ${job.stone.kolor_en}.${otherStones}`,
    `${refs}: real photos of natural ${job.stone.en} from the same workshop. Use them ONLY as a colour reference – match their hue, saturation, depth and the way light breaks inside the stone. Do not copy their shape, cut, setting, metal or background.`,
    `KEEP EXACTLY AS IN IMAGE 1: the cut, outline, size and position of the centre stone, which must sit within exactly the same prongs; the number, size and placement of every stone and prong; the metal (${description.metal_en}) with its colour, shape, texture and every detail of the setting and band; the background, camera angle, crop and framing; lighting, reflections, shadows, depth of field and sharpness. Same aspect ratio and composition as IMAGE 1.`,
    'Natural gemstones are slightly imperfect: believable internal reflections and depth, not coloured glass or plastic. No added text, logos, watermarks, props, hands, sparkle effects or glow.',
    retryHint ? `Previous attempt was rejected: ${retryHint}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
  return [
    'Use the image generation tool exactly once to edit IMAGE 1 (the first attached image), with all attached images as input.',
    'Pass the prompt between <prompt> tags verbatim – do not shorten, rephrase or add anything. Do not run any shell commands.',
    'When the image is ready, reply with the single word DONE.',
    `<prompt>\n${imagePrompt}\n</prompt>`,
  ].join('\n')
}

// ---------- ocena ----------

export const CHECK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'same_ring',
    'stone_cut_preserved',
    'other_stones_preserved',
    'framing_preserved',
    'target_colour_ok',
    'changes_outside_stone_pl',
    'colour_notes_pl',
    'artifacts_pl',
    'score',
    'verdict',
    'reason_pl',
    'fix_hint_en',
  ],
  properties: {
    same_ring: { type: 'boolean', description: 'metal, setting, prongs, band, number and size of stones unchanged' },
    stone_cut_preserved: { type: 'boolean' },
    other_stones_preserved: { type: 'boolean' },
    framing_preserved: { type: 'boolean', description: 'crop, angle, background, light unchanged' },
    target_colour_ok: { type: 'boolean' },
    changes_outside_stone_pl: { type: 'array', items: { type: 'string' } },
    colour_notes_pl: { type: 'string' },
    artifacts_pl: { type: 'array', items: { type: 'string' } },
    score: { type: 'integer', minimum: 0, maximum: 100 },
    verdict: { type: 'string', enum: ['akceptuj', 'odrzuc'] },
    reason_pl: { type: 'string' },
    fix_hint_en: { type: 'string', description: 'one sentence for the next attempt; empty when accepted' },
  },
} as const

export type Check = {
  same_ring: boolean
  stone_cut_preserved: boolean
  other_stones_preserved: boolean
  framing_preserved: boolean
  target_colour_ok: boolean
  changes_outside_stone_pl: string[]
  colour_notes_pl: string
  artifacts_pl: string[]
  score: number
  verdict: 'akceptuj' | 'odrzuc'
  reason_pl: string
  fix_hint_en: string
}

export function checkPrompt(job: Job, refCount: number): string {
  const refs = refCount === 1 ? 'Obraz 3' : `Obrazy 3–${refCount + 2}`
  return [
    'Kontrola jakości wizualizacji dla pracowni jubilerskiej. Nie uruchamiaj żadnych poleceń, patrz tylko na obrazy.',
    'Obraz 1: prawdziwe zdjęcie pierścionka (oryginał). Obraz 2: wizualizacja, w której miał się zmienić WYŁĄCZNIE kamień',
    `główny – na naturalny kamień: ${job.stone.nazwa.toLowerCase()} (${job.stone.kolor_en}). Poza obszarem kamienia`,
    'obraz 2 składa się z pikseli oryginału, więc szukaj przede wszystkim błędów na kamieniu i na jego styku z oprawą.',
    `${refs}: prawdziwe zdjęcia tego kamienia z pracowni – wzorzec koloru.`,
    'Porównaj 1 i 2: szlif (typ), obrys, rozmiar i położenie kamienia głównego; łapki i oprawa wokół niego; pozostałe kamienie,',
    'metal, kadr. Układ odblasków w fasetach MOŻE się różnić (inny materiał inaczej łamie światło) – to nie jest błąd,',
    'o ile szlif i obrys są te same. Sprawdź kolor względem wzorca (naturalny, nie neonowy, nie szkło) i artefakty',
    '(szwy, poświata lub resztki starego koloru na krawędzi kamienia, rozmyte fasety, łapki wchodzące w kamień, tekst).',
    'Zasada: lepiej odrzucić ładny obraz z innym pierścionkiem niż go przyjąć. „akceptuj” tylko gdy pierścionek jest ten sam,',
    'a kolor wiarygodny. score 0–100 = przydatność na stronę z etykietą „Wizualizacja”.',
    'Przy „odrzuc” w fix_hint_en podaj jedno zdanie po angielsku, co poprawić w kolejnej próbie.',
  ].join(' ')
}

export const isAccepted = (check: Check) =>
  check.verdict === 'akceptuj' && check.same_ring && check.stone_cut_preserved && check.framing_preserved && check.target_colour_ok

// ---------- obraz wynikowy ----------

/** Przycięcie „cover” do proporcji oryginału, wyśrodkowane. */
export function coverCrop(src: { width: number; height: number }, aspect: number) {
  if (src.width / src.height > aspect) {
    const width = Math.round(src.height * aspect)
    return { left: Math.floor((src.width - width) / 2), top: 0, width, height: src.height }
  }
  const height = Math.round(src.width / aspect)
  return { left: 0, top: Math.floor((src.height - height) / 2), width: src.width, height }
}

/**
 * Maska kamienia z różnicy oryginał ↔ wynik (oba RGB, ten sam rozmiar): piksele o dużej zmianie koloru (ΔE76 w Lab),
 * największy spójny obszar, wypełnione dziury (białe odblaski w fasetach zmieniają się mało) i lekko poszerzone.
 * Z wyniku bierzemy tylko ten obszar – oprawa, łapki, tło i pozostałe kamienie zostają pikselami z oryginału.
 * `prior`: maska fasonu z przyjętego wcześniej wariantu (ten sam kamień na tym samym zdjęciu). Dokładana do obszaru
 * zmiany – przy małej różnicy koloru (np. niebieski → granatowy, niebieski → biały) sama różnica nie łapie krawędzi
 * kamienia i zostaje na niej stary kolor. Obszar zmiany daleko od maski fasonu jest pomijany.
 * Zwraca maskę 0/255 albo null, gdy zmiana nie wygląda na jeden kamień (za mała, za duża) i nie ma maski fasonu.
 */
export function stoneMask(
  a: Uint8Array | Buffer,
  b: Uint8Array | Buffer,
  width: number,
  height: number,
  threshold = 25,
  grow = 2,
  prior?: Uint8Array | Buffer | null,
) {
  const n = width * height
  const hot = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const [l1, a1, b1] = rgbToLab(a[i * 3], a[i * 3 + 1], a[i * 3 + 2])
    const [l2, a2, b2] = rgbToLab(b[i * 3], b[i * 3 + 1], b[i * 3 + 2])
    hot[i] = Math.hypot(l1 - l2, a1 - a2, b1 - b2) > threshold ? 1 : 0
  }
  // Odblaski w fasetach (białe w obu obrazach) tną kamień na paski: poszerzenie o 1 px skleja je w jeden obszar.
  const seed = hot.slice()
  for (let i = 0; i < n; i++) {
    if (!seed[i]) continue
    const x = i % width
    for (const q of [i - width, i + width, x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1]) if (q >= 0 && q < n) hot[q] = 1
  }
  // największy spójny obszar (8-sąsiedztwo)
  const label = new Int32Array(n)
  let best = 0
  let bestSize = 0
  let current = 0
  const stack: number[] = []
  for (let start = 0; start < n; start++) {
    if (!hot[start] || label[start]) continue
    current++
    let size = 0
    stack.push(start)
    label[start] = current
    while (stack.length) {
      const p = stack.pop()!
      size++
      const x = p % width
      const left = x > 0
      const right = x < width - 1
      const around = [p - width, p + width, left ? p - 1 : -1, right ? p + 1 : -1]
      if (left) around.push(p - width - 1, p + width - 1)
      if (right) around.push(p - width + 1, p + width + 1)
      for (const q of around) {
        if (q >= 0 && q < n && hot[q] && !label[q]) {
          label[q] = current
          stack.push(q)
        }
      }
    }
    if (size > bestSize) [best, bestSize] = [current, size]
  }
  const valid = bestSize >= n * 0.002 && bestSize <= n * 0.25
  // Szlif kamienia ma zawsze wypukły obrys: otoczka wypukła wypełnia ciemne fasety i odblaski, które zmieniły się mało.
  const own: [number, number][] = []
  if (valid) for (let i = 0; i < n; i++) if (label[i] === best) own.push([i % width, Math.floor(i / width)])
  const known: [number, number][] = []
  if (prior) for (let i = 0; i < n; i++) if (prior[i]) known.push([i % width, Math.floor(i / width)])
  let points = own
  if (known.length) {
    const box = (list: [number, number][]) => {
      const xs = list.map((p) => p[0])
      const ys = list.map((p) => p[1])
      return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
    }
    const k = box(known)
    const near = (() => {
      if (!own.length) return false
      const cx = own.reduce((s, p) => s + p[0], 0) / own.length
      const cy = own.reduce((s, p) => s + p[1], 0) / own.length
      const mx = (k.x1 - k.x0) / 2
      const my = (k.y1 - k.y0) / 2
      return cx >= k.x0 - mx && cx <= k.x1 + mx && cy >= k.y0 - my && cy <= k.y1 + my
    })()
    points = near ? [...own, ...known] : known
  }
  if (!points.length) return null
  const hull = convexHull(points)
  let mask = new Uint8Array(n)
  const xs = hull.map((p) => p[0])
  const ys = hull.map((p) => p[1])
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
    for (let x = Math.min(...xs); x <= Math.max(...xs); x++) if (insideConvex(hull, x, y)) mask[y * width + x] = 1
  }
  for (let g = 0; g < grow; g++) {
    const next = mask.slice()
    for (let i = 0; i < n; i++) {
      if (mask[i]) continue
      const x = i % width
      if ((i >= width && mask[i - width]) || (i + width < n && mask[i + width]) || (x > 0 && mask[i - 1]) || (x < width - 1 && mask[i + 1])) next[i] = 1
    }
    mask = next
  }
  const out = new Uint8Array(n)
  let area = 0
  for (let i = 0; i < n; i++) {
    out[i] = mask[i] ? 255 : 0
    area += mask[i]
  }
  return { mask: out, area: area / n }
}

export type Alignment = { scale: number; dx: number; dy: number }

/**
 * Generator przerysowuje cały obraz i potrafi przesunąć/przeskalować pierścionek w kadrze. Szukamy skali i przesunięcia,
 * przy których wynik (`b`) najlepiej nakłada się na oryginał (`a`): punkt (x, y) oryginału = punkt ((x−dx)/s, (y−dy)/s)
 * wyniku. Obrazy w skali szarości, ten sam rozmiar. `dx`, `dy` w pikselach tej rozdzielczości.
 */
export function align(
  a: Uint8Array | Buffer,
  b: Uint8Array | Buffer,
  width: number,
  height: number,
  scales: number[],
  maxShift: number,
  around: Alignment = { scale: 1, dx: 0, dy: 0 },
  step = 1,
): Alignment & { cost: number } {
  let best = { ...around, cost: Infinity }
  const shiftX = Math.round(maxShift * width)
  const shiftY = Math.round(maxShift * height)
  for (const scale of scales) {
    for (let dy = around.dy - shiftY; dy <= around.dy + shiftY; dy += step) {
      for (let dx = around.dx - shiftX; dx <= around.dx + shiftX; dx += step) {
        let sum = 0
        let count = 0
        for (let y = 0; y < height; y += 2) {
          const yb = Math.round((y - dy) / scale)
          if (yb < 0 || yb >= height) continue
          for (let x = 0; x < width; x += 2) {
            const xb = Math.round((x - dx) / scale)
            if (xb < 0 || xb >= width) continue
            sum += Math.abs(a[y * width + x] - b[yb * width + xb])
            count++
          }
        }
        // kara za małą część wspólną, żeby nie wygrywało „przesunięcie poza kadr”
        if (count < (width * height) / 8) continue
        const cost = sum / count
        if (cost < best.cost) best = { scale, dx, dy, cost }
      }
    }
  }
  return best
}

/** Otoczka wypukła (monotone chain), punkty przeciwnie do ruchu wskazówek zegara. */
export function convexHull(points: [number, number][]): [number, number][] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (sorted.length < 3) return sorted
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (list: [number, number][]) => {
    const out: [number, number][] = []
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop()
      out.push(p)
    }
    out.pop()
    return out
  }
  return [...half(sorted), ...half([...sorted].reverse())]
}

function insideConvex(hull: [number, number][], x: number, y: number) {
  if (hull.length < 3) return hull.some(([hx, hy]) => hx === x && hy === y)
  for (let i = 0; i < hull.length; i++) {
    const [ax, ay] = hull[i]
    const [bx, by] = hull[(i + 1) % hull.length]
    if ((bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0) return false
  }
  return true
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
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

/** dHash 16×16 z surowych pikseli w skali szarości (17×16). */
export function dHashBits(gray: Uint8Array | Buffer): number[] {
  const bits: number[] = []
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) bits.push(gray[y * 17 + x] > gray[y * 17 + x + 1] ? 1 : 0)
  return bits
}
export const hamming = (a: number[], b: number[]) => a.reduce((sum, bit, i) => sum + (bit !== b[i] ? 1 : 0), 0)

// ---------- arkusz porównawczy ----------

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export type SheetRow = { design: Design; original: string; variants: { job: Job; attempts: number }[] }

export function previewHtml(rows: SheetRow[], date: string): string {
  const cards = rows
    .map(({ design, original, variants }) => {
      const tiles = [
        `<figure><img src="${esc(original)}" alt="${esc(design.name)} – oryginał"><figcaption><b>Oryginał</b><span>zdjęcie z pracowni</span></figcaption></figure>`,
        ...variants.map(
          ({ job }) =>
            `<figure><div class="pic"><img src="obrazy/${esc(job.file)}" alt="${esc(variantSpec(job).alt)}"><span class="tag">Wizualizacja</span></div><figcaption><b>${esc(variantName(job))}</b><span><i style="background:var(--${job.stone.swatch})"></i>${esc(job.stone.swatch)}</span></figcaption></figure>`,
        ),
      ].join('\n')
      return `<section><h2>${esc(design.name)}</h2><div class="grid">\n${tiles}\n</div></section>`
    })
    .join('\n')
  return `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wizualizacje kamieni – próbka ${esc(date)}</title>
<style>
:root{--czerwony:#9E2235;--niebieski:#2F4F8F;--granatowy:#1E2A55;--jasnoniebieski:#7FA8CF;--fioletowy:#6B4B8C;--zielony:#2F6B4F;--rozowy:#D98A9E;--zolty:#D2A92E;--bialy:#FBFBF8}
body{margin:0;padding:24px 16px;font:15px/1.5 system-ui,sans-serif;background:#faf8f4;color:#2a2722}
h1{font-size:22px;margin:0 0 4px}p.lead{margin:0 0 24px;color:#6b665d;max-width:70ch}
h2{font-size:18px;margin:32px 0 12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}
figure{margin:0;background:#fff;border:1px solid #e7e2d8;border-radius:8px;overflow:hidden}
.pic{position:relative}img{display:block;width:100%;height:auto}
.tag{position:absolute;top:8px;right:8px;background:rgba(255,255,255,.88);font-size:12px;padding:2px 8px;border-radius:4px}
figcaption{display:flex;justify-content:space-between;gap:8px;padding:8px 12px}
figcaption span{color:#6b665d;font-size:13px;display:flex;align-items:center;gap:6px}
figcaption i{display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid #ccc}
</style></head><body>
<h1>Wizualizacje kamieni – próbka do oceny</h1>
<p class="lead">Zlecenie W, ${esc(date)}. Pierwsze zdjęcie w rzędzie to prawdziwe zdjęcie z pracowni, kolejne to wizualizacje
z innym kamieniem (zmieniony tylko kolor kamienia głównego). Na stronie każda ma etykietę „Wizualizacja”.</p>
${cards}
</body></html>
`
}
