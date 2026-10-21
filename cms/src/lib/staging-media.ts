export const STAGING_MEDIA_PREFIX = 'cms/media-staging'

export function isStagingEnvironment(): boolean {
  return process.env.NEON_BRANCH === 'staging' || process.env.VERCEL_ENV === 'preview'
}

export function assertStagingOwnsMedia(doc: { prefix?: string | null }): void {
  if (isStagingEnvironment() && doc.prefix !== STAGING_MEDIA_PREFIX) {
    throw new Error('Staging cannot modify or delete media outside cms/media-staging.')
  }
}
