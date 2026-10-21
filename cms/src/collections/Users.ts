import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminField } from '../access/permissions'

export const Users: CollectionConfig = {
  slug: 'users',
  dbName: 'cms_users',
  labels: {
    singular: 'Użytkownik',
    plural: 'Użytkownicy',
  },
  admin: {
    useAsTitle: 'email',
    group: 'Administracja',
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: 2 * 60 * 60,
    useAPIKey: true,
  },
  access: {
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Imię',
      required: true,
    },
    {
      name: 'roles',
      type: 'select',
      label: 'Role',
      hasMany: true,
      required: true,
      defaultValue: ['admin'],
      saveToJWT: true,
      options: [
        { label: 'Administrator', value: 'admin' },
        { label: 'Redaktor', value: 'editor' },
      ],
      access: {
        create: isAdminField,
        update: isAdminField,
      },
    },
  ],
}
