import type { CollectionConfig } from 'payload'

import {
  isAdmin,
  isAdminOrEditor,
  isAuthenticatedOrPublished,
} from '../access/permissions'

export const GalleryItems: CollectionConfig = {
  slug: 'gallery-items',
  dbName: 'cms_gallery_items',
  labels: {
    singular: 'Zdjęcie galerii',
    plural: 'Galeria',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'position', '_status', 'updatedAt'],
    group: 'Katalog',
    description: 'Zdjęcia pokazywane na stronie galerii.',
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
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Nazwa',
      required: true,
    },
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
      label: 'Opis alternatywny',
      required: true,
    },
    {
      name: 'position',
      type: 'number',
      label: 'Kolejność',
      defaultValue: 0,
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'wordpressId',
      type: 'number',
      label: 'ID WordPress',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
