import {
  BlocksFeature,
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnorderedListFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import type { Block, Field } from 'payload'

/**
 * Bloki poradników (kolekcja „Poradniki”, src/collections/Guides.ts).
 *
 * Treść poradnika to lista bloków-sekcji (`GUIDE_LAYOUT_BLOCKS`): każda sekcja ma nagłówek H2 z kotwicą i pozycję w
 * spisie treści. W tekście sekcji można wstawić bloki osadzone (`GUIDE_BODY_BLOCKS`): kalkulator rozmiaru, tabele,
 * rysunek, wyróżnioną uwagę. Kalkulator i tabele z danymi zostają komponentami w kodzie, w panelu wybiera się tylko,
 * gdzie stoją. Strona renderuje bloki w src/components/site/GuideContent.tsx.
 */

const inlineFeatures = () => [
  ParagraphFeature(),
  BoldFeature(),
  ItalicFeature(),
  // Tylko adresy wpisywane ręcznie: „/na-zamowienie”, „/poradniki/…”, „#kalkulator” (kotwica na tej samej stronie).
  LinkFeature({ enabledCollections: [] }),
  InlineToolbarFeature(),
]

/** Krótki tekst w bloku: akapity, pogrubienie, kursywa, link. */
export const guideTextEditor = lexicalEditor({
  features: () => [...inlineFeatures(), FixedToolbarFeature()],
})

const ANCHOR_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const anchorField = (description: string): Field => ({
  name: 'anchor',
  type: 'text',
  label: 'Kotwica (adres sekcji po #)',
  required: true,
  admin: { description, width: '50%' },
  validate: (value: unknown) =>
    typeof value === 'string' && ANCHOR_PATTERN.test(value) ? true : 'Małe litery bez polskich znaków, cyfry i myślniki, np. „jak-wybrac”.',
})

const tocLabelField: Field = {
  name: 'tocLabel',
  type: 'text',
  label: 'Nazwa w spisie treści',
  admin: { description: 'Puste = nagłówek sekcji.', width: '50%' },
}

const captionField = (defaultValue: string): Field => ({
  name: 'caption',
  type: 'text',
  label: 'Opis tabeli dla czytników ekranu',
  defaultValue,
  admin: { description: 'Niewidoczny na stronie; czytają go czytniki ekranu i Google.' },
})

// ---------- Bloki osadzane w tekście sekcji ----------

const RingSizeCalculatorBlock: Block = {
  slug: 'ringSizeCalculator',
  interfaceName: 'GuideRingSizeCalculatorBlock',
  labels: { singular: 'Kalkulator rozmiaru pierścionka', plural: 'Kalkulatory rozmiaru' },
  admin: { disableBlockName: true },
  fields: [],
}

const RingSizeTableBlock: Block = {
  slug: 'ringSizeTable',
  interfaceName: 'GuideRingSizeTableBlock',
  labels: { singular: 'Tabela rozmiarów pierścionków', plural: 'Tabele rozmiarów' },
  admin: { disableBlockName: true },
  fields: [captionField('Rozmiary pierścionków: polski, obwód, średnica, amerykański')],
}

const RingSizeFigureBlock: Block = {
  slug: 'ringSizeFigure',
  interfaceName: 'GuideRingSizeFigureBlock',
  labels: { singular: 'Rysunek: średnica i obwód pierścionka', plural: 'Rysunki: średnica i obwód' },
  admin: { disableBlockName: true },
  fields: [
    {
      name: 'figcaption',
      type: 'text',
      label: 'Podpis pod rysunkiem',
      defaultValue: 'Liczy się wnętrze pierścionka, bez grubości metalu.',
    },
  ],
}

const StoneComparisonBlock: Block = {
  slug: 'stoneComparison',
  interfaceName: 'GuideStoneComparisonBlock',
  labels: { singular: 'Tabela porównania kamieni', plural: 'Tabele porównania kamieni' },
  admin: { disableBlockName: true },
  fields: [
    {
      ...captionField('Kamienie do pierścionka zaręczynowego: twardość, kolory, noszenie na co dzień'),
      admin: {
        description:
          'Wiersze tabeli powstają same z bloków „Kamień” tego poradnika, od najtwardszego. Ten opis jest niewidoczny na stronie (czytniki ekranu i Google).',
      },
    } as Field,
  ],
}

const TableBlock: Block = {
  slug: 'dataTable',
  interfaceName: 'GuideTableBlock',
  labels: { singular: 'Tabela', plural: 'Tabele' },
  admin: { disableBlockName: true },
  fields: [
    captionField(''),
    {
      name: 'columns',
      type: 'array',
      label: 'Nagłówki kolumn',
      labels: { singular: 'Kolumna', plural: 'Kolumny' },
      minRows: 2,
      fields: [{ name: 'label', type: 'text', label: 'Nagłówek', required: true }],
    },
    {
      name: 'rows',
      type: 'array',
      label: 'Wiersze',
      labels: { singular: 'Wiersz', plural: 'Wiersze' },
      admin: { description: 'Pierwsza komórka wiersza to jego nagłówek (pierwsza kolumna), pozostałe to kolejne kolumny.' },
      fields: [
        { name: 'label', type: 'text', label: 'Nagłówek wiersza', required: true },
        {
          name: 'cells',
          type: 'array',
          label: 'Komórki',
          labels: { singular: 'Komórka', plural: 'Komórki' },
          fields: [{ name: 'text', type: 'text', label: 'Tekst', required: true }],
        },
      ],
    },
  ],
}

const NoteBlock: Block = {
  slug: 'note',
  interfaceName: 'GuideNoteBlock',
  labels: { singular: 'Wyróżniona uwaga', plural: 'Wyróżnione uwagi' },
  admin: { disableBlockName: true },
  fields: [{ name: 'text', type: 'richText', label: 'Tekst', required: true, editor: guideTextEditor }],
}

const IfPricesBlock: Block = {
  slug: 'ifPrices',
  interfaceName: 'GuideIfPricesBlock',
  labels: { singular: 'Tekst zależny od cen w kolekcji', plural: 'Teksty zależne od cen' },
  admin: { disableBlockName: true },
  fields: [
    {
      name: 'withPrices',
      type: 'richText',
      label: 'Gdy w kolekcji są ceny',
      editor: guideTextEditor,
      admin: { description: '{cena} zamienia się w najniższą cenę z kolekcji, np. „od 1 900 zł”.' },
    },
    {
      name: 'withoutPrices',
      type: 'richText',
      label: 'Gdy żaden pierścionek nie ma ceny',
      editor: guideTextEditor,
    },
  ],
}

export const GUIDE_BODY_BLOCKS: Block[] = [
  RingSizeCalculatorBlock,
  RingSizeTableBlock,
  RingSizeFigureBlock,
  StoneComparisonBlock,
  TableBlock,
  NoteBlock,
  IfPricesBlock,
]

/** Tekst sekcji: akapity, nagłówki H3, listy, linki i bloki osadzone. */
export const guideBodyEditor = lexicalEditor({
  features: () => [
    ...inlineFeatures(),
    HeadingFeature({ enabledHeadingSizes: ['h3'] }),
    OrderedListFeature(),
    UnorderedListFeature(),
    BlocksFeature({ blocks: GUIDE_BODY_BLOCKS }),
    FixedToolbarFeature(),
  ],
})

// ---------- Sekcje poradnika (H2 + pozycja w spisie treści) ----------

const SectionBlock: Block = {
  slug: 'section',
  interfaceName: 'GuideSectionBlock',
  labels: { singular: 'Sekcja', plural: 'Sekcje' },
  admin: { disableBlockName: true },
  fields: [
    { name: 'heading', type: 'text', label: 'Nagłówek sekcji (H2)', required: true },
    {
      type: 'row',
      fields: [
        anchorField('Np. „krotko” daje adres …#krotko. Nie zmieniaj w opublikowanym poradniku: mogą tu prowadzić linki.'),
        tocLabelField,
      ],
    },
    { name: 'content', type: 'richText', label: 'Treść', editor: guideBodyEditor },
  ],
}

export const STONE_DAILY_OPTIONS = ['Bardzo dobry', 'Dobry', 'Dobry w ochronnej oprawie'] as const

const StoneBlock: Block = {
  slug: 'stone',
  interfaceName: 'GuideStoneBlock',
  labels: { singular: 'Kamień (z przykładami z kolekcji)', plural: 'Kamienie' },
  admin: { disableBlockName: true },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', label: 'Nazwa (nagłówek H2)', required: true, admin: { width: '50%' } },
        anchorField('Karty pierścionków linkują do kamieni po tej kotwicy (src/lib/guide-links.ts), więc nie zmieniaj jej w opublikowanym poradniku.'),
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'mohs', type: 'text', label: 'Twardość (Mohs)', required: true, admin: { width: '25%', description: 'Np. „9” albo „7,5–8”.' } },
        { name: 'colors', type: 'text', label: 'Kolory', required: true, admin: { width: '50%' } },
        {
          name: 'daily',
          type: 'select',
          label: 'Na co dzień',
          required: true,
          options: STONE_DAILY_OPTIONS.map((value) => ({ label: value, value })),
          admin: { width: '25%' },
        },
      ],
    },
    { name: 'text', type: 'richText', label: 'Opis kamienia', required: true, editor: guideTextEditor },
    {
      name: 'catalogStones',
      type: 'text',
      label: 'Przykłady z kolekcji: kamień główny karty',
      required: true,
      admin: {
        description:
          'Początek nazwy kamienia głównego z karty, małymi literami; kilka po przecinku, np. „ametyst, cytryn”. Strona pokazuje do 3 takich pierścionków.',
      },
    },
    {
      name: 'includeVariants',
      type: 'checkbox',
      label: 'Uzupełniaj przykłady pierścionkami, które mają ten kamień jako wariant',
      admin: { description: 'Gdy mało kart ma ten kamień jako główny (np. oliwin).' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'catalogFilter',
          type: 'select',
          label: 'Link pod przykładami: filtr koloru',
          required: true,
          options: [
            { label: 'Niebieskie', value: 'niebieskie' },
            { label: 'Zielone', value: 'zielone' },
            { label: 'Czerwone i różowe', value: 'rozowe' },
            { label: 'Fioletowe', value: 'fioletowe' },
            { label: 'Żółte', value: 'zolte' },
            { label: 'Bezbarwne', value: 'bezbarwne' },
          ],
          admin: { width: '50%' },
        },
        {
          name: 'catalogLinkLabel',
          type: 'text',
          label: 'Tekst linku po „Zobacz”',
          required: true,
          admin: { width: '50%', description: 'Np. „pierścionki z niebieskimi kamieniami”.' },
        },
      ],
    },
  ],
}

const PriceExamplesBlock: Block = {
  slug: 'priceExamples',
  interfaceName: 'GuidePriceExamplesBlock',
  labels: { singular: 'Przykłady cen z kolekcji', plural: 'Przykłady cen' },
  admin: { disableBlockName: true },
  fields: [
    { name: 'heading', type: 'text', label: 'Nagłówek sekcji (H2)', required: true },
    {
      type: 'row',
      fields: [
        anchorField('Np. „przyklady”.'),
        tocLabelField,
      ],
    },
    { name: 'intro', type: 'richText', label: 'Tekst nad pierścionkami', editor: guideTextEditor },
    {
      name: 'linkLabel',
      type: 'text',
      label: 'Link pod pierścionkami (do kolekcji od najniższej ceny)',
      required: true,
      admin: {
        description:
          'Pierścionki (najtańszy, najdroższy i dwa ze środka) strona dobiera sama z kart z ceną. Bez żadnej ceny cała sekcja znika, także ze spisu treści.',
      },
    },
  ],
}

export const GUIDE_LAYOUT_BLOCKS: Block[] = [SectionBlock, StoneBlock, PriceExamplesBlock]
