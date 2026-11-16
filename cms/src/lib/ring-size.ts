/**
 * Rozmiary pierścionków. Rozmiar polski to obwód wewnętrzny w milimetrach pomniejszony o 40 (rozmiar 12 = obwód
 * 52 mm). Rozmiar europejski (ISO 8653) to sam obwód wewnętrzny w milimetrach. Rozmiar amerykański liczony jest ze
 * średnicy wewnętrznej: średnica = 11,63 mm + 0,8128 mm × rozmiar (przybliżenie stosowane w tabelach jubilerskich).
 */
export const PL_OFFSET_MM = 40
export const US_BASE_MM = 11.63
export const US_STEP_MM = 0.8128

/** Zakres rozmiarów polskich w tabeli i kalkulatorze (obwód 45–75 mm). */
export const PL_MIN = 5
export const PL_MAX = 35

export type RingSizeInput = 'srednica' | 'obwod' | 'pl' | 'us'

export type RingSize = {
  /** Rozmiar polski dokładnie (może mieć część ułamkową) i zaokrąglony do całości. */
  plExact: number
  pl: number
  /** Gdy wynik wypada mniej więcej w połowie między dwoma rozmiarami: mniejszy i większy z nich. */
  between: [number, number] | null
  circumferenceMm: number
  diameterMm: number
  eu: number
  us: number
}

const round = (value: number, step: number) => Math.round(value / step) * step

/** Obwód wewnętrzny w mm z podanej wielkości; `null`, gdy wartość nie jest dodatnią liczbą. */
export function circumferenceFrom(kind: RingSizeInput, value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null
  if (kind === 'srednica') return value * Math.PI
  if (kind === 'obwod') return value
  if (kind === 'pl') return value + PL_OFFSET_MM
  return (US_BASE_MM + US_STEP_MM * value) * Math.PI
}

/** Komplet rozmiarów dla obwodu wewnętrznego; `null` poza zakresem tabeli (obwód 45–75 mm). */
export function ringSizeFromCircumference(circumferenceMm: number): RingSize | null {
  const plExact = circumferenceMm - PL_OFFSET_MM
  if (!Number.isFinite(plExact) || plExact < PL_MIN - 0.5 || plExact > PL_MAX + 0.5) return null
  const pl = Math.min(PL_MAX, Math.max(PL_MIN, Math.round(plExact)))
  const fraction = plExact - Math.floor(plExact)
  const lower = Math.floor(plExact)
  const between: [number, number] | null =
    fraction >= 0.35 && fraction <= 0.65 && lower >= PL_MIN && lower + 1 <= PL_MAX ? [lower, lower + 1] : null
  const diameterMm = circumferenceMm / Math.PI
  return {
    plExact,
    pl,
    between,
    circumferenceMm,
    diameterMm,
    eu: Math.round(circumferenceMm),
    us: round((diameterMm - US_BASE_MM) / US_STEP_MM, 0.25),
  }
}

export function ringSize(kind: RingSizeInput, value: number): RingSize | null {
  const circumference = circumferenceFrom(kind, value)
  return circumference === null ? null : ringSizeFromCircumference(circumference)
}

export type RingSizeRow = { pl: number; circumferenceMm: number; diameterMm: number; us: number }

/** Wiersze tabeli rozmiarów (rozmiar polski co 1). Średnica do 0,1 mm, rozmiar amerykański do 0,25. */
export function ringSizeTable(from: number = 8, to: number = 26): RingSizeRow[] {
  return Array.from({ length: to - from + 1 }, (_, index) => {
    const pl = from + index
    const circumferenceMm = pl + PL_OFFSET_MM
    const diameterMm = circumferenceMm / Math.PI
    return {
      pl,
      circumferenceMm,
      diameterMm: Math.round(diameterMm * 10) / 10,
      us: round((diameterMm - US_BASE_MM) / US_STEP_MM, 0.25),
    }
  })
}

/** Liczba po polsku z przecinkiem: 16,5; 6,25; całkowite bez części ułamkowej. */
export function formatNumberPl(value: number, digits: number = 1): string {
  const text = value.toFixed(digits)
  return (text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text).replace('.', ',')
}
