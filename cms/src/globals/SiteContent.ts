import type { Field, GlobalConfig, Tab } from 'payload'

import { isAdminOrEditor } from '../access/permissions'
import {
  apiKeyDraftOnlyGlobalBeforeChange,
  apiKeyDraftOnlyGlobalBeforeOperation,
} from '../lib/api-key-draft-only'
import { revalidateAfterChange } from '../lib/frontend-publication'

const EMPTY_FALLBACK = 'Puste pole = dotychczasowy tekst strony (src/content/page-texts.ts).'

const titleField = (label = 'Nagłówek H1'): Field => ({
  name: 'title',
  type: 'text',
  label,
  admin: { description: EMPTY_FALLBACK },
})

const introField = (label = 'Wstęp pod nagłówkiem'): Field => ({
  name: 'intro',
  type: 'textarea',
  label,
  admin: { description: EMPTY_FALLBACK },
})

const metaFields = (): Field[] => [
  {
    type: 'collapsible',
    label: 'Google (tytuł i opis w wynikach wyszukiwania)',
    admin: { initCollapsed: true },
    fields: [
      {
        name: 'metaTitle',
        type: 'text',
        label: 'Tytuł strony',
        admin: { description: `Strona sama dopisuje nazwę pracowni. ${EMPTY_FALLBACK}` },
      },
      {
        name: 'metaDescription',
        type: 'textarea',
        label: 'Opis',
        maxLength: 160,
        admin: { description: `Do ok. 155 znaków. ${EMPTY_FALLBACK}` },
      },
    ],
  },
]

const faqField = (description: string): Field => ({
  name: 'faq',
  type: 'array',
  label: 'Pytania i odpowiedzi',
  labels: { singular: 'Pytanie', plural: 'Pytania' },
  admin: {
    description: `${description} Te same zdania trafiają do danych FAQPage dla Google. Pusta lista = dotychczasowe pytania.`,
  },
  fields: [
    { name: 'question', type: 'text', label: 'Pytanie', required: true },
    { name: 'answer', type: 'textarea', label: 'Odpowiedź', required: true },
    {
      type: 'row',
      fields: [
        {
          name: 'previewOnly',
          type: 'checkbox',
          label: 'Tylko na podglądzie (ukryte na pznowak.pl)',
          admin: { width: '40%', description: 'Np. pytanie, które czeka na decyzję Michała.' },
        },
        {
          name: 'previewNote',
          type: 'text',
          label: 'Do uzupełnienia (tylko podgląd)',
          admin: { width: '60%', description: 'Znacznik w nawiasach kwadratowych dopisany po odpowiedzi na podglądzie.' },
        },
      ],
    },
  ],
})

const tabs: Tab[] = [
  {
    name: 'home',
    label: 'Strona główna',
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Nagłówek H1',
        admin: { description: `Fragment w *gwiazdkach* to druga linia kursywą. ${EMPTY_FALLBACK}` },
      },
      introField(),
    ],
  },
  {
    name: 'catalog',
    label: 'Pierścionki',
    description: 'Strona /pierscionki (lista pierścionków).',
    fields: [
      titleField(),
      introField(),
      {
        name: 'priceNote',
        type: 'text',
        label: 'Zdanie przy cenie „od”',
        admin: { description: EMPTY_FALLBACK },
      },
      ...metaFields(),
    ],
  },
  {
    name: 'order',
    label: 'Na zamówienie',
    description: 'Strona /na-zamowienie.',
    fields: [
      titleField(),
      introField(),
      {
        name: 'priceNote',
        type: 'text',
        label: 'Zdanie przy cenie „od”',
        admin: { description: EMPTY_FALLBACK },
      },
      faqField('Sekcja „Pytania o pracę na zamówienie”.'),
      ...metaFields(),
    ],
  },
  {
    name: 'bands',
    label: 'Obrączki',
    description: 'Strona /obraczki.',
    fields: [
      titleField(),
      introField(),
      {
        type: 'row',
        fields: [
          {
            name: 'price',
            type: 'text',
            label: 'Cena na przywieszce',
            admin: { width: '40%', description: `Np. „od 3500 zł za parę”. ${EMPTY_FALLBACK}` },
          },
          {
            name: 'priceNote',
            type: 'text',
            label: 'Zdanie przy cenie',
            admin: { width: '60%', description: EMPTY_FALLBACK },
          },
        ],
      },
      faqField('Sekcja „Pytania o obrączki”.'),
      ...metaFields(),
    ],
  },
  {
    name: 'guides',
    label: 'Poradniki (lista)',
    description: 'Strona /poradniki. Same poradniki edytujesz w Strona → Poradniki.',
    fields: [titleField(), introField(), ...metaFields()],
  },
  {
    name: 'about',
    label: 'Pracownia',
    description: 'Strona /pracownia: nagłówek i wstęp nad historią rodziny.',
    fields: [titleField(), introField()],
  },
  {
    name: 'announcement',
    label: 'Pasek z komunikatem',
    description:
      'Wąski pasek nad menu na każdej stronie, np. „Zamówienia na święta przyjmujemy do 10 grudnia”. Pusty tekst = paska nie ma.',
    fields: [
      { name: 'text', type: 'text', label: 'Tekst komunikatu' },
      {
        type: 'row',
        fields: [
          {
            name: 'linkUrl',
            type: 'text',
            label: 'Link (opcjonalnie)',
            admin: { width: '50%', description: 'Np. /na-zamowienie albo /kontakt?temat=nowy.' },
          },
          {
            name: 'linkLabel',
            type: 'text',
            label: 'Tekst linku',
            admin: { width: '50%', description: 'Np. „Umów rozmowę”. Puste = „Szczegóły”.' },
          },
        ],
      },
      {
        name: 'until',
        type: 'text',
        label: 'Pokazuj do dnia (włącznie)',
        admin: { description: 'RRRR-MM-DD, np. 2026-12-10. Po tym dniu pasek znika sam. Puste = do odwołania.' },
        validate: (value: unknown) =>
          value === null || value === undefined || value === '' || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))
            ? true
            : 'Data w zapisie RRRR-MM-DD.',
      },
    ],
  },
]

/**
 * Teksty stron edytowane w panelu: nagłówki, wstępy, zdania przy cenach, pytania i opisy dla Google wybranych stron
 * oraz pasek z komunikatem. Wartości domyślne (i stan sprzed przeniesienia) są w src/content/page-texts.ts.
 * Wersje robocze jak przy pierścionkach: „Zapisz szkic” niczego nie zmienia na stronie, dopiero „Opublikuj”.
 * Konto z kluczem API (Redaktor) zapisuje wyłącznie szkice.
 */
export const SiteContent: GlobalConfig = {
  slug: 'site-content',
  dbName: 'cms_site_content',
  label: 'Teksty stron',
  admin: {
    group: 'Strona',
    description: 'Nagłówki, wstępy, pytania i opisy dla Google wybranych stron oraz pasek z komunikatem.',
  },
  access: {
    read: () => true,
    update: isAdminOrEditor,
    readVersions: isAdminOrEditor,
  },
  versions: {
    drafts: true,
    max: 30,
  },
  hooks: {
    beforeOperation: [apiKeyDraftOnlyGlobalBeforeOperation],
    beforeChange: [apiKeyDraftOnlyGlobalBeforeChange],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        revalidateAfterChange('site-content', doc, previousDoc, req)
        return doc
      },
    ],
  },
  fields: [{ type: 'tabs', tabs }],
}
