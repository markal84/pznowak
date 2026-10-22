import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import path from 'path'
import { buildConfig } from 'payload'
import { pl } from 'payload/i18n/pl'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Products } from './collections/Products'
import { GalleryItems } from './collections/GalleryItems'
import { Submissions } from './collections/Submissions'
import { SiteContent } from './globals/SiteContent'
import { resolveCmsEnvironment } from './lib/environment'
import { productPath, productSeoDescription, productSeoTitle } from './lib/product-seo'
import { firstProductImageId } from './lib/product-seo-admin'
import { absoluteUrl } from './lib/seo'

import { isStagingEnvironment, STAGING_MEDIA_PREFIX } from './lib/staging-media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const environment = resolveCmsEnvironment({
  blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN,
  databaseUrl: process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV,
  payloadSecret: process.env.PAYLOAD_SECRET,
})

export default buildConfig({
  i18n: {
    fallbackLanguage: 'pl',
    supportedLanguages: { pl },
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Products, Media, GalleryItems, Submissions, Users],
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
    // Pola SEO pierścionków (tytuł, opis, obraz do udostępnień). Przyciski „Wygeneruj” w panelu i strona pierścionka
    // używają tych samych funkcji (src/lib/product-seo.ts), więc puste pola nigdy nie dają pustego tytułu.
    seoPlugin({
      collections: ['products'],
      uploadsCollection: 'media',
      tabbedUI: true,
      generateTitle: ({ doc }) => productSeoTitle(doc),
      generateDescription: ({ doc }) => productSeoDescription(doc),
      generateImage: ({ doc, req }) => firstProductImageId(doc, req),
      generateURL: ({ doc }) => absoluteUrl(productPath(doc.slug ?? '')),
    }),
    vercelBlobStorage({
      access: 'public',
      addRandomSuffix: true,
      clientUploads: true,
      collections: {
        media: {
          disablePayloadAccessControl: true,
          prefix: isStagingEnvironment() ? STAGING_MEDIA_PREFIX : 'cms/media',
        },
      },
      token: environment.blobReadWriteToken,
    }),
  ],
})
