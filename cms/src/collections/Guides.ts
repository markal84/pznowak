import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor, isAuthenticatedOrPublished } from '../access/permissions'
import { GUIDE_LAYOUT_BLOCKS } from '../blocks/guide-blocks'
import { apiKeyDraftOnlyBeforeChange, apiKeyDraftOnlyBeforeOperation } from '../lib/api-key-draft-only'
import { revalidateAfterChange, revalidateAfterDelete } from '../lib/frontend-publication'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const validDate = (value: unknown) => {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return 'Data w zapisie RRRR-MM-DD, np. 2026-11-15.'
  return Number.isNaN(Date.parse(`${value}T12:00:00Z`)) ? 'Nie ma takiej daty.' : true
}

/**
 * Poradniki pracowni (/poradniki/<adres>). Lista, kafelki, mapa strony i dane strukturalne (Article, FAQPage,
 * BreadcrumbList, ItemList) biorą się z opublikowanych wpisów. Szkic nie zmienia strony, dopóki ktoś nie kliknie
 * „Opublikuj”; konto z kluczem API zapisuje wyłącznie szkice.
 */
export const Guides: CollectionConfig = {
  slug: 'guides',
  dbName: 'cms_guides',
  labels: { singular: 'Poradnik', plural: 'Poradniki' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updated', '_status', 'order'],
    group: 'Strona',
    description: 'Poradniki w menu „Poradniki”. Kolejność na liście i w kafelkach według pola „Kolejność”.',
    listSearchableFields: ['title', 'slug'],
  },
  access: {
    create: isAdminOrEditor,
    read: isAuthenticatedOrPublished,
    update: isAdminOrEditor,
    delete: isAdmin,
    readVersions: isAdminOrEditor,
  },
  defaultSort: 'order',
  versions: {
    drafts: true,
    maxPerDoc: 30,
  },
  hooks: {
    afterChange: [
      ({ doc, previousDoc, req }) => {
        revalidateAfterChange('guide', doc, previousDoc, req)
        return doc
      },
    ],
    afterDelete: [({ doc, req }) => revalidateAfterDelete('guide', doc, req)],
    beforeOperation: [apiKeyDraftOnlyBeforeOperation],
    beforeChange: [apiKeyDraftOnlyBeforeChange],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Treść',
          fields: [
            {
              name: 'title',
              type: 'text',
              label: 'Tytuł (nagłówek H1)',
              required: true,
              admin: { description: 'Także tytuł strony w Google, chyba że w zakładce SEO jest inny.' },
            },
            {
              name: 'lead',
              type: 'textarea',
              label: 'Wstęp pod tytułem',
              required: true,
              admin: { description: 'Jedno, dwa zdania z odpowiedzią na pytanie z tytułu.' },
            },
            {
              name: 'layout',
              type: 'blocks',
              label: 'Sekcje',
              labels: { singular: 'Sekcja', plural: 'Sekcje' },
              blocks: GUIDE_LAYOUT_BLOCKS,
              admin: {
                description:
                  'Każda sekcja to nagłówek H2 i pozycja w spisie treści. Sekcję „Częste pytania” strona dodaje sama na końcu z zakładki „Pytania”.',
              },
            },
          ],
        },
        {
          label: 'Pytania',
          description:
            'Sekcja „Częste pytania” na końcu poradnika i dane strukturalne FAQPage dla Google (te same zdania). Bez pytań sekcji nie ma.',
          fields: [
            {
              name: 'faq',
              type: 'array',
              label: 'Częste pytania',
              labels: { singular: 'Pytanie', plural: 'Pytania' },
              fields: [
                { name: 'question', type: 'text', label: 'Pytanie', required: true },
                { name: 'answer', type: 'textarea', label: 'Odpowiedź', required: true },
              ],
            },
          ],
        },
        {
          label: 'Kafelek i SEO',
          fields: [
            {
              name: 'slug',
              type: 'text',
              label: 'Adres',
              required: true,
              unique: true,
              index: true,
              admin: {
                description:
                  'Część adresu po /poradniki/, np. „jak-sprawdzic-rozmiar-pierscionka”. Nie zmieniaj w opublikowanym poradniku: stary adres przestanie działać.',
              },
              validate: (value: unknown) =>
                typeof value === 'string' && SLUG_PATTERN.test(value)
                  ? true
                  : 'Małe litery bez polskich znaków, cyfry i myślniki.',
            },
            {
              name: 'short',
              type: 'text',
              label: 'Krótka nazwa',
              required: true,
              admin: { description: 'Na kafelku, w ścieżce nad tytułem i w danych BreadcrumbList.' },
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Opis (Google i kafelek)',
              required: true,
              maxLength: 160,
              admin: { description: 'Do ok. 155 znaków.' },
            },
            {
              name: 'metaTitle',
              type: 'text',
              label: 'Tytuł w Google (gdy inny niż H1)',
              admin: { description: 'Puste = tytuł poradnika. Strona sama dopisuje nazwę pracowni.' },
            },
            {
              name: 'topic',
              type: 'text',
              label: 'Temat (etykieta nad tytułem kafelka)',
              required: true,
              admin: { description: 'Jedno słowo, np. „Rozmiar”, „Kamienie”, „Cena”.' },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'published',
                  type: 'text',
                  label: 'Data publikacji',
                  required: true,
                  validate: validDate,
                  admin: { width: '33%', description: 'RRRR-MM-DD' },
                },
                {
                  name: 'updated',
                  type: 'text',
                  label: 'Data aktualizacji',
                  required: true,
                  validate: validDate,
                  admin: {
                    width: '33%',
                    description: 'RRRR-MM-DD. Zmieniaj tylko przy merytorycznej zmianie treści (mapa strony, Google).',
                  },
                },
                {
                  name: 'minutes',
                  type: 'number',
                  label: 'Czas czytania (min)',
                  required: true,
                  min: 1,
                  admin: { width: '33%', step: 1 },
                },
              ],
            },
            {
              name: 'order',
              type: 'number',
              label: 'Kolejność',
              required: true,
              defaultValue: 10,
              admin: { step: 1, description: 'Mniejsza liczba = wyżej na liście poradników i w kafelkach.' },
            },
          ],
        },
      ],
    },
  ],
}
