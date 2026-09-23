import type { GlobalConfig } from 'payload'

import { isAdminOrEditor } from '../access/permissions'
import { revalidateAfterChange } from '../lib/frontend-publication'

export const SiteContent: GlobalConfig = {
  slug: 'site-content',
  dbName: 'cms_site_content',
  label: 'Treść strony',
  admin: {
    group: 'Strona',
    description: 'Najważniejsze teksty i dane kontaktowe wspólne dla strony.',
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
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        revalidateAfterChange('site-content', doc, previousDoc, req)
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Strona główna',
          fields: [
            {
              name: 'homeHeading',
              type: 'text',
              label: 'Nagłówek',
            },
            {
              name: 'homeLead',
              type: 'textarea',
              label: 'Wprowadzenie',
            },
          ],
        },
        {
          label: 'Pracownia',
          fields: [
            {
              name: 'aboutHeading',
              type: 'text',
              label: 'Nagłówek',
            },
            {
              name: 'aboutText',
              type: 'textarea',
              label: 'Opis pracowni',
            },
          ],
        },
        {
          label: 'Kontakt',
          fields: [
            {
              name: 'phone',
              type: 'text',
              label: 'Telefon',
            },
            {
              name: 'email',
              type: 'email',
              label: 'E-mail',
            },
            {
              name: 'address',
              type: 'textarea',
              label: 'Adres',
            },
            {
              name: 'openingHours',
              type: 'textarea',
              label: 'Godziny otwarcia',
            },
          ],
        },
      ],
    },
  ],
}
