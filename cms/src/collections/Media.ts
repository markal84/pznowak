import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor } from '../access/permissions'

export const Media: CollectionConfig = {
  slug: 'media',
  dbName: 'cms_media',
  labels: {
    singular: 'Plik',
    plural: 'Media',
  },
  admin: {
    group: 'Katalog',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'mimeType', 'alt', 'updatedAt'],
  },
  access: {
    create: isAdminOrEditor,
    read: () => true,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  trash: true,
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Opis alternatywny',
      required: true,
    },
    {
      name: 'legacySourceUrl',
      type: 'text',
      label: 'Pierwotny adres pliku',
      admin: {
        description: 'Pole techniczne używane podczas importu starego katalogu.',
      },
    },
  ],
  upload: {
    mimeTypes: ['image/*', 'video/*'],
  },
}
