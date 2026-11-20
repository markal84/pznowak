import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { s3Storage } from '@payloadcms/storage-s3'
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
import { Works } from './collections/Works'
import { Submissions } from './collections/Submissions'
import { Guides } from './collections/Guides'
import { SiteContent } from './globals/SiteContent'
import { emailAdapterFromEnv } from './lib/email'
import { mediaStorageKind, r2FileUrl, r2SettingsFromEnv } from './lib/media-storage'
import { resolveCmsEnvironment } from './lib/environment'
import { productPath, productSeoDescription, productSeoTitle } from './lib/product-seo'
import { firstProductImageId } from './lib/product-seo-admin'
import { absoluteUrl } from './lib/seo'

import { isStagingEnvironment, STAGING_MEDIA_PREFIX } from './lib/staging-media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const mediaStorage = mediaStorageKind()
const environment = resolveCmsEnvironment({
  blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN,
  databaseUrl: process.env.DATABASE_URL,
  mediaStorage,
  nodeEnv: process.env.NODE_ENV,
  payloadSecret: process.env.PAYLOAD_SECRET,
})
const mediaPrefix = isStagingEnvironment() ? STAGING_MEDIA_PREFIX : 'cms/media'

/** Magazyn plików katalogu wybierany zmienną MEDIA_STORAGE (src/lib/media-storage.ts). */
function mediaStoragePlugin() {
  if (mediaStorage === 'r2') {
    const r2 = r2SettingsFromEnv()
    return s3Storage({
      bucket: r2.bucket,
      clientUploads: r2.clientUploads,
      collections: {
        media: {
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename, prefix }) => r2FileUrl(r2.publicUrl, prefix, filename),
          prefix: mediaPrefix,
        },
      },
      config: {
        credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
        endpoint: r2.endpoint,
        forcePathStyle: true,
        region: 'auto',
      },
    })
  }
  return vercelBlobStorage({
    access: 'public',
    addRandomSuffix: true,
    clientUploads: true,
    collections: {
      media: {
        disablePayloadAccessControl: true,
        prefix: mediaPrefix,
      },
    },
    token: environment.blobReadWriteToken,
  })
}

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
  collections: [Products, Media, GalleryItems, Works, Guides, Submissions, Users],
  globals: [SiteContent],
  editor: lexicalEditor(),
  // Powiadomienia o zgłoszeniach: SMTP skrzynki pracowni ze zmiennych `SMTP_*` (src/lib/email.ts); bez nich „console”.
  email: emailAdapterFromEnv(),
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
    mediaStoragePlugin(),
  ],
})
