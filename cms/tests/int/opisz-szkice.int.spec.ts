import { describe, expect, it } from 'vitest'

import { lintAc } from '../../scripts/opisy-ac-logic'
import {
  loadKanon,
  loadOpisy,
  loadPula,
  nameFromImport,
  paramsFromPosts,
  patchData,
  planDraft,
  planDrafts,
  stillOpen,
  takenFrom,
  textFromImport,
  type DraftCard,
  type OpisSzkicu,
  type PlanContext,
} from '../../scripts/opisz-szkice-logic'

/** Krok „opisz nowe szkice”: tylko puste pola szkiców, imię bez kolizji, teksty tylko z pliku opisów. */
const specs = loadOpisy()
const kanon = loadKanon()
const pula = loadPula()

const xantheKey = 'moissanit-1-ct-brzoskwiniowo-zloty@122200020668616875'
const xantheDraft = (): DraftCard => ({
  id: 61,
  name: 'Xanthe',
  slug: 'xanthe',
  lead: '',
  description: '',
  stone: '',
  metal: '',
  carats: '',
  _status: 'draft',
  source: {
    facebookKey: xantheKey,
    facebookPayload: {
      posts: [
        {
          postId: '122200020668616875',
          date: '2026-10-26',
          url: 'https://www.facebook.com/122200020668616875',
          text: 'Kolejny wyjątkowy moissanit, tym razem 1 ct w urzekającym, pomarańczowo-złocistym odcieniu. 🍊💎',
        },
      ],
    },
  },
})

const ctxFor = (cards: DraftCard[], extra: Partial<PlanContext> = {}): PlanContext => ({
  specs,
  kanon,
  pula,
  ...takenFrom(cards, ['nyx', 'pyrrha', 'pierscionek-18']),
  ...extra,
})

const published = (id: number, name: string): DraftCard => ({
  id,
  name,
  slug: name.toLowerCase(),
  _status: 'published',
})

describe('opisy-szkice.json', () => {
  it('Xanthe i Aethra: teksty spełniają schemat AC', () => {
    for (const name of ['Xanthe', 'Aethra']) {
      const spec = specs.find((s) => s.name === name)!
      expect(spec.klucz).toBeTruthy()
      expect(
        lintAc({ id: spec.id ?? 0, name, lead: spec.lead!, description: spec.description! }),
      ).toEqual([])
    }
  })

  it('kanon: moissanit 1 ct to Xanthe (Hesperia zajęta), pula bez powtórek i bez imion z kanonu', () => {
    expect(
      kanon.find((rule) => new RegExp(rule.match, 'i').test('moissanit 1 ct brzoskwiniowo zloty'))
        ?.name,
    ).toBe('Xanthe')
    expect(new Set(pula).size).toBe(pula.length)
    for (const rule of kanon) expect(pula).not.toContain(rule.name)
  })
})

describe('planDraft', () => {
  it('Xanthe: wpisuje lead, opis i parametry z pliku, imienia nie rusza', () => {
    const plan = planDraft(xantheDraft(), ctxFor([xantheDraft(), published(51, 'Hesperia')]))
    expect(plan.changes.map((c) => c.field)).toEqual([
      'lead',
      'description',
      'stone',
      'metal',
      'carats',
    ])
    expect(patchData(plan)).toMatchObject({ stone: 'Moissanit', metal: 'Żółte', carats: '1 ct' })
    expect(plan.changes.every((c) => c.source === 'plik opisów')).toBe(true)
    expect(plan.toCheck.join(' ')).toMatch(/radiant/)
  })

  it('idempotentne: karta po zapisie nie ma nic do wpisania', () => {
    const card = xantheDraft()
    const plan = planDraft(card, ctxFor([card]))
    const after = { ...card, ...patchData(plan) }
    expect(planDraft(after, ctxFor([after])).changes).toEqual([])
  })

  it('ręczna poprawka zostaje: wypełnione pole nie trafia do planu', () => {
    const card = { ...xantheDraft(), lead: 'Mój własny lead.', metal: 'Białe' }
    const fields = planDraft(card, ctxFor([card])).changes.map((c) => c.field)
    expect(fields).not.toContain('lead')
    expect(fields).not.toContain('metal')
    expect(fields).toContain('description')
  })

  it('opublikowanej karty i archiwum nie rusza', () => {
    expect(planDraft({ ...xantheDraft(), _status: 'published' }, ctxFor([])).skip).toBeTruthy()
    expect(planDraft({ ...xantheDraft(), archived: true }, ctxFor([])).skip).toBeTruthy()
  })

  it('kanon zajęty przez inną kartę → wolne imię z puli z flagą, adres z imienia', () => {
    const card: DraftCard = { ...xantheDraft(), id: 70, name: 'Do nazwania', slug: 'do-nazwania' }
    const ctx = ctxFor([card, published(61, 'Xanthe'), published(80, 'Alcyone')], { specs: [] })
    const plan = planDraft(card, ctx)
    const name = plan.changes.find((c) => c.field === 'name')!
    expect(name.value).toBe(pula.find((n) => n !== 'Alcyone'))
    expect(name.source).toBe('pula imion')
    expect(name.check).toBeTruthy()
    expect(plan.changes.find((c) => c.field === 'slug')?.value).toBe(name.value.toLowerCase())
    expect(plan.toCheck.join(' ')).toMatch(/Xanthe.*z kanonu ma już inna karta/)
  })

  it('dwa szkice w jednym przebiegu nie dostają tego samego imienia', () => {
    const a: DraftCard = { id: 90, name: 'Do nazwania', slug: 'do-nazwania', _status: 'draft' }
    const b: DraftCard = { id: 91, name: 'Do nazwania', slug: 'do-nazwania-2', _status: 'draft' }
    const [pa, pb] = planDrafts([a, b], ctxFor([a, b], { specs: [] }))
    const nameA = pa.changes.find((c) => c.field === 'name')!.value
    const nameB = pb.changes.find((c) => c.field === 'name')!.value
    expect(nameA).not.toBe(nameB)
  })

  it('wycofane adresy z przekierowań (Nyx, Pyrrha) nie wracają jako imię', () => {
    const card: DraftCard = { id: 92, name: 'Do nazwania', slug: 'do-nazwania', _status: 'draft' }
    const spec: OpisSzkicu = { id: 92, name: 'Nyx' }
    const plan = planDraft(card, ctxFor([card], { specs: [spec] }))
    expect(plan.changes.find((c) => c.field === 'name')?.value).not.toBe('Nyx')
    expect(plan.toCheck.join(' ')).toMatch(/Nyx/)
  })

  it('bez tekstu w pliku: lead i opis zostają puste i idą do sprawdzenia; parametry z posta z flagą', () => {
    const card: DraftCard = {
      ...xantheDraft(),
      id: 93,
      source: { ...xantheDraft().source, facebookKey: 'moissanit-x@1' },
    }
    const plan = planDraft(card, ctxFor([card], { specs: [] }))
    expect(plan.changes.map((c) => c.field)).toEqual(['stone', 'carats'])
    expect(plan.changes.every((c) => c.source === 'post FB' && c.check)).toBe(true)
    expect(plan.toCheck.join(' ')).toMatch(/krótki opis: brak tekstu/)
    expect(plan.toCheck.join(' ')).toMatch(/metal: nie widać/)
  })

  it('tekst niezgodny ze schematem nie jest wpisywany', () => {
    const card = xantheDraft()
    const bad: OpisSzkicu = { klucz: xantheKey, lead: 'Moissanit!', description: 'Krótko.' }
    const plan = planDraft(card, ctxFor([card], { specs: [bad] }))
    expect(plan.changes.map((c) => c.field)).not.toContain('lead')
    expect(plan.changes.map((c) => c.field)).not.toContain('description')
    expect(plan.toCheck.join(' ')).toMatch(/nie spełnia schematu/)
  })
})

describe('co wstawił import, a co człowiek', () => {
  const turmalin: DraftCard = {
    id: 60,
    name: 'Turmalin – zieleń, której nie da się zamknąć w jednym odcieniu',
    slug: 'turmalin-zielen-ktorej-nie-da-sie-zamknac-w-jednym-odcieniu',
    lead: 'Turmalin – zieleń, której nie da się zamknąć w jednym odcieniu.',
    _status: 'draft',
    source: {
      facebookKey: 'turmalin-zielen-ktorej-nie-da-sie-zamknac-w-jednym-odcieniu@122202679670616875',
      facebookPayload: {
        posts: [
          {
            postId: '1',
            date: '2026-11-14',
            url: '',
            text: '💚Turmalin – zieleń, której nie da się zamknąć w jednym odcieniu.\n\nRazem z diamentami tworzy idealny duet.',
          },
        ],
      },
    },
  }

  it('tytuł posta w nazwie i leadzie (karta 60) traktuje jak puste', () => {
    expect(nameFromImport(turmalin)).toBe(true)
    expect(textFromImport(turmalin, 'lead')).toBe(true)
    expect(stillOpen(turmalin, 'slug')).toBe(true)
  })

  it('imię i lead wpisane ręcznie zostają', () => {
    expect(nameFromImport({ ...turmalin, name: 'Chloe' })).toBe(false)
    expect(
      textFromImport({ ...turmalin, lead: 'Zielony turmalin w halo z diamentów.' }, 'lead'),
    ).toBe(false)
    expect(nameFromImport({ id: 1, name: 'Do nazwania' })).toBe(true)
  })

  it('parametry z posta: moissanit i pełne karaty; „w żółtym złocie”, ale nie „złocisty” kamień', () => {
    expect(paramsFromPosts(xantheDraft())).toEqual({
      stone: 'Moissanit',
      metal: '',
      carats: '1 ct',
    })
    const gold = {
      ...xantheDraft(),
      source: {
        facebookKey: 'x@1',
        facebookPayload: {
          posts: [
            {
              postId: '1',
              date: '',
              url: '',
              text: 'Ametyst 0.43 ct w żółtym złocie z diamentami',
            },
          ],
        },
      },
    }
    expect(paramsFromPosts(gold)).toEqual({
      stone: 'Ametyst, Diament',
      metal: 'Żółte',
      carats: '0,43 ct',
    })
  })
})
