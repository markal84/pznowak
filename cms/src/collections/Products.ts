import { slugField, type CollectionConfig } from 'payload'

import {
  isAdmin,
  isAdminOrEditor,
  isAdminOrEditorField,
  isAuthenticatedOrPublished,
} from '../access/permissions'
import { revalidateAfterChange, revalidateAfterDelete } from '../lib/frontend-publication'
import { applyArchiveStatus, validateProductMedia } from '../lib/product-workflow'
import { shiftOtherProducts } from '../lib/sort-order'
import { SWATCHES } from '../lib/stone-variants'

export const Products: CollectionConfig = {
  slug: 'products',
  dbName: 'cms_products',
  labels: {
    singular: 'Pierścionek',
    plural: 'Pierścionki',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'price', '_status', 'archived', 'sortOrder', 'updatedAt'],
    group: 'Katalog',
    listSearchableFields: ['name', 'slug', 'metal', 'stone'],
    description: 'Pierścionki widoczne w katalogu strony.',
  },
  access: {
    create: isAdminOrEditor,
    read: isAuthenticatedOrPublished,
    update: isAdminOrEditor,
    delete: isAdmin,
    readVersions: isAdminOrEditor,
  },
  defaultSort: 'sortOrder',
  trash: true,
  versions: {
    drafts: true,
    maxPerDoc: 30,
  },
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        await shiftOtherProducts({ doc, previousDoc, req })
        revalidateAfterChange('product', doc, previousDoc, req)
        return doc
      },
    ],
    afterDelete: [({ doc, req }) => revalidateAfterDelete('product', doc, req)],
    beforeChange: [({ data }) => applyArchiveStatus(data)],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Podstawowe informacje',
          fields: [
            {
              name: 'name',
              type: 'text',
              label: 'Nazwa',
              required: true,
              index: true,
            },
            slugField({
              useAsSlug: 'name',
              required: true,
            }),
            {
              name: 'lead',
              type: 'textarea',
              label: 'Krótki opis',
            },
            {
              name: 'description',
              type: 'textarea',
              label: 'Pełny opis',
            },
            {
              name: 'price',
              type: 'number',
              label: 'Cena (zł)',
              min: 0,
              admin: {
                step: 1,
                description:
                  'Cena pierścionka z kamieniem ze zdjęć, w pełnych złotych (np. 2949). Na stronie: „od 2949 zł” na przywieszce na liście i pod nazwą na karcie. Puste = „Na zapytanie” na karcie, a na liście bez ceny.',
              },
            },
          ],
        },
        {
          label: 'Materiały',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'metal',
                  type: 'text',
                  label: 'Metal',
                  admin: { width: '50%' },
                },
                {
                  name: 'stone',
                  type: 'text',
                  label: 'Kamień',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'carats',
                  type: 'text',
                  label: 'Masa / karaty',
                  admin: { width: '50%' },
                },
                {
                  name: 'clarity',
                  type: 'text',
                  label: 'Czystość',
                  admin: { width: '50%' },
                },
              ],
            },
          ],
        },
        {
          label: 'Zdjęcia i filmy',
          fields: [
            {
              name: 'media',
              type: 'array',
              label: 'Media produktu',
              labels: {
                singular: 'Plik',
                plural: 'Pliki',
              },
              admin: {
                description: 'Pierwsze zdjęcie główne jest używane na liście produktów.',
                initCollapsed: true,
              },
              validate: validateProductMedia,
              fields: [
                {
                  name: 'asset',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Plik',
                  required: true,
                },
                {
                  name: 'isPrimary',
                  type: 'checkbox',
                  label: 'Zdjęcie główne',
                  defaultValue: false,
                },
                {
                  name: 'alt',
                  type: 'text',
                  label: 'Opis alternatywny',
                },
              ],
            },
          ],
        },
        {
          label: 'Inne kamienie',
          description:
            'Sekcja „Zamów z innym kamieniem” na karcie: kółka kolorów pod galerią. Pierwsze kółko to zawsze oryginał z zakładki „Materiały”. Wariant to propozycja do rozmowy, bez ceny; dostępność kamienia potwierdza pracownia.',
          fields: [
            {
              name: 'stoneVariants',
              type: 'array',
              label: 'Warianty kamienia',
              labels: {
                singular: 'Wariant',
                plural: 'Warianty',
              },
              admin: {
                initCollapsed: true,
                components: {
                  RowLabel: '/components/admin/StoneVariantRowLabel#StoneVariantRowLabel',
                },
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'stone',
                      type: 'text',
                      label: 'Kamień',
                      required: true,
                      admin: {
                        width: '60%',
                        placeholder: 'np. Szmaragd i diamenty',
                        description: 'Tak jak w parametrach karty. Z nazwy powstaje adres ?kamien=…',
                      },
                    },
                    {
                      name: 'swatch',
                      type: 'select',
                      label: 'Kolor kółka',
                      required: true,
                      options: SWATCHES.map(({ id, label }) => ({ value: id, label })),
                      admin: { width: '40%' },
                    },
                  ],
                },
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Obraz',
                  required: true,
                  admin: {
                    description:
                      'Zastępuje pierwsze zdjęcie z „Zdjęcia i filmy”. Najlepiej ten sam kadr i proporcje; cały pierścionek w kadrze.',
                  },
                },
                {
                  name: 'moreImages',
                  type: 'upload',
                  relationTo: 'media',
                  hasMany: true,
                  label: 'Kolejne obrazy',
                  admin: {
                    description:
                      'Ten sam kamień na 2., 3. … zdjęciu z „Zdjęcia i filmy”, w tej samej kolejności. Po wyborze kamienia galeria pokazuje tylko obrazy wariantu (film: pole „Film” wariantu, a bez niego film oryginału). Puste = jeden obraz.',
                  },
                },
                {
                  name: 'video',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Film',
                  filterOptions: { mimeType: { contains: 'video/' } },
                  admin: {
                    description:
                      'Prawdziwy film wykonanego pierścionka z tym kamieniem (np. z karty, która została połączona z fasonem). Po wyborze kamienia galeria pokazuje ten film zamiast filmu oryginału. Puste = film oryginału.',
                  },
                },
                {
                  name: 'alt',
                  type: 'text',
                  label: 'Opis alternatywny',
                },
                {
                  name: 'isVisualization',
                  type: 'checkbox',
                  label: 'Wizualizacja',
                  defaultValue: true,
                  admin: {
                    description:
                      'Na obrazie pojawia się etykieta „Wizualizacja”. Odznacz tylko przy prawdziwym zdjęciu wykonanego pierścionka.',
                  },
                },
              ],
            },
          ],
        },
        {
          label: 'Dane techniczne',
          fields: [
            {
              name: 'legacy',
              type: 'group',
              label: 'Dane ze starego katalogu',
              fields: [
                {
                  name: 'wordpressId',
                  type: 'number',
                  label: 'ID WordPress',
                  unique: true,
                  index: true,
                },
                {
                  name: 'sourcePayload',
                  type: 'json',
                  label: 'Oryginalne dane importu',
                  // Pełny zapis ze starego katalogu to dane robocze: ukryte przed niezalogowanymi.
                  // `wordpressId` zostaje publiczne (endpoint /products bierze je jako `id`).
                  access: {
                    read: isAdminOrEditorField,
                  },
                },
              ],
            },
            {
              name: 'source',
              type: 'group',
              label: 'Import z Facebooka / Instagrama',
              // Dane robocze importu (klucz karty, notatki z przeglądu, posty) tylko dla zalogowanych w panelu:
              // publiczne REST/GraphQL nie zwraca tej grupy i nie pozwala po niej filtrować.
              // Skrypt importu czyta ją przez Local API z overrideAccess: true.
              access: {
                read: isAdminOrEditorField,
              },
              admin: {
                description:
                  'Wypełnia skrypt importu (cms/scripts/import-fb-catalog.ts). Opis i dane z posta to szkic do zatwierdzenia przed publikacją.',
              },
              fields: [
                {
                  name: 'facebookKey',
                  type: 'text',
                  label: 'Klucz karty z przeglądu',
                  unique: true,
                  index: true,
                  admin: { readOnly: true },
                },
                {
                  name: 'facebookPayload',
                  type: 'json',
                  label: 'Dane z przeglądu i posty źródłowe',
                  admin: { readOnly: true },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'archived',
      type: 'checkbox',
      label: 'Archiwalny',
      defaultValue: false,
      index: true,
      admin: {
        description: 'Archiwizacja automatycznie wycofuje produkt z publikacji.',
        position: 'sidebar',
      },
    },
    {
      name: 'featuredOnHome',
      type: 'checkbox',
      label: 'Na stronie głównej',
      defaultValue: false,
      index: true,
      admin: {
        description:
          'Pokazuje pierścionek w sekcji „Wybrane pierścionki” na stronie głównej (mieszczą się 4; pierścionek z nagłówka strony się tam nie powtarza). Bez zaznaczeń strona użyje listy domyślnej.',
        position: 'sidebar',
      },
    },
    {
      name: 'homeOrder',
      type: 'number',
      label: 'Kolejność na stronie głównej',
      defaultValue: 0,
      admin: {
        condition: (data) => Boolean(data?.featuredOnHome),
        description: 'Mniejsza liczba = wcześniej. Przy takiej samej liczbie decyduje kolejność w katalogu.',
        position: 'sidebar',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      label: 'Kolejność',
      defaultValue: 0,
      index: true,
      admin: {
        description:
          'Mniejsza liczba = wcześniej. Po wpisaniu liczby, która już jest zajęta, pierścionek wskakuje na to miejsce, a kolejne przesuwają się o 1 w dół listy (po zapisie).',
        position: 'sidebar',
      },
    },
  ],
}
