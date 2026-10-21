/**
 * Zasady załączników (zdjęcia i szkice od klientów w formularzu kontaktowym). Ten sam moduł czyta przeglądarka
 * (podpowiedzi i wstępne sprawdzenie) i serwer (twarde limity), więc obie strony liczą tak samo.
 * Bez Node API: plik trafia też do paczki przeglądarki.
 */

export const ATTACHMENT_RULES = {
  /** Plików w jednym zgłoszeniu. */
  maxFiles: 5,
  /**
   * Plik wysyłany na serwer (po zmniejszeniu w przeglądarce). Funkcja Vercela przyjmuje najwyżej ok. 4,5 MB
   * treści żądania; 4 MB zostawia zapas na nagłówki.
   */
  maxUploadBytes: 4 * 1024 * 1024,
  /** Oryginał wybrany przez klienta (zdjęcie 48 Mpx z telefonu ma 10–20 MB); przeglądarka go zmniejsza. */
  maxPickBytes: 25 * 1024 * 1024,
  /** Dłuższy bok po zmniejszeniu w przeglądarce. */
  clientMaxSide: 2560,
  /** Mniejsze i lżejsze pliki przeglądarka wysyła bez zmian (serwer i tak koduje je od nowa). */
  clientKeepBelowBytes: 1.5 * 1024 * 1024,
  /** Bilet na przesłanie pliku jest ważny tyle od przyjęcia zgłoszenia. */
  uploadTokenTtlMs: 15 * 60 * 1000,
} as const

/** Ile miesięcy pracownia trzyma zdjęcia zgłoszenia bez zamówienia (propozycja do decyzji Marcina). */
export const ATTACHMENTS_RETENTION_MONTHS = 6

export type DetectedType = 'jpeg' | 'png' | 'webp' | 'heic'

export const TYPE_LABEL: Record<DetectedType, string> = {
  jpeg: 'JPG',
  png: 'PNG',
  webp: 'WebP',
  heic: 'HEIC',
}

/** Atrybut `accept` pola wyboru plików (rozszerzenia pomagają systemom, które nie znają typu HEIC). */
export const ACCEPT_ATTRIBUTE =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif'

/** Marki kontenera HEIF z kodekiem HEVC (zdjęcia z iPhone'a). AVIF ma inne marki i nie jest przyjmowany. */
const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs'])
const GENERIC_HEIF_BRANDS = new Set(['mif1', 'msf1'])
const AVIF_BRANDS = new Set(['avif', 'avis'])

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length))

/**
 * Typ pliku po zawartości (sygnatura na początku pliku), nie po rozszerzeniu ani nagłówku przeglądarki.
 * Wszystko poza JPG, PNG, WebP i HEIC (także SVG, HTML, PDF, programy) daje `null`.
 */
export function sniffImageType(bytes: Uint8Array): DetectedType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg'
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)
  )
    return 'png'
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP')
    return 'webp'
  if (bytes.length >= 16 && ascii(bytes, 4, 4) === 'ftyp') {
    const boxSize = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0
    const end = Math.min(boxSize, bytes.length)
    if (boxSize < 16) return null
    // Marka główna (bajty 8–11) i marki zgodne (od bajtu 16, co 4 bajty).
    const brands = [ascii(bytes, 8, 4)]
    for (let at = 16; at + 4 <= end; at += 4) brands.push(ascii(bytes, at, 4))
    if (brands.some((b) => AVIF_BRANDS.has(b))) return null
    if (brands.some((b) => HEIC_BRANDS.has(b) || GENERIC_HEIF_BRANDS.has(b))) return 'heic'
  }
  return null
}

/** Ile pierwszych bajtów wystarcza do `sniffImageType`. */
export const SNIFF_BYTES = 64

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

/** Polska odmiana „zdjęcie”: 1 zdjęcie, 2 zdjęcia, 5 zdjęć. */
export function photosLabel(count: number): string {
  const lastTwo = count % 100
  const last = count % 10
  if (count === 1) return '1 zdjęcie'
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} zdjęcia`
  return `${count} zdjęć`
}

export type ManifestCheck =
  | { ok: true; sizes: number[] }
  | { ok: false; message: string }

/**
 * Lista plików zapowiedzianych w zgłoszeniu (`attachments: [{ size }]`). Serwer wydaje bilet na każdy plik
 * z limitem bajtów równym zapowiedzianemu rozmiarowi. Brak pola = zgłoszenie bez plików.
 */
export function parseManifest(raw: unknown): ManifestCheck {
  if (raw === undefined || raw === null) return { ok: true, sizes: [] }
  if (!Array.isArray(raw)) return { ok: false, message: 'Nie udało się odczytać listy zdjęć.' }
  if (raw.length > ATTACHMENT_RULES.maxFiles)
    return { ok: false, message: `Można dołączyć najwyżej ${photosLabel(ATTACHMENT_RULES.maxFiles)}.` }
  const sizes: number[] = []
  for (const item of raw) {
    const size = (item as { size?: unknown } | null)?.size
    if (typeof size !== 'number' || !Number.isInteger(size) || size < 1)
      return { ok: false, message: 'Nie udało się odczytać listy zdjęć.' }
    if (size > ATTACHMENT_RULES.maxUploadBytes)
      return { ok: false, message: 'Jedno ze zdjęć jest za duże. Usuń je i dodaj mniejsze.' }
    sizes.push(size)
  }
  return { ok: true, sizes }
}
