import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'
import { isIndexable } from './src/lib/indexing'
import { legacyRedirectRules } from './src/lib/legacy-redirects'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Przełącznik zdjęć w formularzu kontaktowym (Zlecenie B): ta sama zmienna dla serwera i przeglądarki.
  env: {
    ATTACHMENTS_ENABLED: process.env.ATTACHMENTS_ENABLED ?? '',
  },
  experimental: {
    globalNotFound: true,
  },
  // Dekoder HEIC (libheif w WebAssembly) ładowany przez Node, nie pakowany przez webpack.
  serverExternalPackages: ['heic-decode', 'libheif-js'],
  // The local verification tab uses 127.0.0.1 while Next.js advertises localhost.
  // Allow the dev client/HMR resources from that loopback origin as well.
  allowedDevOrigins: ['127.0.0.1'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
      { pathname: '/*.png' },
      { pathname: '/*.webp' },
      { pathname: '/grafiki/**' },
    ],
  },
  // Wbudowane przekierowanie skośnika (`/x/` → `/x`) działałoby przed poniższymi i robiło łańcuch dla starych
  // adresów ze skośnikiem (`/katalog/aria/`). Wyłączone; zastępuje je ostatnia reguła w `redirects()`.
  skipTrailingSlashRedirect: true,
  // Adresy ze starej strony (src/lib/legacy-redirects.ts, tabela docs/seo/przekierowania.md): jeden skok, 308.
  async redirects() {
    return [
      ...legacyRedirectRules(),
      { source: '/:path+/', destination: '/:path+', permanent: true },
    ]
  },
  // Wersje podglądowe nie mogą być indeksowane (SITE_ENV=production albo VERCEL_ENV=production włącza indeksowanie).
  async headers() {
    if (isIndexable()) return []
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }]
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
