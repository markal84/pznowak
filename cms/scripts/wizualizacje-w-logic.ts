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
import type { OriginalStoneHint, StoneCheck } from './wizualizacje-wycinek-logic'

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
  /** `pomocniczy`: wzorzec tylko do oceny (nie idzie do generatora, żeby nie mnożyć obrazów na wejściu). */
  wzorce: { slug: string; pliki: string[]; pomocniczy?: boolean }[]
  /** Dodatkowe zdanie o wzorcach do promptu, np. że mają inny szlif i bierzemy z nich tylko barwę. */
  wzorce_uwaga_en?: string
  /** Y.2: automatyczna kontrola koloru w wycinku (biel: jasny, bezbarwny, z ogniem; kolor: odcień i nasycenie). */
  kontrola?: StoneCheck
}
export type Design = {
  slug: string
  name: string
  zrodlo: string[]
  nazwa_wariantu: Record<string, string>
  /** Tekst albo mapa jak `nazwa_wariantu` (klucz kamienia albo `domyslnie`); `{z}` = „z rubinem” itd. */
  alt: string | Record<string, string>
  kamienie: string[]
  /**
   * Co zmieniamy, gdy to nie jeden kamień główny (np. obrączka eternity): opis po angielsku do promptu, po polsku do
   * oceny, a `zachowaj_en` – co z pozostałych kamieni zostaje. Z `maska: "wiele"` wycinamy każdy zmieniony kamień osobno.
   */
  zmiana_en?: string
  zmiana_pl?: string
  zachowaj_en?: string
  maska?: 'jeden' | 'wiele'
  /**
   * Zlecenie Y: kolejne zdjęcia galerii karty (2., 3., …) w kolejności z „Zdjęcia i filmy”; `zrodlo` jak wyżej
   * (pierwszy istniejący plik). Zdjęcie 1 to `zrodlo` fasonu.
   */
  zdjecia?: { zrodlo: string[]; maska?: 'jeden' | 'wiele'; kamien_oryginalu?: Partial<OriginalStoneHint> }[]
  /**
   * Zlecenie Y.2: jak rozpoznać kamień oryginału (odcień, nasycenie, opcjonalnie ręczny obszar). Fason z tym polem
   * generuje „w wycinku”: maska z oryginału, generator dostaje tylko kwadrat wokół kamienia. Zdjęcie może je nadpisać.
   */
  kamien_oryginalu?: OriginalStoneHint
  /** Kamienie, które dostają wizualizację na każdym zdjęciu galerii (pozostałe tylko na pierwszym, jak w W). */
  cala_galeria?: string[]
}
export type Config = { kamienie: Record<string, Stone>; fasony: Design[] }

/**
 * Jedno zdjęcie wariantu. `photo` od 1 (kolejność galerii karty); `variantId` = `<slug>-<kamień>` wspólne dla zdjęć
 * jednego wariantu; `photoKey` = zdjęcie fasonu (`<slug>` dla pierwszego, jak w W, `<slug>-<n>` dla kolejnych) – klucz
 * opisu zdjęcia, maski fasonu i proporcji.
 */
export type Job = {
  design: Design
  stone: Stone
  id: string
  file: string
  photo: number
  variantId: string
  photoKey: string
  zrodlo: string[]
  maska?: 'jeden' | 'wiele'
  /** Y.2: wypełnione = technika wycinka (scalone pola fasonu i zdjęcia). */
  hint?: OriginalStoneHint
}

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
    for (const key of design.cala_galeria ?? []) {
      if (!design.kamienie.includes(key)) throw new Error(`wizualizacje-w.json, ${design.slug}: „cala_galeria” spoza „kamienie” (${key})`)
    }
    for (const [i, photo] of (design.zdjecia ?? []).entries()) {
      if (!photo.zrodlo?.length) throw new Error(`wizualizacje-w.json, ${design.slug}: zdjęcie ${i + 2} bez „zrodlo”`)
    }
  }
  return { kamienie, fasony: raw.fasony }
}

/** Zdjęcia galerii fasonu: 1 = `zrodlo`, dalej `zdjecia`. */
export function designPhotos(
  design: Design,
): { photo: number; photoKey: string; zrodlo: string[]; maska?: 'jeden' | 'wiele'; hint?: OriginalStoneHint }[] {
  const hint = (own?: Partial<OriginalStoneHint>, maska?: 'jeden' | 'wiele'): OriginalStoneHint | undefined =>
    design.kamien_oryginalu ? { maska, ...design.kamien_oryginalu, ...own } : undefined
  return [
    { photo: 1, photoKey: design.slug, zrodlo: design.zrodlo, maska: design.maska, hint: hint(undefined, design.maska) },
    ...(design.zdjecia ?? []).map((entry, i) => ({
      photo: i + 2,
      photoKey: `${design.slug}-${i + 2}`,
      zrodlo: entry.zrodlo,
      maska: entry.maska ?? design.maska,
      hint: hint(entry.kamien_oryginalu, entry.maska ?? design.maska),
    })),
  ]
}

/**
 * Wszystkie obrazy do zrobienia: fason → kamień → zdjęcie (zdjęcia jednego wariantu po kolei). Zdjęcie 1 ma nazwy
 * z W (`<slug>-<kamień>`), kolejne końcówkę `-<n>`. `only`: slug fasonu, wariant (`<slug>-<kamień>`, wszystkie jego
 * zdjęcia) albo pojedynczy obraz (`<slug>-<kamień>-<n>`).
 */
export function jobs(config: Config, only: string[] = []): Job[] {
  const all = config.fasony.flatMap((design) =>
    design.kamienie.flatMap((key) => {
      const photos = (design.cala_galeria ?? []).includes(key) ? designPhotos(design) : designPhotos(design).slice(0, 1)
      return photos.map(({ photo, photoKey, zrodlo, maska, hint }) => {
        const id = photo === 1 ? `${design.slug}-${key}` : `${design.slug}-${key}-${photo}`
        return { design, stone: config.kamienie[key], id, file: `${id}.webp`, photo, variantId: `${design.slug}-${key}`, photoKey, zrodlo, maska, hint }
      })
    }),
  )
  if (!only.length) return all
  return all.filter((job) => only.some((o) => o === job.design.slug || o === job.variantId || o === job.id))
}

/**
 * Pierwszy istniejący plik z listy (ścieżki względem `data/`). Gdy `dataDir` to inny katalog (np. dane na Macu przy
 * pracy w worktree), sprawdza też `data/` w repo – tam leżą wzorce w gicie (`data/legacy`, `data/wzorce`).
 */
export function firstExisting(dataDir: string, candidates: string[]): string | null {
  for (const base of [...new Set([dataDir, path.join(REPO_ROOT, 'data')])]) {
    for (const candidate of candidates) {
      const full = path.join(base, candidate)
      if (existsSync(full)) return full
    }
  }
  return null
}

const pick = (value: string | Record<string, string>, key: string, fallback: string) =>
  typeof value === 'string' ? value : (value[key] ?? value.domyslnie ?? fallback)

export function variantName(job: Job): string {
  return pick(job.design.nazwa_wariantu, job.stone.key, '{nazwa}').replace('{nazwa}', job.stone.nazwa)
}

/** Wpis wariantu (format `warianty.json`); `files` = obrazy podanych zdjęć wariantu w kolejności galerii. */
export function variantSpec(job: Job, photos: readonly Job[] = [job]): VariantSpec {
  return {
    stone: variantName(job),
    swatch: job.stone.swatch,
    files: photos.map((photo) => photo.file),
    alt: pick(job.design.alt, job.stone.key, '').replace('{z}', job.stone.z),
    isVisualization: true,
  }
}

/** Zdjęcia jednego wariantu pogrupowane (kolejność konfiguracji). */
export function variantGroups(list: readonly Job[]): Job[][] {
  const groups = new Map<string, Job[]>()
  for (const job of list) groups.set(job.variantId, [...(groups.get(job.variantId) ?? []), job])
  return [...groups.values()]
}

/**
 * Wpisy do `warianty-w.json` (format `warianty.json` z V) w kolejności konfiguracji: tylko warianty, w których
 * przyjęto wszystkie zdjęcia (wariant z dziurą w galerii nie trafia na stronę).
 */
export function proposals(config: Config, accepted: Set<string>) {
  return config.fasony
    .map((design) => ({
      slug: design.slug,
      name: design.name,
      variants: variantGroups(jobs(config, [design.slug]))
        // Reguła Kamy (09.11): wystarczy 1–2 ładne zdjęcia – wariant trafia na listę, gdy przyjęto zdjęcie karty;
        // zdjęcia galerii, które nie wyszły, są pomijane (np. widok z boku przy białym diamencie).
        .filter((photos) => accepted.has(photos[0].id))
        .map((photos) => {
          const ok = photos.filter((job) => accepted.has(job.id))
          return variantSpec(ok[0], ok)
        }),
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
  const { zmiana_en: target, zachowaj_en: keep } = job.design
  const otherStones = keep
    ? ` ${keep}`
    : /^none\b/i.test(description.other_stones_en.trim())
      ? ''
      : ` All other stones (${description.other_stones_en}) keep their current colour and look.`
  const subject = target ? 'every changed stone' : 'the centre stone'
  const imagePrompt = [
    'Edit IMAGE 1, a real product photo of a handmade ring from a jewellery workshop. This is a photorealistic retouch of that photo, not a new render.',
    target
      ? `CHANGE ONLY ${target}: make them natural ${job.stone.en} – ${job.stone.kolor_en}.${otherStones}`
      : `CHANGE ONLY the centre stone (${description.centre_stone_en}): make it a natural ${job.stone.en} – ${job.stone.kolor_en}.${otherStones}`,
    `${refs}: real photos of natural ${job.stone.en} from the same workshop. Use them ONLY as a colour reference – match their hue, saturation, depth and the way light breaks inside the stone. Do not copy their shape, cut, setting, metal or background.${job.stone.wzorce_uwaga_en ? ` ${job.stone.wzorce_uwaga_en}` : ''}`,
    `KEEP EXACTLY AS IN IMAGE 1: the cut, outline, size and position of ${subject}, which must sit within exactly the same prongs; the number, size and placement of every stone and prong; the metal (${description.metal_en}) with its colour, shape, texture and every detail of the setting and band; the background, camera angle, crop and framing; lighting, reflections, shadows, depth of field and sharpness. Same aspect ratio and composition as IMAGE 1.`,
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

/**
 * Y.2, technika wycinka: IMAGE 1 to kwadratowe zbliżenie kamienia (wycinek ze zdjęcia), nie cały kadr. Do zdjęcia
 * wraca tylko obszar kamienia, więc prompt skupia się na samym kamieniu i jego styku z łapkami.
 */
export function cutoutPrompt(job: Job, description: Description, refCount: number, retryHint?: string): string {
  const refs = refCount === 1 ? 'IMAGE 2' : `IMAGES 2–${refCount + 1}`
  const { zmiana_en: target, zachowaj_en: keep } = job.design
  const white = Boolean(job.stone.kontrola?.bialy)
  const otherStones = keep
    ? ` ${keep}`
    : /^none\b/i.test(description.other_stones_en.trim())
      ? ''
      : ` The surrounding stones (${description.other_stones_en}) keep their current colour and look.`
  const subject = target ? 'every changed stone' : 'the centre stone'
  const imagePrompt = [
    'Edit IMAGE 1: a square close-up crop of a real product photo of a handmade ring. This is a photorealistic retouch of that crop, not a new render. Only the stone area of your result will be pasted back into the photo, so keep everything around it pixel-identical.',
    target
      ? `CHANGE ONLY ${target}: make them natural ${job.stone.en} – ${job.stone.kolor_en}.${otherStones}`
      : `CHANGE ONLY the centre stone in the middle of the crop (${description.centre_stone_en}): make it a natural ${job.stone.en} – ${job.stone.kolor_en}.${otherStones}`,
    white
      ? 'A real colourless diamond is BRIGHT: crisp white flashes, deep dark contrasting facets and small specks of spectral fire (tiny rainbow sparks). It is not grey, not milky, not glassy, and it carries no blue or teal from the previous stone – also at the girdle edge and in the facets under the prongs.'
      : 'Recolour the whole stone evenly, also at the girdle edge and in the facets under the prongs – no trace of the previous colour.',
    `${refs}: real photos of natural ${job.stone.en} from the same workshop. Use them ONLY as a colour reference – match their hue, saturation, depth and the way light breaks inside the stone. Do not copy their shape, cut, setting, metal or background.${job.stone.wzorce_uwaga_en ? ` ${job.stone.wzorce_uwaga_en}` : ''}`,
    `KEEP EXACTLY AS IN IMAGE 1: the cut, outline, size and position of ${subject}, which must sit within exactly the same prongs; every prong, bead and halo stone in the same place; the metal (${description.metal_en}); the background; the framing (same square crop, no zoom, no shift); lighting and focus.`,
    'Natural gemstones are slightly imperfect: believable internal reflections and depth, not coloured glass or plastic. No added text, logos, watermarks, props, sparkle effects or glow.',
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
  const what = job.design.zmiana_pl ?? 'kamień główny'
  return [
    'Kontrola jakości wizualizacji dla pracowni jubilerskiej. Nie uruchamiaj żadnych poleceń, patrz tylko na obrazy.',
    `Obraz 1: prawdziwe zdjęcie pierścionka (oryginał). Obraz 2: wizualizacja, w której miał się zmienić WYŁĄCZNIE ${what}`,
    `– na naturalny kamień: ${job.stone.nazwa.toLowerCase()} (${job.stone.kolor_en}). Poza obszarem zmienianych kamieni`,
    'obraz 2 składa się z pikseli oryginału, więc szukaj przede wszystkim błędów na kamieniach i na ich styku z oprawą.',
    `${refs}: prawdziwe zdjęcia tego kamienia – wzorzec koloru.${job.stone.wzorce_uwaga_en ? ` Uwaga: ${job.stone.wzorce_uwaga_en}` : ''}`,
    `Porównaj 1 i 2: szlif (typ), obrys, rozmiar i położenie zmienianych kamieni (${what}); łapki i oprawa wokół; pozostałe kamienie,`,
    'metal, kadr. Układ odblasków w fasetach MOŻE się różnić (inny materiał inaczej łamie światło) – to nie jest błąd,',
    'o ile szlif i obrys są te same. Sprawdź kolor względem wzorca (naturalny, nie neonowy, nie szkło) i artefakty',
    '(szwy, poświata lub resztki starego koloru na krawędzi kamienia, rozmyte fasety, łapki wchodzące w kamień, tekst).',
    'Zasada: lepiej odrzucić ładny obraz z innym pierścionkiem niż go przyjąć. „akceptuj” tylko gdy pierścionek jest ten sam,',
    'a kolor wiarygodny. score 0–100 = przydatność na stronę z etykietą „Wizualizacja”.',
    'Przy „odrzuc” w fix_hint_en podaj jedno zdanie po angielsku, co poprawić w kolejnej próbie.',
  ].join(' ')
}

/**
 * Y.2: ocena wycinka – Obraz 1 i 2 to zbliżenia (oryginał / po wklejeniu). Wszystko poza kamieniem to piksele oryginału
 * (sprawdzone automatycznie), więc Terra ocenia sam kamień. Dla bieli kryterium „jasny, bezbarwny, z ogniem”.
 */
export function cutoutCheckPrompt(job: Job, refCount: number): string {
  const refs = refCount === 1 ? 'Obraz 3' : `Obrazy 3–${refCount + 2}`
  const what = job.design.zmiana_pl ?? 'kamień główny'
  const white = Boolean(job.stone.kontrola?.bialy)
  return [
    'Kontrola jakości wizualizacji dla pracowni jubilerskiej. Nie uruchamiaj żadnych poleceń, patrz tylko na obrazy.',
    `Obraz 1: zbliżenie prawdziwego zdjęcia pierścionka (oryginał). Obraz 2: to samo zbliżenie po retuszu – zmienił się WYŁĄCZNIE ${what}`,
    `– na naturalny kamień: ${job.stone.nazwa.toLowerCase()} (${job.stone.kolor_en}).`,
    'Poza obszarem kamienia obraz 2 to piksele oryginału (sprawdzone automatycznie) – oceniaj sam kamień i jego styk z łapkami i oprawą.',
    `${refs}: prawdziwe zdjęcia tego kamienia – wzorzec koloru.${job.stone.wzorce_uwaga_en ? ` Uwaga: ${job.stone.wzorce_uwaga_en}` : ''}`,
    `Sprawdź: typ szlifu, obrys, rozmiar i położenie kamienia (${what}) jak w obrazie 1; łapki nie wchodzą w kamień i nie znikają; brak szwów,`,
    'poświaty i resztek starego koloru na krawędzi kamienia; brak rozmytych faset i tekstu.',
    white
      ? 'Biały diament oceniaj kryterium „jasny, bezbarwny, z ogniem”, NIE podobieństwem do oryginału: ma być jasny, z wyraźnym kontrastem białych błysków i ciemnych faset, bez niebieskiego, szarego czy mlecznego odcienia, z drobnymi iskrami tęczowego ognia. Układ błysków i faset biały diament ma inny niż kamień kolorowy – to NIE jest błąd, o ile typ szlifu, obrys i rozmiar są te same.'
      : 'Układ odblasków w fasetach MOŻE się różnić (inny materiał inaczej łamie światło) – to nie jest błąd, o ile szlif i obrys są te same. Kolor porównaj ze wzorcem (naturalny, nie neonowy, nie szkło).',
    '„akceptuj” tylko gdy pierścionek jest ten sam, a kamień wiarygodny. score 0–100 = przydatność na stronę z etykietą „Wizualizacja”.',
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
 * `mode: "wiele"` (obrączka eternity, kilka zmienianych kamieni): każdy obszar zmiany od 0,03 % kadru dostaje własną
 * otoczkę wypukłą; null, gdy nic nie zostało albo zmiana obejmuje ponad połowę kadru.
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
  mode: 'jeden' | 'wiele' = 'jeden',
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
  const sizes: number[] = [0]
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
    sizes.push(size)
    if (size > bestSize) [best, bestSize] = [current, size]
  }
  if (mode === 'wiele') {
    const groups = new Map<number, [number, number][]>()
    for (let i = 0; i < n; i++) {
      const l = label[i]
      if (!l || sizes[l] < Math.max(4, n * 0.0003)) continue
      if (!groups.has(l)) groups.set(l, [])
      groups.get(l)!.push([i % width, Math.floor(i / width)])
    }
    let mask = new Uint8Array(n)
    for (const points of groups.values()) fillHull(mask, width, convexHull(points))
    if (prior) for (let i = 0; i < n; i++) if (prior[i]) mask[i] = 1
    mask = growMask(mask, width, grow)
    const area = mask.reduce((sum, v) => sum + v, 0) / n
    if (!area || area > 0.5) return null
    return { mask: mask.map((v) => (v ? 255 : 0)), area }
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
  let mask = new Uint8Array(n)
  fillHull(mask, width, convexHull(points))
  mask = growMask(mask, width, grow)
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

function fillHull(mask: Uint8Array, width: number, hull: [number, number][]) {
  const xs = hull.map((p) => p[0])
  const ys = hull.map((p) => p[1])
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
    for (let x = Math.min(...xs); x <= Math.max(...xs); x++) if (insideConvex(hull, x, y)) mask[y * width + x] = 1
  }
}

function growMask(mask: Uint8Array, width: number, steps: number) {
  const n = mask.length
  for (let g = 0; g < steps; g++) {
    const next = mask.slice()
    for (let i = 0; i < n; i++) {
      if (mask[i]) continue
      const x = i % width
      if ((i >= width && mask[i - width]) || (i + width < n && mask[i + width]) || (x > 0 && mask[i - 1]) || (x < width - 1 && mask[i + 1])) next[i] = 1
    }
    mask = next
  }
  return mask
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

/** Arkusz: fason → zdjęcia galerii (wiersze) → oryginał i warianty (kolumny). Pusta komórka = obrazu jeszcze nie ma. */
export type SheetRow = {
  design: Design
  stones: { key: string; name: string; swatch: SwatchId }[]
  photos: { photo: number; original: string; files: Record<string, string | null> }[]
}

export function previewHtml(rows: SheetRow[], date: string): string {
  const cards = rows
    .map(({ design, stones, photos }) => {
      const head = [
        '<div class="h">Oryginał</div>',
        ...stones.map((s) => `<div class="h"><i style="background:var(--${s.swatch})"></i>${esc(s.name)}</div>`),
      ].join('')
      const body = photos
        .map(({ photo, original, files }) =>
          [
            `<figure><img src="${esc(original)}" alt="${esc(design.name)} – zdjęcie ${photo}, oryginał"><figcaption>zdjęcie ${photo}</figcaption></figure>`,
            ...stones.map((s) =>
              files[s.key]
                ? `<figure><div class="pic"><img src="obrazy/${esc(files[s.key]!)}" alt="${esc(design.name)} – zdjęcie ${photo}, ${esc(s.name)} (wizualizacja)"><span class="tag">Wizualizacja</span></div></figure>`
                : '<figure class="none"><span>tylko oryginał</span></figure>',
            ),
          ].join('\n'),
        )
        .join('\n')
      return `<section><h2>${esc(design.name)}</h2><div class="grid" style="--cols:${stones.length + 1}">\n${head}\n${body}\n</div></section>`
    })
    .join('\n')
  return `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Wizualizacje kamieni – cała galeria ${esc(date)}</title>
<style>
:root{--czerwony:#9E2235;--niebieski:#2F4F8F;--granatowy:#1E2A55;--jasnoniebieski:#7FA8CF;--fioletowy:#6B4B8C;--zielony:#2F6B4F;--rozowy:#D98A9E;--zolty:#D2A92E;--bialy:#FBFBF8}
body{margin:0;padding:24px 16px;font:15px/1.5 system-ui,sans-serif;background:#faf8f4;color:#2a2722}
h1{font-size:22px;margin:0 0 4px}p.lead{margin:0 0 24px;color:#6b665d;max-width:70ch}
h2{font-size:18px;margin:32px 0 12px}
section{overflow-x:auto}
.grid{display:grid;grid-template-columns:repeat(var(--cols),minmax(150px,1fr));gap:10px;min-width:calc(var(--cols)*150px)}
.h{font-size:13px;font-weight:600;display:flex;align-items:center;gap:6px}
.h i{display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid #ccc}
figure{margin:0;background:#fff;border:1px solid #e7e2d8;border-radius:6px;overflow:hidden}
figure.none{display:flex;align-items:center;justify-content:center;color:#9a958b;font-size:13px;min-height:80px}
.pic{position:relative}img{display:block;width:100%;height:auto}
.tag{position:absolute;top:6px;right:6px;background:rgba(255,255,255,.88);font-size:11px;padding:1px 6px;border-radius:4px}
figcaption{padding:4px 8px;color:#6b665d;font-size:12px}
</style></head><body>
<h1>Wizualizacje kamieni – cała galeria</h1>
<p class="lead">Zlecenie Y, ${esc(date)}. W wierszu jedno zdjęcie z karty: pierwsze to prawdziwe zdjęcie z pracowni, dalej
ten sam kadr z innym kamieniem (zmieniony tylko kolor kamieni). Na stronie każda wizualizacja ma etykietę „Wizualizacja”.</p>
${cards}
</body></html>
`
}
