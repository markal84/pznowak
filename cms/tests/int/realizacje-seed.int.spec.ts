import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { SEED_WORKS } from '../../scripts/realizacje-data'
import { matchProduct, planPhotos, planTexts, type CatalogProduct } from '../../scripts/realizacje-logic'

const photosDir = path.join(process.cwd(), 'seed', 'realizacje')

describe('treść startowa „Realizacje”', () => {
  it('has the seven stories (six from the order plus the earrings), the first one featured and in table order', () => {
    expect(SEED_WORKS).toHaveLength(7)
    expect(SEED_WORKS.filter((w) => w.featured).map((w) => w.slug)).toEqual(['pierscionek-zareczynowy-wyspa'])
    expect(SEED_WORKS[0].slug).toBe('pierscionek-zareczynowy-wyspa')
    expect(new Set(SEED_WORKS.map((w) => w.slug)).size).toBe(SEED_WORKS.length)
    expect(SEED_WORKS.map((w) => w.kind)).toEqual(['zamowienie', 'zamowienie', 'zamowienie', 'zamowienie', 'zamowienie', 'przerobka', 'zamowienie'])
  })

  it('kolczyki mają dwa filmy z FB (proces i gotowy reel) i okładkę z klatki filmu', () => {
    const earrings = SEED_WORKS.find((w) => w.jewelryType === 'kolczyki')!
    expect(earrings.videos?.map((v) => v.file)).toEqual([
      '122188581944616875_2241603543342592.mp4',
      '122188660712616875_1524283909489310.mp4',
    ])
    expect(earrings.photos[0].file).toBe('7-kolczyki_01_gotowe-z-filmu.webp')
    // Żadne dwie klatki (zdjęcia i okładki filmów) nie są tym samym plikiem; film z procesu ma klatkę z procesu.
    const frames = [...earrings.photos.map((p) => p.file), ...earrings.videos!.map((v) => v.poster)]
    expect(frames.every(Boolean)).toBe(true)
    expect(new Set(frames).size).toBe(frames.length)
    expect(earrings.videos![0].poster).not.toBe(earrings.photos[0].file)
    for (const video of earrings.videos!) expect(video.caption.length).toBeGreaterThan(5)
  })

  it('uses every photo from cms/seed/realizacje exactly once, each with a concrete Polish alt', () => {
    const used = SEED_WORKS.flatMap((w) => [...w.photos.map((p) => p.file), ...(w.videos ?? []).flatMap((v) => (v.poster ? [v.poster] : []))])
    expect([...used].sort()).toEqual(readdirSync(photosDir).filter((f) => f.endsWith('.webp')).sort())
    for (const photo of SEED_WORKS.flatMap((w) => w.photos)) {
      expect(photo.alt.length, photo.file).toBeGreaterThan(20)
      expect(photo.alt, photo.file).not.toMatch(/\.webp|\[|zdjęcie\b$/i)
    }
  })

  it('does not invent a duration or other facts: only task and what we did, no brackets', () => {
    for (const work of SEED_WORKS) {
      expect(work.task.length, work.slug).toBeGreaterThan(10)
      expect(work.whatWeDid.length, work.slug).toBeGreaterThan(10)
      expect(`${work.task} ${work.whatWeDid}`, work.slug).not.toMatch(/\[|\d\s?(ct|zł)|tygod/i)
    }
  })
})

describe('seed: link do katalogu i poprawka zdjęć', () => {
  const published = (id: number, name: string, payload?: unknown, extra: Partial<CatalogProduct> = {}): CatalogProduct => ({
    id,
    name,
    status: 'published',
    archived: false,
    facebookPayload: payload,
    ...extra,
  })
  const bySlug = (slug: string) => SEED_WORKS.find((w) => w.slug === slug)!

  it('znajduje kartę po id posta z Facebooka, a nazwa jest tylko zapasem', () => {
    const eternity = bySlug('obraczka-eternity-na-wzor')
    const products = [
      published(1, 'Inna nazwa niż w zleceniu', { posts: [{ postId: '122171835092616875', url: 'https://www.facebook.com/122171835092616875' }] }),
      published(2, 'Obrączka eternity odtworzona dla klientki'),
    ]
    expect(matchProduct(products, eternity.product)).toMatchObject({ by: 'post', product: { id: 1 } })
    expect(matchProduct(products.slice(1), eternity.product)).toMatchObject({ by: 'nazwa', product: { id: 2 } })
  })

  it('dla morganitu bierze każdy z dwóch postów', () => {
    const morganite = bySlug('pierscionek-z-morganitem')
    expect(matchProduct([published(5, 'Morganit X', { posts: [{ postId: '122195486114616875' }] })], morganite.product)?.product.id).toBe(5)
    expect(matchProduct([published(6, 'Morganit Y', { posts: [{ postId: '122194033982616875' }] })], morganite.product)?.product.id).toBe(6)
  })

  it('pomija karty nieopublikowane i zarchiwizowane, a bez wymaganej karty daje null', () => {
    const eternity = bySlug('obraczka-eternity-na-wzor')
    const payload = { posts: [{ postId: '122171835092616875' }] }
    expect(matchProduct([published(1, 'x', payload, { status: 'draft' })], eternity.product)).toBeNull()
    expect(matchProduct([published(1, 'x', payload, { archived: true })], eternity.product)).toBeNull()
    expect(matchProduct([], eternity.product)).toBeNull()
    expect(matchProduct([published(1, 'Cokolwiek')], bySlug('pierscionek-waz-z-diamentami').product)).toBeNull()
  })

  it('tanzanit: okładką są zdjęcia „po”, a zdjęcie „przed” ma opis zaczynający się od „Przed:”', () => {
    const tanzanite = bySlug('pierscionek-z-tanzanitem')
    expect(tanzanite.photos.map((p) => p.file)).toEqual([
      '6-tanzanit_02_po.webp',
      '6-tanzanit_03_po.webp',
      '6-tanzanit_01_przed-wisiorek-pioro.webp',
    ])
    expect(tanzanite.photos[2].alt).toMatch(/^Przed:/)
  })

  it('przestawia zdjęcia tylko wtedy, gdy są dokładnie jak w pierwszej wersji seeda', () => {
    const tanzanite = bySlug('pierscionek-z-tanzanitem')
    expect(planPhotos(tanzanite.previousPhotos!, tanzanite)).toBe('przestaw')
    expect(planPhotos(tanzanite.photos, tanzanite)).toBe('aktualne')
    // ktoś zmienił opis jednego zdjęcia albo kolejność: zostawiamy
    expect(planPhotos(tanzanite.previousPhotos!.map((p, i) => (i === 1 ? { ...p, alt: 'Poprawiony opis' } : p)), tanzanite)).toBe('reczne')
    expect(planPhotos([...tanzanite.previousPhotos!].reverse(), tanzanite)).toBe('reczne')
    expect(planPhotos([{ file: null, alt: 'zdjęcie wgrane w panelu' }], tanzanite)).toBe('reczne')
  })
})

describe('opisy realizacji (12.11): podmiana tylko starych tekstów z seeda', () => {
  const bySlug = (slug: string) => SEED_WORKS.find((w) => w.slug === slug)!

  it('każda realizacja ma poprzednią wersję tekstów, a nowe teksty są inne', () => {
    for (const work of SEED_WORKS) {
      expect(work.previousTexts, work.slug).toBeDefined()
      expect(work.task).not.toBe(work.previousTexts!.task)
      expect(work.whatWeDid).not.toBe(work.previousTexts!.whatWeDid)
    }
  })

  it('stary tekst podmienia, nowy zostawia, ręcznie zmieniony pomija (chyba że --wymus)', () => {
    const morganite = bySlug('pierscionek-z-morganitem')
    const old = { title: morganite.previousTexts!.title!, task: morganite.previousTexts!.task, whatWeDid: 'Poprawione w panelu.' }
    const plan = planTexts(old, morganite)
    expect(plan.map((p) => [p.field, p.action])).toEqual([['title', 'podmien'], ['task', 'podmien'], ['whatWeDid', 'reczne']])
    expect(planTexts(old, morganite, true).every((p) => p.action === 'podmien')).toBe(true)
    expect(planTexts({ title: morganite.title, task: morganite.task, whatWeDid: morganite.whatWeDid }, morganite).every((p) => p.action === 'aktualne')).toBe(true)
  })

  it('tytuł bez poprzedniej wersji nie jest ruszany', () => {
    const snake = bySlug('pierscionek-waz-z-diamentami')
    const plan = planTexts({ title: 'Inny tytuł', task: snake.previousTexts!.task, whatWeDid: snake.previousTexts!.whatWeDid }, snake)
    expect(plan.map((p) => p.field)).toEqual(['task', 'whatWeDid'])
  })
})
