import { describe, expect, it } from 'vitest'

import {
  buildImportPlan,
  cleanPostText,
  draftDescription,
  draftLead,
  extractDetails,
  mediaSourceKey,
  slugify,
  type ExistingProduct,
  type FbCatalogSelection,
} from '@/lib/fb-import'

const post = (text: string, date = '2025-01-01') => ({
  date,
  postId: '1',
  text,
  url: 'https://www.facebook.com/1',
})

const selection = (overrides: Partial<FbCatalogSelection> = {}): FbCatalogSelection => ({
  catalog: [
    {
      cover: 'media/111_2.jpg',
      key: 'morganit@111',
      name: 'Morganit z diamentami',
      photos: ['media/111_1.jpg', 'media/111_2.jpg'],
      posts: [post('Morganit o brzoskwiniowej barwie z diamentami 😍😍 w różowym złocie')],
      videos: ['media/111_v1.mp4', 'media/222_v2.mp4'],
    },
  ],
  galleryAdditions: [],
  generatedAt: '2026-10-26T12:00:00+00:00',
  selectionRev: 1,
  warnings: [],
  ...overrides,
})

const existing = (overrides: Partial<ExistingProduct> = {}): ExistingProduct => ({
  id: 7,
  media: [],
  name: 'Thalia',
  slug: 'thalia',
  sortOrder: 10,
  status: 'published',
  ...overrides,
})

describe('fb-import: tekst i dane z posta', () => {
  it('czyści emoji, hasztagi, telefon i powtórzoną interpunkcję', () => {
    expect(cleanPostText('Piękny ametyst 💜💎 #pierscionek\nZapraszam 📲501321347 ???')).toBe(
      'Piękny ametyst\nZapraszam?',
    )
  })

  it('rozpoznaje kamień, karaty, czystość, metal i certyfikat', () => {
    expect(
      extractDetails('Brylant w szlifie szmaragdowym 0,41 ct', [
        'Kamień z certyfikatem GIA. Brylant o masie 0,41 ct czystości VS2 i barwie F, w białym złocie',
      ]),
    ).toEqual({
      carats: '0,41 ct',
      certificate: 'GIA',
      clarity: 'VS2, barwa F',
      metal: 'Biały',
      stone: 'Diament',
    })
  })

  it('kamień z nazwy ma pierwszeństwo przed wzmiankami w poście', () => {
    const details = extractDetails('Niebieski diament 0,21 ct w stylu art déco', [
      'Pamiętacie ten model z szafirem? Biała oprawa wydobywa blask diamentów',
    ])
    expect(details.stone).toBe('Diament niebieski')
    expect(details.metal).toBe('Biały')
  })

  it('kamień kolorowy z diamentami w formacie starego katalogu', () => {
    expect(
      extractDetails('Oliwin w szlifie emerald', [
        'Po bokach diamenty, ciepły odcień żółtego złota',
      ]),
    ).toMatchObject({
      metal: 'Żółty',
      stone: 'Oliwin, Diament',
    })
  })

  it('opis od najstarszego posta, bez powtórzeń; krótki opis to pierwsze zdanie', () => {
    const posts = [
      post('Drugi post.', '2025-02-01'),
      post('Pierwszy post. Dalej 💎', '2025-01-01'),
      post('Drugi post.', '2025-03-01'),
    ]
    expect(draftDescription(posts)).toBe('Pierwszy post. Dalej\n\nDrugi post.')
    expect(draftLead(posts)).toBe('Pierwszy post.')
  })

  it('adres bez polskich znaków i klucz pliku z numerem posta', () => {
    expect(slugify('Różowy turmalin w oprawie „halo” – art déco')).toBe(
      'rozowy-turmalin-w-oprawie-halo-art-deco',
    )
    expect(mediaSourceKey('media/122_333.jpg')).toBe('fb:122/122_333.jpg')
  })
})

describe('fb-import: plan', () => {
  it('nowy pierścionek: okładka pierwsza, jeden film, reszta czeka na galerię filmów', () => {
    const plan = buildImportPlan(selection(), { mediaBySource: new Map(), products: [existing()] })
    const [product] = plan.products
    expect(product.action).toBe('create')
    expect(product.data.slug).toBe('morganit-z-diamentami')
    expect(product.data.sortOrder).toBe(11)
    expect(product.files.map((f) => [f.file, f.isPrimary])).toEqual([
      ['media/111_2.jpg', true],
      ['media/111_1.jpg', false],
      ['media/111_v1.mp4', false],
    ])
    expect(product.pendingVideos).toEqual(['media/222_v2.mp4'])
    expect(plan.summary).toMatchObject({ filesToUpload: 3, pendingVideos: 1, productsToCreate: 1 })
  })

  it('drugi import nic nie dubluje: produkt po kluczu, pliki po legacySourceUrl', () => {
    const plan = buildImportPlan(selection(), {
      mediaBySource: new Map([['fb:111/111_1.jpg', { id: 5 }]]),
      products: [
        existing({
          facebookKey: 'morganit@111',
          id: 9,
          name: 'Morganit z diamentami',
          slug: 'morganit-z-diamentami',
        }),
      ],
    })
    expect(plan.products[0].action).toBe('skip-existing')
    expect(plan.products[0].files.find((f) => f.file === 'media/111_1.jpg')?.existingMediaId).toBe(
      5,
    )
    expect(plan.summary).toMatchObject({
      filesToUpload: 0,
      productsExisting: 1,
      productsToCreate: 0,
    })
  })

  it('zajęty adres dostaje przyrostek i ostrzeżenie', () => {
    const plan = buildImportPlan(selection(), {
      mediaBySource: new Map(),
      products: [existing({ name: 'Inny', slug: 'morganit-z-diamentami' })],
    })
    expect(plan.products[0].data.slug).toBe('morganit-z-diamentami-2')
    expect(plan.products[0].warnings.join()).toContain('zajęty')
  })

  it('galeria: dopasowanie po nazwie, bez plików już dołączonych i bez drugiego filmu', () => {
    const plan = buildImportPlan(
      selection({
        catalog: [],
        galleryAdditions: [
          {
            key: 'thalia@1',
            photos: ['media/1_a.jpg', 'media/1_b.jpg'],
            posts: [],
            ring: 'Thalia',
            videos: ['media/1_v.mp4'],
          },
          { key: 'x@2', photos: ['media/2_a.jpg'], posts: [], ring: 'Nieznany', videos: [] },
        ],
      }),
      {
        mediaBySource: new Map(),
        products: [
          existing({
            media: [
              { asset: { id: 1, mimeType: 'image/jpeg', source: 'fb:1/1_b.jpg' } },
              { asset: { id: 2, mimeType: 'video/mp4' } },
            ],
          }),
        ],
      },
    )
    const [thalia, unknown] = plan.gallery
    expect(thalia.action).toBe('append')
    expect(thalia.files.map((f) => f.file)).toEqual(['media/1_a.jpg'])
    expect(thalia.pendingVideos).toEqual(['media/1_v.mp4'])
    expect(unknown.action).toBe('skip')
    expect(unknown.warnings[0]).toContain('nie znaleziono')
  })
})
