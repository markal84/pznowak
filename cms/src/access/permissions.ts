import type { Access, FieldAccess } from 'payload'

type UserWithRoles = {
  roles?: Array<'admin' | 'editor'> | null
}

const hasRole = (user: unknown, role: 'admin' | 'editor') =>
  Boolean((user as UserWithRoles | null)?.roles?.includes(role))

export const isAuthenticated: Access = ({ req: { user } }) => Boolean(user)

export const isAdmin: Access = ({ req: { user } }) => hasRole(user, 'admin')

export const isAdminField: FieldAccess = ({ req: { user } }) => hasRole(user, 'admin')

export const isAdminOrEditor: Access = ({ req: { user } }) =>
  hasRole(user, 'admin') || hasRole(user, 'editor')

export const isAuthenticatedOrPublished: Access = ({ req: { user } }) => {
  if (user) return true

  return {
    _status: {
      equals: 'published',
    },
  }
}
