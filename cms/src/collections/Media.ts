import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor } from '../access/permissions'

import { assertStagingOwnsMedia, isStagingEnvironment, STAGING_MEDIA_PREFIX } from '../lib/staging-media'

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
  hooks: {
    beforeChange: [({ data, originalDoc, operation }) => {
      if (operation === 'update') assertStagingOwnsMedia(originalDoc)
      if (isStagingEnvironment()) {
        if (data.prefix && data.prefix !== STAGING_MEDIA_PREFIX) {
          throw new Error('Staging uploads must use cms/media-staging.')
        }
        data.prefix = STAGING_MEDIA_PREFIX
      }
      return data
    }],
    beforeDelete: [async ({ id, req }) => {
      const doc = await req.payload.findByID({ collection: 'media', id, depth: 0, req })
      assertStagingOwnsMedia(doc)
    }],
  },
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
