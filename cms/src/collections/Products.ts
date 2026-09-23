import { slugField, type CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor, isAuthenticatedOrPublished } from '../access/permissions'
import { revalidateAfterChange, revalidateAfterDelete } from '../lib/frontend-publication'
import { applyArchiveStatus, validateProductMedia } from '../lib/product-workflow'

export const Products: CollectionConfig = {
  slug: 'products',
  dbName: 'cms_products',
  labels: {
    singular: 'Pierścionek',
    plural: 'Pierścionki',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', '_status', 'archived', 'sortOrder', 'updatedAt'],
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
      name: 'sortOrder',
      type: 'number',
      label: 'Kolejność',
      defaultValue: 0,
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
