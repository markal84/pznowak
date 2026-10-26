// Plan importu pierścionków z przeglądu FB (data/facebook/catalog-selection.json) do kolekcji products.
// Czyste funkcje bez Payload i bez dostępu do plików: skrypt cms/scripts/import-fb-catalog.ts zbiera stan bazy,
// tu powstaje plan (co utworzyć, co pominąć, ostrzeżenia), a zapis robi dopiero skrypt z --apply.

export type FbPost = { date: string; postId: string; text: string; url: string }

export type FbCatalogItem = {
  cover: null | string
  key: string
  mergedFrom?: Array<{ key: string; name: string; ownDecision?: null | string }>
  name: string
  note?: string
  photos: string[]
  posts: FbPost[]
  section?: string
  titleOpus?: string
  videos: string[]
}

export type FbGalleryAddition = {
  key: string
  photos: string[]
  posts: FbPost[]
  ring: string
  videos: string[]
}

export type FbCatalogSelection = {
  catalog: FbCatalogItem[]
  galleryAdditions: FbGalleryAddition[]
  generatedAt: string
  selectionRev: number
  warnings: string[]
}

export type FbDetails = {
  carats: string
  certificate: string
  clarity: string
  metal: string
  stone: string
}

export type ExistingMedia = { id: number; mimeType?: null | string; source?: null | string }

export type ExistingProduct = {
  facebookKey?: null | string
  id: number
  media: Array<{ alt?: null | string; asset: ExistingMedia; isPrimary?: boolean | null }>
  name: string
  slug: string
  sortOrder?: null | number
  status: 'draft' | 'published'
}

export type ImportState = {
  mediaBySource: Map<string, { id: number }>
  products: ExistingProduct[]
}

export type PlannedFile = {
  alt: string
  existingMediaId?: number
  file: string
  isPrimary: boolean
  kind: 'photo' | 'video'
  source: string
}

export type PlannedProduct = {
  action: 'create' | 'skip-existing'
  data: {
    carats: string
    clarity: string
    description: string
    lead: string
    metal: string
    name: string
    slug: string
    sortOrder: number
    stone: string
  }
  existingProductId?: number
  files: PlannedFile[]
  key: string
  parsed: FbDetails
  pendingVideos: string[]
  posts: FbPost[]
  warnings: string[]
}

export type PlannedGallery = {
  action: 'append' | 'skip'
  files: PlannedFile[]
  key: string
  pendingVideos: string[]
  productId?: number
  productName?: string
  productStatus?: 'draft' | 'published'
  ring: string
  warnings: string[]
}

export type ImportPlan = {
  gallery: PlannedGallery[]
  products: PlannedProduct[]
  summary: {
    filesToUpload: number
    filesReused: number
    galleryToAppend: number
    pendingVideos: number
    productsToCreate: number
    productsExisting: number
    warnings: number
  }
  warnings: string[]
}

const POLISH: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => POLISH[c])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function uniqueSlug(base: string, taken: Set<string>): string {
  let slug = base
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`
  return slug
}

/** Klucz pliku w media.legacySourceUrl: „fb:<post_id>/<plik>” (plik z media/ ma nazwę <post_id>_<id>.<ext>). */
export function mediaSourceKey(file: string): string {
  const base = file.split('/').pop() ?? file
  return `fb:${base.split('_')[0]}/${base}`
}

export function fileKind(file: string): 'photo' | 'video' {
  return /\.(mp4|mov|m4v|webm)$/i.test(file) ? 'video' : 'photo'
}

/** Tekst posta bez emoji, hasztagów, numerów telefonu i powtórzonej interpunkcji. */
export function cleanPostText(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}️‍]/gu, '')
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, '$1')
    .replace(/(\+?48[\s-]?)?\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/g, '')
    .replace(/([?!])[?!]+/g, '$1')
    .replace(/\.{4,}/g, '…')
    .split('\n')
    .map((line) =>
      line
        .replace(/[ \t]+/g, ' ')
        .replace(/\s+([,.?!])/g, '$1')
        .trim(),
    )
    .filter(Boolean)
    .join('\n')
    .trim()
}

const STONES: Array<[RegExp, string]> = [
  [/niebiesk\p{L}*\s+diament/iu, 'Diament niebieski'],
  [/morganit/iu, 'Morganit'],
  [/ametyst/iu, 'Ametyst'],
  [
    /(malinow|różow)\p{L}*\s+turmalin|turmalin\p{L}*\s+(w kolorze maliny|w delikatnym różu)/iu,
    'Turmalin różowy',
  ],
  [/turmalin/iu, 'Turmalin'],
  [/różow\p{L}*\s+szafir/iu, 'Szafir różowy'],
  [/szafir/iu, 'Szafir'],
  [/oliwin|perydot/iu, 'Oliwin'],
  [/agat/iu, 'Agat'],
  [/tanzanit/iu, 'Tanzanit'],
  [/topaz/iu, 'Topaz'],
  [/szmaragd(?!ow)/iu, 'Szmaragd'],
  [/rubin/iu, 'Rubin'],
  [/cytryn/iu, 'Cytryn'],
  [/akwamaryn/iu, 'Akwamaryn'],
]
const DIAMOND = /diament|brylant/iu

function mainStone(text: string): string {
  return STONES.find(([pattern]) => pattern.test(text))?.[1] ?? ''
}

/**
 * Szkic danych z nazwy karty i tekstu postów. Kamień główny najpierw z nazwy (tekst postów potrafi wspominać
 * inne modele), karaty też najpierw z nazwy. Wszystko to szkic do sprawdzenia przez Michała.
 */
export function extractDetails(name: string, texts: string[]): FbDetails {
  const all = [name, ...texts].join('\n')
  const fromName = mainStone(name)
  const main = fromName || (DIAMOND.test(name) ? '' : mainStone(texts.join('\n')))
  const hasDiamond = DIAMOND.test(all)
  const stone = main
    ? main.startsWith('Diament') || !hasDiamond
      ? main
      : `${main}, Diament`
    : hasDiamond
      ? 'Diament'
      : ''

  const caratPattern = /(\d+[,.]\d+)\s*(?:ct|kt|karat)/iu
  const carat = name.match(caratPattern) ?? texts.join('\n').match(caratPattern)
  const carats = carat ? `${carat[1].replace('.', ',')} ct` : ''

  const grade = all.match(/\b(IF|VVS[12]|VS[12]|SI[123]|I[123])\b/)?.[1]
  const color = all.match(/\bbarw(?:ie|a|y)\s+([D-Z])\b/u)?.[1]
  const clarity = [grade, color ? `barwa ${color}` : ''].filter(Boolean).join(', ')

  const colors: string[] = []
  if (/biał\p{L}*\s+(złot|oprawa|oprawie)|białe złoto|białym złocie/iu.test(all))
    colors.push('biały')
  if (/żółt\p{L}*\s+złot/iu.test(all)) colors.push('żółty')
  if (/różow\p{L}*\s+złot|rose gold/iu.test(all)) colors.push('różowy')
  if (/platyn/iu.test(all)) colors.push('platyna')
  const metalText = colors.join(' i ')
  const metal = metalText ? metalText[0].toUpperCase() + metalText.slice(1) : ''

  const certificate = all.match(/\b(GIA|IGI|HRD)\b/)?.[1] ?? ''

  return { carats, certificate, clarity, metal, stone }
}

/** Szkic pełnego opisu: oczyszczone teksty postów od najstarszego, bez powtórzeń. */
export function draftDescription(posts: FbPost[]): string {
  const seen = new Set<string>()
  return [...posts]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((post) => cleanPostText(post.text))
    .filter((text) => text && !seen.has(text) && seen.add(text))
    .join('\n\n')
}

/** Szkic krótkiego opisu: pierwsze zdanie najdłuższego posta, najwyżej 160 znaków. */
export function draftLead(posts: FbPost[]): string {
  const longest = posts
    .map((post) => cleanPostText(post.text))
    .sort((a, b) => b.length - a.length)[0]
    ?.split('\n')[0]
  if (!longest) return ''
  const sentence = longest.match(/^.*?[.!?…](?=\s|$)/u)?.[0] ?? longest
  if (sentence.length <= 160) return sentence
  return `${sentence.slice(0, 159).replace(/\s+\S*$/u, '')}…`
}

function plannedFile(
  file: string,
  isPrimary: boolean,
  alt: string,
  state: ImportState,
): PlannedFile {
  const source = mediaSourceKey(file)
  return {
    alt,
    existingMediaId: state.mediaBySource.get(source)?.id,
    file,
    isPrimary,
    kind: fileKind(file),
    source,
  }
}

function isVideo(media: ExistingMedia): boolean {
  return Boolean(media.mimeType?.startsWith('video/'))
}

export function buildImportPlan(selection: FbCatalogSelection, state: ImportState): ImportPlan {
  const warnings = selection.warnings.map((warning) => `eksport: ${warning}`)
  const byKey = new Map(
    state.products.filter((p) => p.facebookKey).map((p) => [p.facebookKey as string, p] as const),
  )
  const takenSlugs = new Set(state.products.map((p) => p.slug))
  let sortOrder = Math.max(0, ...state.products.map((p) => p.sortOrder ?? 0))

  const products = selection.catalog.map((item): PlannedProduct => {
    const itemWarnings: string[] = []
    const texts = item.posts.map((post) => post.text)
    const parsed = extractDetails(item.name, texts)
    const existing = byKey.get(item.key)
    const baseSlug = slugify(item.name)
    const slug = existing ? existing.slug : uniqueSlug(baseSlug, takenSlugs)
    if (!existing) {
      takenSlugs.add(slug)
      if (slug !== baseSlug) itemWarnings.push(`adres „${baseSlug}” jest zajęty, użyty „${slug}”`)
    }

    const photos = item.cover
      ? [item.cover, ...item.photos.filter((p) => p !== item.cover)]
      : item.photos
    if (!photos.length) itemWarnings.push('brak zdjęć „w katalogu” – szkic bez zdjęcia głównego')
    const [video, ...pendingVideos] = item.videos
    if (pendingVideos.length) {
      itemWarnings.push(
        `${item.videos.length} filmy: importowany pierwszy, ${pendingVideos.length} czeka na galerię filmów`,
      )
    }
    const files = [
      ...photos.map((file, i) =>
        plannedFile(file, i === 0, `${item.name} – zdjęcie ${i + 1}`, state),
      ),
      ...(video ? [plannedFile(video, false, `${item.name} – film`, state)] : []),
    ]
    if (!parsed.stone) itemWarnings.push('nie rozpoznano kamienia – uzupełnić ręcznie')
    if (!parsed.metal) itemWarnings.push('nie rozpoznano koloru złota – uzupełnić ręcznie')

    return {
      action: existing ? 'skip-existing' : 'create',
      data: {
        carats: parsed.carats,
        clarity: parsed.clarity,
        description: draftDescription(item.posts),
        lead: draftLead(item.posts),
        metal: parsed.metal,
        name: item.name,
        slug,
        sortOrder: existing ? (existing.sortOrder ?? 0) : (sortOrder += 1),
        stone: parsed.stone,
      },
      existingProductId: existing?.id,
      files,
      key: item.key,
      parsed,
      pendingVideos,
      posts: item.posts,
      warnings: itemWarnings,
    }
  })

  const byName = new Map<string, ExistingProduct[]>()
  for (const product of state.products) {
    const name = product.name.trim().toLowerCase()
    byName.set(name, [...(byName.get(name) ?? []), product])
  }

  const gallery = selection.galleryAdditions.map((addition): PlannedGallery => {
    const itemWarnings: string[] = []
    const candidates = addition.ring
      .split('/')
      .flatMap((name) => byName.get(name.trim().toLowerCase()) ?? [])
    const base = { files: [], key: addition.key, pendingVideos: [], ring: addition.ring }
    if (candidates.length !== 1) {
      return {
        ...base,
        action: 'skip',
        pendingVideos: addition.videos,
        warnings: [
          candidates.length
            ? `„${addition.ring}” pasuje do ${candidates.length} produktów (${candidates.map((p) => p.slug).join(', ')}) – do rozstrzygnięcia`
            : `nie znaleziono produktu o nazwie „${addition.ring}”`,
        ],
      }
    }
    const product = candidates[0]
    const attached = new Set(product.media.map((m) => m.asset.source).filter(Boolean))
    let videos = product.media.filter((m) => isVideo(m.asset)).length
    const pendingVideos: string[] = []
    const files: PlannedFile[] = []
    let n = product.media.length
    for (const file of [...addition.photos, ...addition.videos]) {
      const source = mediaSourceKey(file)
      if (attached.has(source)) {
        itemWarnings.push(`${file} jest już w galerii – pominięty`)
        continue
      }
      if (fileKind(file) === 'video') {
        if (videos >= 1) {
          pendingVideos.push(file)
          continue
        }
        videos += 1
      }
      n += 1
      files.push(
        plannedFile(
          file,
          false,
          fileKind(file) === 'video' ? `${product.name} – film` : `${product.name} – zdjęcie ${n}`,
          state,
        ),
      )
    }
    if (pendingVideos.length) {
      itemWarnings.push(
        `${pendingVideos.length} film(y) czeka na galerię filmów (produkt może mieć dziś najwyżej jeden film)`,
      )
    }
    return {
      action: files.length ? 'append' : 'skip',
      files,
      key: addition.key,
      pendingVideos,
      productId: product.id,
      productName: product.name,
      productStatus: product.status,
      ring: addition.ring,
      warnings: itemWarnings,
    }
  })

  const created = products.filter((p) => p.action === 'create')
  const appended = gallery.filter((g) => g.action === 'append')
  const newFiles = [...created.flatMap((p) => p.files), ...appended.flatMap((g) => g.files)]
  const uniqueNew = new Set(newFiles.filter((f) => !f.existingMediaId).map((f) => f.source))

  return {
    gallery,
    products,
    summary: {
      filesToUpload: uniqueNew.size,
      filesReused: newFiles.filter((f) => f.existingMediaId).length,
      galleryToAppend: appended.length,
      pendingVideos:
        products.reduce((n, p) => n + p.pendingVideos.length, 0) +
        gallery.reduce((n, g) => n + g.pendingVideos.length, 0),
      productsExisting: products.length - created.length,
      productsToCreate: created.length,
      warnings:
        warnings.length +
        products.reduce((n, p) => n + p.warnings.length, 0) +
        gallery.reduce((n, g) => n + g.warnings.length, 0),
    },
    warnings,
  }
}
