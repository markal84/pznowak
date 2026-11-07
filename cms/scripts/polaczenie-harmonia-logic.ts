/**
 * Połączenie Leto + Harmonia + Eirene w jeden fason (lista PZ Nowak, sekcja 5, pkt 1): dane i czysta logika planu
 * (bez bazy), żeby dało się ją sprawdzić testem. Używa tego `scripts/staging-polaczenie-harmonia.ts` (tylko staging)
 * oraz `tests/int/polaczenie-harmonia.int.spec.ts`.
 *
 * Karta docelowa to Harmonia (morganit). Eirene (malinowy turmalin) dołącza jako wariant kamienia z PRAWDZIWYCH zdjęć
 * i filmu tej karty (te same pliki Media, bez plakietki „Wizualizacja”). Leto ma te same zdjęcia co Harmonia, więc
 * tylko znika z katalogu. Mechanika (warianty, archiwum, strona główna) jest wspólna ze zleceniem AB.
 * Opis fasonu jest w `seed/opisy/opisy-ac.json` (karta Harmonia), zapisuje go to samo `planAc` co `staging:opisy-ac`.
 */
import { stoneSlug } from '../src/lib/stone-variants'
import type { MergeSpec } from './polaczenie-ab-logic'

export const TARGET = { slug: 'harmonia', name: 'Harmonia' } as const

/** Karty, których zdjęcia stają się wariantem kamienia na karcie docelowej. */
export const VARIANT_MERGES: readonly MergeSpec[] = [
  {
    slug: 'eirene',
    name: 'Eirene',
    stone: 'Turmalin malinowy i diamenty',
    // Kółko „czerwony” (głęboka malina); osobnego malinowego nie ma i nie dokładamy go bez migracji enuma.
    swatch: 'czerwony',
    alt: 'Harmonia z malinowym turmalinem i diamentami w żółtym złocie',
  },
]

/** Karty bez własnego wariantu: ten sam pierścionek i kamień co karta docelowa, więc tylko archiwum i przekierowanie. */
export const ARCHIVE_ONLY: readonly { slug: string; name: string }[] = [{ slug: 'leto', name: 'Leto' }]

/** Wszystkie karty, które znikają z katalogu (w tej kolejności są archiwizowane). */
export const SOURCES: readonly { slug: string; name: string; stone?: string }[] = [...VARIANT_MERGES, ...ARCHIVE_ONLY]

/** Wartość `?kamien=` dla wariantu (to samo, co w `MERGED_RING_VARIANTS` przekierowań; pilnuje tego test). */
export const variantQuery = (merge: MergeSpec) => stoneSlug(merge.stone)

/**
 * Opis Harmonii sprzed połączenia (zlecenie AC) – „znany” tekst, który wolno nadpisać opisem fasonu.
 * Docelowy opis jest w `opisy-ac.json`.
 */
export const HARMONIA_BEFORE_MERGE = {
  lead: 'Trzy kamienie w oprawkach z białego złota na smukłej szynie z żółtego złota.',
  description:
    'Pierścionek w układzie trzech kamieni. Większy kamień centralny i dwa mniejsze diamenty siedzą w oprawkach z białego złota, a smukła szyna z żółtego złota utrzymuje lekki charakter całości.\n\nKażdy kamień oprawiamy ręcznie w naszej pracowni. Na zdjęciach w centrum jest morganit w miękkim odcieniu różu – podobnie jak szmaragd należy do rodziny berylu.\n\nModel wykonamy w wybranym rozmiarze, także z innym kamieniem centralnym.',
} as const
