/**
 * „Zamów z innym kamieniem” (zlecenie V): warianty kamienia na karcie pierścionka. Wariant to propozycja do rozmowy
 * (Michał dobiera kamień u dostawcy według dostępności), nie osobny produkt: bez ceny, bez `Offer` w danych strukturalnych.
 *
 * Wspólne dla panelu (lista kolorów kółek), serializacji danych strony i komponentu na karcie.
 */
import type { Media, Product } from '../payload-types'

export type SwatchId =
  | 'zielony'
  | 'oliwkowy'
  | 'niebieski'
  | 'granatowy'
  | 'londonblue'
  | 'jasnoniebieski'
  | 'fioletowy'
  | 'czerwony'
  | 'rozowy'
  | 'zolty'
  | 'bialy'

/**
 * Kolory kółek. Odcienie tej samej rodziny co kropki filtra kolorów na liście (`STONE_FILTERS` w `catalog.ts`),
 * dobrane tak, żeby kółka obok siebie dało się odróżnić (np. granat od niebieskiego i jasnoniebieskiego).
 * `londonblue` i `oliwkowy` (zlecenie Z): osobne kółka dla topazu London blue i turmalinu oliwkowego, żeby na karcie
 * nie było dwóch kółek tego samego koloru (granat/zieleń).
 */
export const SWATCHES: readonly { id: SwatchId; label: string; hex: string }[] = [
  { id: 'zielony', label: 'Zielony', hex: '#2F6B4F' },
  { id: 'oliwkowy', label: 'Oliwkowy', hex: '#7C7A2F' },
  { id: 'niebieski', label: 'Niebieski', hex: '#2F4F8F' },
  { id: 'granatowy', label: 'Granatowy', hex: '#1E2A55' },
  { id: 'londonblue', label: 'London blue', hex: '#1F5A6E' },
  { id: 'jasnoniebieski', label: 'Jasnoniebieski', hex: '#7FA8CF' },
  { id: 'fioletowy', label: 'Fioletowy', hex: '#6B4B8C' },
  { id: 'czerwony', label: 'Czerwony', hex: '#9E2235' },
  { id: 'rozowy', label: 'Różowy', hex: '#D98A9E' },
  { id: 'zolty', label: 'Żółty', hex: '#D2A92E' },
  { id: 'bialy', label: 'Biały', hex: '#FBFBF8' },
]

export const SWATCH_IDS = SWATCHES.map(({ id }) => id)

export function swatchHex(id: string | null | undefined): string {
  return SWATCHES.find((swatch) => swatch.id === id)?.hex ?? '#C9C6BD'
}

/**
 * Adres wariantu w `?kamien=`: „Różowy szafir i diamenty” → `rozowy-szafir-i-diamenty`. Polskie litery bez ogonków,
 * żeby link dało się przepisać i wkleić bez kodowania.
 */
export function stoneSlug(stone: string): string {
  return stone
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export type StoneVariant = {
  /** `stoneSlug(stone)`; unikalny w obrębie karty (powtórzenie dostaje końcówkę `-2`). */
  slug: string
  stone: string
  swatch: SwatchId
  /** Pierwszy obraz (zastępuje 1. zdjęcie karty); to samo co `images[0]`. */
  image: string
  /**
   * Obrazy wariantu w kolejności zdjęć karty (zlecenie Y): „Obraz”, potem „Kolejne obrazy”. Jeden element = wariant
   * z jednym obrazem (V/W). Po wyborze kamienia galeria pokazuje tylko te obrazy, oryginałów z nimi nie mieszamy.
   */
  images: string[]
  /**
   * Prawdziwy film wariantu (zlecenie AB: filmy kart połączonych w jeden fason); pusty = po wyborze kamienia gra film
   * oryginału. Wpis z Data Cache sprzed AB nie ma tego pola, więc czytaj przez `variantVideo`.
   */
  video: string
  alt: string
  isVisualization: boolean
}

type VariantEntry = NonNullable<Product['stoneVariants']>[number]

const populated = (asset: number | Media | null | undefined): Media | null =>
  typeof asset === 'object' && asset !== null ? asset : null

/** Warianty z Payload do danych strony: tylko kompletne (kamień, kolor z listy, obraz), z unikalnym adresem. */
export function serializeStoneVariants(entries: readonly VariantEntry[] | null | undefined): StoneVariant[] {
  const used = new Set<string>()
  const variants: StoneVariant[] = []
  for (const entry of entries ?? []) {
    const stone = entry.stone?.replace(/\s+/g, ' ').trim() ?? ''
    const image = populated(entry.image)?.url ?? ''
    // Tylko obrazy (film w „Kolejnych obrazach” to pomyłka w panelu); kolejność z panelu, bez powtórzeń.
    const more = (entry.moreImages ?? [])
      .map(populated)
      .filter((asset): asset is Media => Boolean(asset?.url) && !asset?.mimeType?.startsWith('video/'))
      .map((asset) => asset.url as string)
    const clip = populated(entry.video)
    const video = clip?.url && clip.mimeType?.startsWith('video/') ? clip.url : ''
    const swatch = SWATCH_IDS.find((id) => id === entry.swatch)
    if (!stone || !image || !swatch) continue
    const base = stoneSlug(stone) || 'kamien'
    let slug = base
    for (let n = 2; used.has(slug); n += 1) slug = `${base}-${n}`
    used.add(slug)
    variants.push({
      slug,
      stone,
      swatch,
      image,
      images: [...new Set([image, ...more])],
      video,
      alt: entry.alt?.trim() ?? '',
      // Brak wartości traktujemy jak wizualizację: etykieta „Wizualizacja” to bezpieczniejszy błąd niż jej brak.
      isVisualization: entry.isVisualization !== false,
    })
  }
  return variants
}

/**
 * Obrazy wariantu do galerii, odporne na dane sprzed Y: wpis z Data Cache zapisany starszym kodem ma tylko `image`
 * (bez `images`), a cache Vercela jest wspólny dla wdrożeń. Wtedy wariant ma jeden obraz.
 */
export function variantImages(variant: Pick<StoneVariant, 'image'> & { images?: readonly string[] | null }): string[] {
  const images = (variant.images ?? []).filter(Boolean)
  if (images.length) return [...images]
  return variant.image ? [variant.image] : []
}

/** Film wariantu, odporny na dane sprzed AB (wpis z Data Cache bez pola `video`). */
export const variantVideo = (variant: { video?: string | null }): string => variant.video ?? ''

/**
 * Film w galerii karty. Wariant z własnym filmem (AB) pokazuje swój, z okładką z obrazu wariantu; w innym razie gra film
 * oryginału z okładką oryginału (zlecenie Y). Brak filmu = `null`. `variantSrcs`: obrazy wybranego wariantu (puste = oryginał).
 */
export function galleryVideo(
  variant: { video?: string | null } | null | undefined,
  variantSrcs: readonly string[],
  cardVideo: string,
  cardImages: readonly string[],
): { src: string; poster: string } | null {
  const own = variant && variantSrcs.length ? variantVideo(variant) : ''
  if (own) return { src: own, poster: variantSrcs[0] }
  return cardVideo ? { src: cardVideo, poster: cardImages[0] ?? '' } : null
}

/**
 * Opis alternatywny n-tego obrazu wariantu (od 0). Pierwszy = alt z panelu; kolejne dostają „ujęcie N”, żeby czytnik
 * ekranu nie czytał kilka razy tego samego. Wizualizacja zawsze kończy się „(wizualizacja)”.
 */
export function variantImageAlt(
  name: string,
  variant: Pick<StoneVariant, 'alt' | 'stone' | 'isVisualization'>,
  index = 0,
): string {
  const mark = ' (wizualizacja)'
  let base = variant.alt || `${name} z kamieniem: ${variant.stone.toLowerCase()}`
  const marked = variant.isVisualization || base.toLowerCase().endsWith(mark)
  if (base.toLowerCase().endsWith(mark)) base = base.slice(0, -mark.length)
  if (index > 0) base = `${base}, ujęcie ${index + 1}`
  return marked ? `${base}${mark}` : base
}

/** Wariant z parametru `?kamien=`; nieznany adres (np. wariant usunięty w panelu) = oryginał. */
export function findVariant(variants: readonly StoneVariant[], slug: string | null | undefined): StoneVariant | null {
  if (!slug) return null
  return variants.find((variant) => variant.slug === slug) ?? null
}

/**
 * Kolor kółka oryginału: z nazwy kamienia na karcie („Szafir różowy, diament” → różowy).
 *
 * Dwa poziomy: najpierw kolor doprecyzowany w nazwie (granatowy, London blue, oliwkowy, różowy), bo „Szafir granatowy”
 * to granat, a nie zwykły niebieski – nawet gdy słowo „szafir” stoi wcześniej. Dopiero bez takiego doprecyzowania
 * liczy się pierwszy wymieniony kamień (zlecenie Z; przy remisie pozycji wygrywa reguła wyżej na liście).
 */
export function originalSwatch(stone: string): SwatchId {
  const text = stone.toLowerCase()
  const qualifiers: [RegExp, SwatchId][] = [
    [/oliwk|oliwin|peridot/, 'oliwkowy'],
    [/topaz london|london/, 'londonblue'],
    [/granatow|tanzanit/, 'granatowy'],
    [/ró[żz]ow|morganit/, 'rozowy'],
  ]
  const stones: [RegExp, SwatchId][] = [
    [/szmaragd|zielon|chryzopraz|awenturyn/, 'zielony'],
    [/topaz (sky|swiss)|sky|swiss|jasnoniebiesk|b[łl][ęe]kitn|akwamaryn/, 'jasnoniebieski'],
    [/szafir|topaz|niebiesk/, 'niebieski'],
    [/rubin|granat\b|czerwon/, 'czerwony'],
    [/ametyst|fiolet/, 'fioletowy'],
    [/cytryn|[żz][óo][łl]t/, 'zolty'],
  ]
  const earliest = (rules: [RegExp, SwatchId][]): SwatchId | null => {
    let best: { at: number; id: SwatchId } | null = null
    for (const [pattern, id] of rules) {
      const at = text.search(pattern)
      if (at !== -1 && (!best || at < best.at)) best = { at, id }
    }
    return best?.id ?? null
  }
  return earliest(qualifiers) ?? earliest(stones) ?? 'bialy'
}

/**
 * Dopisek pod kółkami (Kamila 05.11, zlecenie Y.2): jeden tekst dla każdej karty z wariantami. Wizualizacja pokazuje
 * kolor, a kamień naturalny klient i tak zobaczy przed zamówieniem.
 */
export const STONE_VARIANTS_NOTE_NATURAL =
  'Kamienie naturalne różnią się między sobą odcieniem i blaskiem – przed zamówieniem pokażemy Ci zdjęcie lub film kamienia, który dla Ciebie wybierzemy.'
export const STONE_VARIANTS_NOTE = `Wizualizacje pokazują kolor kamienia. ${STONE_VARIANTS_NOTE_NATURAL}`

/**
 * Dopisek dla konkretnej karty: zdanie o wizualizacjach tylko, gdy któryś wariant jest wizualizacją. Karta z samymi
 * prawdziwymi zdjęciami (AB, np. Urania) dostaje tylko zdanie o kamieniach naturalnych.
 */
export function stoneVariantsNote(variants: readonly Pick<StoneVariant, 'isVisualization'>[]): string {
  const rest = variants.some((variant) => variant.isVisualization) ? STONE_VARIANTS_NOTE : STONE_VARIANTS_NOTE_NATURAL
  return `${PHOTOGRAPHED_STONE_NOTE} ${rest}`
}

/**
 * Kamień główny z pola karty do kółka i podpisu filmu: część przed pierwszym przecinkiem
 * („Diament niebieski, diamenty” → „Diament niebieski”).
 */
export function mainStoneName(stone: string | null | undefined): string {
  return (stone ?? '').split(',')[0].replace(/\s+/g, ' ').trim()
}

/**
 * Pierwsze kółko to kamień, z którym pierścionek widać na prawdziwych zdjęciach. Nazywamy je kamieniem (jak pozostałe),
 * a nie „oryginałem” (Marcin 06.11: „oryginał” brzmiał, jakby reszta była podróbką); znaczenie niesie to zdanie w dopisku.
 */
export const PHOTOGRAPHED_STONE_NOTE = 'Pierwszy kolor to kamień z prawdziwych zdjęć i filmu tego pierścionka.'

/** Nazwa kółka zdjęciowego dla czytnika ekranu, np. „Diament niebieski, diamenty – kamień ze zdjęć”. */
export function photographedStoneLabel(stone: string | null | undefined): string {
  const full = (stone ?? '').trim()
  return full ? `${full} – kamień ze zdjęć` : 'Kamień ze zdjęć'
}

/**
 * Podpis filmu, gdy wybrany jest inny kamień, a gra film pierścionka ze zdjęć (filmu nie przemalowujemy), np.
 * „Na filmie kamień: diament niebieski”. Bez nazwy kamienia na karcie – „Na filmie kamień ze zdjęć”.
 */
export function originalFilmCaption(originalStone: string | null | undefined): string {
  const stone = mainStoneName(originalStone)
  if (!stone) return 'Na filmie kamień ze zdjęć'
  // Pierwsza litera mała („Diament niebieski” → „diament niebieski”), reszta bez zmian („London Blue” zostaje).
  return `Na filmie kamień: ${stone.charAt(0).toLocaleLowerCase('pl')}${stone.slice(1)}`
}

/** Adres formularza z karty: nazwa projektu i (gdy wybrany wariant) kamień. */
export function inquiryHref(projectName: string, stone?: string | null): string {
  const params = new URLSearchParams({ temat: 'kolekcja', projekt: projectName })
  if (stone) params.set('kamien', stone)
  return `/kontakt?${params.toString()}`
}
