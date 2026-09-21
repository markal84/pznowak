import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Products } from './collections/Products'
import { GalleryItems } from './collections/GalleryItems'
import { SiteContent } from './globals/SiteContent'
import { resolveCmsEnvironment } from './lib/environment'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const environment = resolveCmsEnvironment({
  blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN,
  databaseUrl: process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV,
  payloadSecret: process.env.PAYLOAD_SECRET,
})

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Products, Media, GalleryItems, Users],
  globals: [SiteContent],
  editor: lexicalEditor(),
  secret: environment.payloadSecret,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: environment.databaseUrl,
    },
    push: false,
  }),
  sharp,
  plugins: [
    vercelBlobStorage({
      access: 'public',
      addRandomSuffix: true,
      clientUploads: true,
      collections: {
        media: {
          disablePayloadAccessControl: true,
          prefix: 'cms/media',
        },
      },
      token: environment.blobReadWriteToken,
    }),
  ],
})
