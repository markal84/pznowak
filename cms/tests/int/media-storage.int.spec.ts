import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { resolveCmsEnvironment } from '@/lib/environment'
import { mediaStorageKind, r2FileUrl, r2SettingsFromEnv } from '@/lib/media-storage'

const R2 = {
  R2_ENDPOINT: 'https://konto.r2.cloudflarestorage.com/',
  R2_BUCKET: 'pznowak-media',
  R2_ACCESS_KEY_ID: 'id',
  R2_SECRET_ACCESS_KEY: 'sekret',
  R2_PUBLIC_URL: 'https://media.pznowak.pl/',
}

describe('magazyn mediów (MEDIA_STORAGE)', () => {
  it('domyślnie Vercel Blob; r2 tylko po jawnym ustawieniu', () => {
    expect(mediaStorageKind({})).toBe('vercel-blob')
    expect(mediaStorageKind({ MEDIA_STORAGE: '' })).toBe('vercel-blob')
    expect(mediaStorageKind({ MEDIA_STORAGE: ' vercel-blob ' })).toBe('vercel-blob')
    expect(mediaStorageKind({ MEDIA_STORAGE: 'R2' })).toBe('r2')
    expect(() => mediaStorageKind({ MEDIA_STORAGE: 's3' })).toThrow('MEDIA_STORAGE')
  })

  it('r2 wymaga kompletu zmiennych i adresu publicznego bez ścieżki', () => {
    expect(r2SettingsFromEnv(R2)).toEqual({
      endpoint: 'https://konto.r2.cloudflarestorage.com',
      bucket: 'pznowak-media',
      accessKeyId: 'id',
      secretAccessKey: 'sekret',
      publicUrl: 'https://media.pznowak.pl',
      clientUploads: false,
    })
    expect(r2SettingsFromEnv({ ...R2, R2_CLIENT_UPLOADS: '1' }).clientUploads).toBe(true)
    for (const name of Object.keys(R2)) {
      expect(() => r2SettingsFromEnv({ ...R2, [name]: ' ' })).toThrow(name)
    }
    expect(() => r2SettingsFromEnv({ ...R2, R2_PUBLIC_URL: 'https://media.pznowak.pl/cms' })).toThrow('R2_PUBLIC_URL')
    expect(() => r2SettingsFromEnv({ ...R2, R2_PUBLIC_URL: 'http://media.pznowak.pl' })).toThrow('R2_PUBLIC_URL')
  })

  it('adres pliku w R2 ma ten sam klucz co w Vercel Blob', () => {
    expect(r2FileUrl('https://media.pznowak.pl', 'cms/media-staging', 'aria-1-AbC123.webp')).toBe(
      'https://media.pznowak.pl/cms/media-staging/aria-1-AbC123.webp',
    )
    expect(r2FileUrl('https://media.pznowak.pl/', '/cms/media/', 'zdjęcie 1.jpg')).toBe(
      'https://media.pznowak.pl/cms/media/zdj%C4%99cie%201.jpg',
    )
    expect(r2FileUrl('https://media.pznowak.pl', undefined, 'a.png')).toBe('https://media.pznowak.pl/a.png')
  })

  it('token Vercel Blob jest wymagany na produkcji tylko przy Vercel Blob', () => {
    const base = { databaseUrl: 'x', nodeEnv: 'production', payloadSecret: 'y' }
    expect(() => resolveCmsEnvironment(base)).toThrow('BLOB_READ_WRITE_TOKEN')
    expect(() => resolveCmsEnvironment({ ...base, mediaStorage: 'vercel-blob' })).toThrow('BLOB_READ_WRITE_TOKEN')
    expect(resolveCmsEnvironment({ ...base, mediaStorage: 'r2' }).blobReadWriteToken).toBe('')
  })

  it('importMap panelu ma komponenty wysyłania obu magazynów', () => {
    const importMap = readFileSync(path.resolve(__dirname, '../../src/app/(payload)/admin/importMap.js'), 'utf8')
    expect(importMap).toContain('"@payloadcms/storage-vercel-blob/client#VercelBlobClientUploadHandler"')
    expect(importMap).toContain('"@payloadcms/storage-s3/client#S3ClientUploadHandler"')
  })

  it('next.config.mjs zostawia hosta Vercel Blob i dodaje domenę R2', () => {
    const config = readFileSync(path.resolve(__dirname, '../../next.config.mjs'), 'utf8')
    expect(config).toContain("hostname: '*.public.blob.vercel-storage.com'")
    expect(config).toContain("'media.pznowak.pl'")
    expect(config).toContain('process.env.R2_PUBLIC_URL')
  })
})
