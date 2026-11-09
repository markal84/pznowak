import { slugField, type CollectionConfig } from 'payload'

import {
  isAdmin,
  isAdminOrEditor,
  isAuthenticatedOrPublished,
} from '../access/permissions'
import { revalidateAfterChange, revalidateAfterDelete } from '../lib/frontend-publication'

/** Rodzaje realizacji i biżuterii: te same wartości używa strona (`src/lib/works.ts`). */
export const WORK_KINDS = [
  { label: 'Na zamówienie', value: 'zamowienie' },
  { label: 'Przeróbka', value: 'przerobka' },
] as const

export const WORK_JEWELRY_TYPES = [
  { label: 'Pierścionek', value: 'pierscionek' },
  { label: 'Obrączka', value: 'obraczka' },
  { label: 'Kolczyki', value: 'kolczyki' },
  { label: 'Inne', value: 'inne' },
] as const

/**
 * Realizacje: rzeczy zrobione dla konkretnej osoby, z krótką historią (strona „Realizacje”).
 * Pierścionek zrobiony „na półkę” to produkt i jego miejsce jest w katalogu. Stara galeria (`gallery-items`) zostaje
 * w panelu jako archiwum zdjęć, strona już z niej nie korzysta.
 */
export const Works: CollectionConfig = {
  slug: 'works',
  dbName: 'cms_works',
  labels: {
    singular: 'Realizacja',
    plural: 'Realizacje',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'kind', 'year', 'featured', 'position', '_status', 'updatedAt'],
    group: 'Katalog',
    listSearchableFields: ['title', 'slug'],
    description:
      'Biżuteria zrobiona dla konkretnych osób, z krótką historią. Każda realizacja to jeden kafelek na stronie „Realizacje”.',
  },
  access: {
    create: isAdminOrEditor,
    read: isAuthenticatedOrPublished,
    update: isAdminOrEditor,
    delete: isAdmin,
    readVersions: isAdminOrEditor,
  },
  defaultSort: 'position',
  trash: true,
  versions: {
    drafts: true,
    maxPerDoc: 30,
  },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        revalidateAfterChange('work', doc, previousDoc, req)
        return doc
      },
    ],
    afterDelete: [({ doc, req }) => revalidateAfterDelete('work', doc, req)],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Tytuł',
      required: true,
      admin: {
        description: 'Krótko, np. „Pierścionek z morganitem”. Widać go nad opisem i pod zdjęciem na kafelku.',
      },
    },
    slugField({
      useAsSlug: 'title',
      required: true,
    }),
    {
      type: 'row',
      fields: [
        {
          name: 'kind',
          type: 'select',
          label: 'Rodzaj realizacji',
          required: true,
          defaultValue: 'zamowienie',
          options: [...WORK_KINDS],
          admin: {
            description: '„Na zamówienie”: zrobione od podstaw dla klienta. „Przeróbka”: z biżuterii, którą klient już miał.',
          },
        },
        {
          name: 'jewelryType',
          type: 'select',
          label: 'Rodzaj biżuterii',
          required: true,
          defaultValue: 'pierscionek',
          options: [...WORK_JEWELRY_TYPES],
          admin: {
            description: 'Od tego zależy napis na przycisku, np. „Chcę podobny pierścionek”.',
          },
        },
        {
          name: 'year',
          type: 'number',
          label: 'Rok',
          min: 1990,
          max: 2100,
          admin: {
            description: 'Rok wykonania, np. 2026. Można zostawić puste.',
          },
        },
      ],
    },
    {
      name: 'task',
      type: 'textarea',
      label: 'Zadanie',
      admin: {
        description: 'Dla kogo i z jaką prośbą przyszedł klient. 1–2 zdania.',
      },
    },
    {
      name: 'whatWeDid',
      type: 'textarea',
      label: 'Co zrobiliśmy',
      admin: {
        description: 'Kamień, oprawa, technika, na co zwróciliśmy uwagę. 1–3 zdania.',
      },
    },
    {
      name: 'duration',
      type: 'text',
      label: 'Czas',
      admin: {
        description: 'Np. „5 tygodni od pierwszej rozmowy”. Można zostawić puste: wtedy wiersza nie ma na stronie.',
      },
    },
    {
      name: 'photos',
      type: 'array',
      label: 'Zdjęcia',
      labels: { singular: 'Zdjęcie', plural: 'Zdjęcia' },
      minRows: 1,
      required: true,
      admin: {
        description: 'Pierwsze zdjęcie jest okładką kafelka i dużym zdjęciem w oknie. Kolejność zmienisz przeciągając.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Zdjęcie',
          required: true,
          filterOptions: {
            mimeType: {
              contains: 'image/',
            },
          },
        },
        {
          name: 'alt',
          type: 'text',
          label: 'Opis zdjęcia',
          required: true,
          admin: {
            description: 'Co widać na zdjęciu, jednym zdaniem. Czytają to osoby niewidzące i wyszukiwarki.',
          },
        },
      ],
    },
    {
      name: 'videos',
      type: 'array',
      label: 'Filmy',
      labels: { singular: 'Film', plural: 'Filmy' },
      admin: {
        description:
          'Opcjonalne filmy realizacji (np. film z procesu i gotowa biżuteria). Pokazują się w oknie realizacji po zdjęciach, z odtwarzaczem.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'file',
          type: 'upload',
          relationTo: 'media',
          label: 'Film',
          required: true,
          filterOptions: {
            mimeType: {
              contains: 'video/',
            },
          },
        },
        {
          name: 'caption',
          type: 'text',
          label: 'Podpis',
          required: true,
          admin: {
            description: 'Krótko, co to za film, np. „Film z procesu” albo „Gotowe kolczyki”. Czytają go też osoby niewidzące.',
          },
        },
        {
          name: 'poster',
          type: 'upload',
          relationTo: 'media',
          label: 'Okładka filmu (opcjonalnie)',
          filterOptions: {
            mimeType: {
              contains: 'image/',
            },
          },
          admin: {
            description: 'Klatka widoczna, zanim ktoś włączy film. Bez niej użyjemy okładki realizacji.',
          },
        },
      ],
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      label: 'Powiązany pierścionek z katalogu',
      admin: {
        description:
          'Jeśli taki pierścionek jest też w katalogu, przy realizacji pojawi się link „Zobacz w katalogu”. Można zostawić puste.',
      },
    },
    {
      name: 'needsConfirmation',
      type: 'checkbox',
      label: 'Tekst czeka na potwierdzenie przez Michała',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Zaznaczone: na podglądach (nie na stronie publicznej) opisy mają żółtą ramkę, a brakujący czas wyświetla się jako „do uzupełnienia”. Odznacz po sprawdzeniu.',
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      label: 'Wyróżniona',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Pokazuje się w górnym oknie, zanim ktoś kliknie kafelek. Gdy zaznaczonych jest kilka albo żadna, wygrywa pierwsza wg kolejności.',
      },
    },
    {
      name: 'position',
      type: 'number',
      label: 'Kolejność',
      defaultValue: 0,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Mniejsza liczba = wcześniej na liście kafelków.',
      },
    },
  ],
}
