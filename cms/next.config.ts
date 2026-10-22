import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

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
  // Adresy ze starego frontu przekierowują na nowy układ strony.
  async redirects() {
    return [
      { source: '/katalog', destination: '/pierscionki', permanent: true },
      { source: '/katalog/:slug', destination: '/pierscionki/:slug', permanent: true },
      { source: '/galeria', destination: '/realizacje', permanent: true },
      { source: '/o-nas', destination: '/pracownia', permanent: true },
    ]
  },
  // Wersje podglądowe nie mogą być indeksowane (produkcja Vercela jest jedyną indeksowaną).
  async headers() {
    if (process.env.VERCEL_ENV === 'production') return []
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
