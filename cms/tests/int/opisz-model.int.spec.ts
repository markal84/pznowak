import { describe, expect, it } from 'vitest'

import {
  OUTPUT_SCHEMA,
  buildPrompt,
  checkModelOutput,
  inputHash,
  loadExamples,
  type ModelOutput,
} from '../../scripts/opisz-model-logic'
import {
  loadKanon,
  loadOpisy,
  loadPula,
  planDraft,
  takenFrom,
  type DraftCard,
} from '../../scripts/opisz-szkice-logic'

/** Zapora na odpowiedź modelu w kroku „opisz nowe szkice --model”: schemat AC, liczby i kamień tylko z posta. */
const card = (text: string, extra: Partial<DraftCard> = {}): DraftCard => ({
  id: 70,
  name: 'Do nazwania',
  slug: 'do-nazwania',
  lead: '',
  description: '',
  stone: '',
  metal: '',
  carats: '',
  _status: 'draft',
  source: {
    facebookKey: 'turmalin-zielen@1222',
    facebookPayload: { posts: [{ postId: '1222', date: '2026-11-10', url: '', text }] },
  },
  ...extra,
})

const good = (over: Partial<ModelOutput> = {}): ModelOutput => ({
  lead: 'Klasyczny fason z jednym kamieniem w czterech łapkach na smukłej szynie z żółtego złota.',
  description:
    'Pierścionek z żółtego złota w prostym fasonie z jednym kamieniem. Prostokątny kamień trzymają cztery łapki, a smukła szyna zostawia całą uwagę kamieniowi.\n\n' +
    'Kamień oprawiamy ręcznie w naszej pracowni. Na zdjęciach w centrum jest turmalin w soczystej, butelkowej zieleni.\n\n' +
    'Model wykonamy w wybranym rozmiarze, także z innym kamieniem.',
  kamien: { wartosc: 'Turmalin', zrodlo: 'post' },
  metal: { wartosc: 'Żółte', zrodlo: 'zdjecia' },
  masa: { wartosc: '', zrodlo: 'brak' },
  uwagi: ['próba złota nieznana'],
  ...over,
})

const post = 'Turmalin – zieleń, której nie da się zamknąć w jednym odcieniu. Kamień 0,93 ct.'

describe('checkModelOutput', () => {
  it('przepuszcza tekst w schemacie AC; metal ze zdjęć oznacza do sprawdzenia', () => {
    const { spec, problems } = checkModelOutput(good(), card(post), 'Alcyone')
    expect(problems).toEqual([])
    expect(spec).toMatchObject({
      id: 70,
      klucz: 'turmalin-zielen@1222',
      zrodlo: 'model',
      stone: 'Turmalin',
      metal: 'Żółte',
    })
    expect(spec.doSprawdzenia?.metal).toMatch(/ze zdjęć/)
    expect(spec.carats).toBeUndefined()
  })

  it('masa tylko, gdy liczba jest w poście', () => {
    const ok = checkModelOutput(
      good({ masa: { wartosc: '0.93 ct', zrodlo: 'post' } }),
      card(post),
      'Alcyone',
    )
    expect(ok.spec.carats).toBe('0,93 ct')
    const made = checkModelOutput(
      good({ masa: { wartosc: '1,2 ct', zrodlo: 'post' } }),
      card(post),
      'Alcyone',
    )
    expect(made.spec.carats).toBeUndefined()
    expect(made.spec.uwagi?.join(' ')).toMatch(/nie wynika z posta/)
    const guessed = checkModelOutput(
      good({ masa: { wartosc: '0,93 ct', zrodlo: 'zdjecia' } }),
      card(post),
      'Alcyone',
    )
    expect(guessed.spec.carats).toBeUndefined()
  })

  it('liczba w tekście, której nie ma w poście (próba, masa), to błąd do poprawy', () => {
    const out = good({
      description: good()
        .description.replace('z żółtego złota w', 'z żółtego złota próby 585 w')
        .replace('jest turmalin', 'jest turmalin o masie 1,5 ct'),
    })
    const { problems } = checkModelOutput(out, card(post), 'Alcyone')
    expect(problems.join(' ')).toMatch(/„585”/)
    expect(problems.join(' ')).toMatch(/„1,5”/)
    // ta sama liczba z posta jest w porządku
    const fine = checkModelOutput(
      good({
        description: good().description.replace('jest turmalin', 'jest turmalin o masie 0,93 ct'),
      }),
      card(post),
      'Alcyone',
    )
    expect(fine.problems).toEqual([])
  })

  it('kamień tylko z posta: odczyt ze zdjęć idzie do uwag, a opis nie może nazwać minerału', () => {
    const noStone = 'Nowy pierścionek prosto z pracowni, w głębokim błękicie.'
    const out = good({
      kamien: { wartosc: 'Szafir', zrodlo: 'zdjecia' },
      description: good().description.replace(
        'turmalin w soczystej, butelkowej zieleni',
        'szafir w głębokim błękicie',
      ),
    })
    const { spec, problems } = checkModelOutput(
      out,
      card(noStone, {
        source: {
          facebookKey: 'nowy@1',
          facebookPayload: { posts: [{ postId: '1', date: '', url: '', text: noStone }] },
        },
      }),
      'Alcyone',
    )
    expect(spec.stone).toBeUndefined()
    expect(spec.uwagi?.join(' ')).toMatch(/post go nie nazywa/)
    expect(problems.join(' ')).toMatch(/opisz tylko kolor/)
    // „post” bez pokrycia w treści też nie przechodzi
    const claimed = checkModelOutput(
      good({ kamien: { wartosc: 'Szafir', zrodlo: 'post' } }),
      card(post),
      'Alcyone',
    )
    expect(claimed.spec.stone).toBeUndefined()
  })

  it('łamanie schematu AC wraca jako problemy (lead od kamienia, imię w leadzie, za krótki opis)', () => {
    const { problems } = checkModelOutput(
      good({
        lead: 'Turmalin w czterech łapkach, Alcyone na smukłej szynie z żółtego złota.',
        description: 'Krótko.',
      }),
      card(post),
      'Alcyone',
    )
    expect(problems.join(' ')).toMatch(/lead zaczyna się od kamienia/)
    expect(problems.join(' ')).toMatch(/lead zawiera nazwę/)
    expect(problems.join(' ')).toMatch(/opis ma 1 słów/)
  })

  it('metal spoza listy katalogu i zły format odpowiedzi', () => {
    expect(
      checkModelOutput(
        good({ metal: { wartosc: 'złoto żółte 585', zrodlo: 'post' } }),
        card(post),
        'A',
      ).spec.metal,
    ).toBeUndefined()
    expect(checkModelOutput({ lead: 1 }, card(post), 'A').problems).toEqual([
      'odpowiedź nie pasuje do schematu',
    ])
    expect(checkModelOutput(null, card(post), 'A').problems.length).toBe(1)
  })

  it('pozycja modelu wchodzi do planu z oznaczonym źródłem; plik opisów (człowiek) ma pierwszeństwo', () => {
    const c = card(post)
    const { spec } = checkModelOutput(good(), c, 'Alcyone')
    const ctx = {
      specs: [...loadOpisy(), spec],
      kanon: loadKanon(),
      pula: loadPula(),
      ...takenFrom([c], []),
    }
    const plan = planDraft(c, ctx)
    const fields = Object.fromEntries(plan.changes.map((ch) => [ch.field, ch]))
    expect(fields.lead.source).toBe('model (zdjęcia i post)')
    expect(fields.description.source).toBe('model (zdjęcia i post)')
    expect(fields.metal.check).toMatch(/ze zdjęć/)
    expect(fields.stone.check).toBeUndefined()
    expect(plan.toCheck).toContain('próba złota nieznana')
    // Xanthe ma pozycję w opisy-szkice.json: wygrywa nad pozycją modelu z tym samym kluczem
    const xantheKey = 'moissanit-1-ct-brzoskwiniowo-zloty@122200020668616875'
    const x = card('moissanit 1 ct', {
      id: 61,
      name: 'Xanthe',
      slug: 'xanthe',
      source: { facebookKey: xantheKey, facebookPayload: { posts: [] } },
    })
    const fromModel = { ...spec, klucz: xantheKey, id: 61, lead: 'inny lead' }
    const planX = planDraft(x, { ...ctx, specs: [...loadOpisy(), fromModel] })
    expect(planX.changes.find((ch) => ch.field === 'lead')?.source).toBe('plik opisów')
  })
})

describe('polecenie i schemat', () => {
  it('polecenie zawiera post, przykłady z AC i listę błędów przy drugiej próbie', () => {
    const examples = loadExamples()
    expect(examples.length).toBeGreaterThanOrEqual(3)
    const prompt = buildPrompt(card(post), examples, {
      photos: 3,
      problems: ['lead ma 20 słów (norma 8–16)'],
    })
    expect(prompt).toContain('Turmalin – zieleń')
    expect(prompt).toContain(`### ${examples[0].name}`)
    expect(prompt).toContain('lead ma 20 słów')
    expect(prompt).toContain('NIE nazywaj minerału')
  })

  it('schemat wymaga wszystkich pól i nie dopuszcza dodatkowych', () => {
    expect(OUTPUT_SCHEMA.required).toEqual([
      'lead',
      'description',
      'kamien',
      'metal',
      'masa',
      'uwagi',
    ])
    expect(OUTPUT_SCHEMA.additionalProperties).toBe(false)
  })

  it('odcisk wejścia zmienia się z postem i zdjęciami', () => {
    const a = inputHash(card(post), [1, 2], 'm')
    expect(inputHash(card(post), [1, 2], 'm')).toBe(a)
    expect(inputHash(card(post), [1, 3], 'm')).not.toBe(a)
    expect(inputHash(card(`${post}!`), [1, 2], 'm')).not.toBe(a)
  })
})
