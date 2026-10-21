import { ATTACHMENT_RULES, sniffImageType, SNIFF_BYTES, type DetectedType } from './rules'

/**
 * Przygotowanie zdjęcia w przeglądarce (tylko interfejs; serwer i tak sprawdza i koduje plik od nowa):
 * - typ po zawartości, nie po rozszerzeniu (np. program albo SVG przemianowany na .jpg odpada od razu),
 * - duże zdjęcie zmniejszane do 2560 px i zapisywane jako JPEG, żeby zmieściło się w 4 MB i szybko doszło
 *   przez telefon; przeglądarka obraca je przy tym według EXIF,
 * - HEIC: Safari (iPhone, Mac) dekoduje go sam, więc wysyłamy JPEG; inne przeglądarki wysyłają oryginał
 *   (do 4 MB), a konwersję robi serwer.
 */

export type PreparedFile = {
  blob: Blob
  /** Adres podglądu (`blob:`), `null` dla HEIC, którego przeglądarka nie umie pokazać. */
  previewUrl: string | null
  type: DetectedType
}

export type PrepareError = 'unsupported' | 'too_big' | 'too_big_heic' | 'unreadable'

export const PREPARE_MESSAGES: Record<PrepareError, string> = {
  unsupported: 'to nie jest zdjęcie w obsługiwanym formacie (JPG, PNG, WebP lub HEIC)',
  too_big: 'plik jest za duży (najwyżej 25 MB)',
  too_big_heic:
    'zdjęcie HEIC jest za duże, żeby wysłać je z tej przeglądarki. Wyślij je z telefonu albo zapisz jako JPG',
  unreadable: 'nie udało się odczytać zdjęcia; plik może być uszkodzony',
}

/** Próby zmniejszenia: dłuższy bok i jakość JPEG, aż plik zmieści się w limicie. */
const ATTEMPTS: Array<[number, number]> = [
  [ATTACHMENT_RULES.clientMaxSide, 0.88],
  [2048, 0.82],
  [1600, 0.78],
]

async function loadImage(file: Blob): Promise<{ image: HTMLImageElement; url: string } | null> {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.decoding = 'async'
  image.src = url
  try {
    await image.decode()
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('empty')
    return { image, url }
  } catch {
    URL.revokeObjectURL(url)
    return null
  }
}

function toJpeg(image: HTMLImageElement, maxSide: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const context = canvas.getContext('2d')
  if (!context) return Promise.resolve(null)
  // Przezroczystość (PNG, WebP) na białym tle, jak na serwerze.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) =>
    canvas.toBlob(
      (blob) => {
        // Safari na iPhonie trzyma pamięć płótna, dopóki go nie wyzerujemy.
        canvas.width = 0
        canvas.height = 0
        resolve(blob)
      },
      'image/jpeg',
      quality,
    ),
  )
}

export async function prepareFile(
  file: File,
): Promise<{ ok: true; file: PreparedFile } | { ok: false; error: PrepareError }> {
  if (file.size > ATTACHMENT_RULES.maxPickBytes) return { ok: false, error: 'too_big' }
  const type = sniffImageType(new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer()))
  if (!type) return { ok: false, error: 'unsupported' }

  const loaded = await loadImage(file)
  if (!loaded) {
    if (type !== 'heic') return { ok: false, error: 'unreadable' }
    return file.size <= ATTACHMENT_RULES.maxUploadBytes
      ? { ok: true, file: { blob: file, previewUrl: null, type } }
      : { ok: false, error: 'too_big_heic' }
  }

  const { image, url } = loaded
  const longSide = Math.max(image.naturalWidth, image.naturalHeight)
  const keep =
    type !== 'heic' &&
    file.size <= ATTACHMENT_RULES.clientKeepBelowBytes &&
    longSide <= ATTACHMENT_RULES.clientMaxSide
  if (keep) return { ok: true, file: { blob: file, previewUrl: url, type } }

  try {
    for (const [maxSide, quality] of ATTEMPTS) {
      const blob = await toJpeg(image, maxSide, quality)
      if (blob && blob.size <= ATTACHMENT_RULES.maxUploadBytes)
        return { ok: true, file: { blob, previewUrl: URL.createObjectURL(blob), type } }
    }
  } finally {
    URL.revokeObjectURL(url)
  }
  return { ok: false, error: 'too_big' }
}

export type UploadReply = { status: number; code: string | null; message: string | null }

/** Wysyłka jednego pliku z postępem (fetch nie raportuje postępu wysyłania). */
export function uploadFile(
  blob: Blob,
  token: string,
  name: string,
  onProgress: (fraction: number) => void,
): Promise<UploadReply> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/zgloszenia/zalaczniki')
    xhr.setRequestHeader('content-type', 'application/octet-stream')
    xhr.setRequestHeader('x-upload-token', token)
    xhr.setRequestHeader('x-file-name', encodeURIComponent(name.slice(0, 200)))
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total)
    }
    xhr.onload = () => {
      let body: { code?: string; message?: string } | null = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        body = null
      }
      resolve({ status: xhr.status, code: body?.code ?? null, message: body?.message ?? null })
    }
    xhr.onerror = () => reject(new Error('network'))
    xhr.ontimeout = () => reject(new Error('timeout'))
    xhr.timeout = 120_000
    xhr.send(blob)
  })
}

/** Zwolnienie miejsca na plik, którego nie udało się wysłać (pracownia dostaje powiadomienie od razu). */
export async function skipUpload(token: string): Promise<void> {
  await fetch('/api/zgloszenia/zalaczniki', {
    method: 'POST',
    headers: { 'x-upload-token': token, 'x-upload-skip': '1' },
  }).catch(() => undefined)
}
