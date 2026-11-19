/**
 * Model piszący krótki opis, opis i parametry nowych szkiców (krok „opisz nowe szkice” z `--model`): czysta logika bez
 * sieci, bez bazy i bez procesu `claude`. Buduje polecenie dla modelu (schemat AC, przykłady z `opisy-ac.json`, posty),
 * schemat JSON odpowiedzi i ZAPORĘ na odpowiedź:
 *  - lead i opis przechodzą ten sam linter co AC (`lintAc`), a liczby (masa „ct”, próba złota, „14k”) w tekście muszą
 *    występować w poście albo w tytule karty – model nie może dopisać parametru, którego nikt nie podał;
 *  - masa tylko z posta (liczba sprawdzana w treści), kamień tylko z posta (ze zdjęć wyłącznie jako uwaga, bo ze zdjęcia
 *    topaz i szafir wyglądają podobnie – Thalia), metal z posta albo ze zdjęć (wtedy oznaczony „do sprawdzenia”);
 *  - gdy kamienia nie ma w poście, opis nie może nazwać minerału (tylko kolor).
 * Pole niepewne zostaje puste i trafia do uwag. Używa tego `scripts/opisz-model.ts` i `tests/int/opisz-model.int.spec.ts`.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { cleanPostText } from '../src/lib/fb-import'
import { AC_PATH, STONE_OPENING, lintAc, type AcSpec } from './opisy-ac-logic'
import {
  cardTitle,
  facebookKey,
  paramsFromPosts,
  postsOf,
  type DraftCard,
  type OpisSzkicu,
  type ParamField,
} from './opisz-szkice-logic'

/** Zmiana polecenia albo zapory = nowa wersja: zapamiętane odpowiedzi starszej wersji idą do modelu jeszcze raz. */
export const PROMPT_VERSION = 'opisz-model-1'
export const DEFAULT_MODEL = 'claude-opus-5-5'
export const DEFAULT_EFFORT = 'medium'

/** Metal w zapisie katalogu (tak jak filtr na stronie). */
export const METALS = ['Żółte', 'Białe', 'Różowe', 'Żółte z białym', 'Platyna'] as const

/** Przykłady w poleceniu: różne fasony z `opisy-ac.json` (jeden kamień, halo, roślinny, obrączka). */
const EXAMPLE_NAMES = ['Daphne', 'Cyane', 'Aion', 'Iole']

type Source = 'post' | 'zdjecia' | 'brak'
export type ModelParam = { wartosc: string; zrodlo: Source }
export type ModelOutput = {
  lead: string
  description: string
  kamien: ModelParam
  metal: ModelParam
  masa: ModelParam
  uwagi: string[]
}

const param = {
  type: 'object',
  additionalProperties: false,
  required: ['wartosc', 'zrodlo'],
  properties: {
    wartosc: { type: 'string', maxLength: 60 },
    zrodlo: { type: 'string', enum: ['post', 'zdjecia', 'brak'] },
  },
}

/** Schemat odpowiedzi dla `claude -p --json-schema` (model musi go spełnić, a my i tak sprawdzamy go jeszcze raz). */
export const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lead', 'description', 'kamien', 'metal', 'masa', 'uwagi'],
  properties: {
    lead: { type: 'string', maxLength: 200 },
    description: { type: 'string', maxLength: 1200 },
    kamien: param,
    metal: param,
    masa: param,
    uwagi: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 200 } },
  },
}

export const SYSTEM_PROMPT = [
  'Jesteś redaktorką katalogu pracowni jubilerskiej PZ Nowak (pierścionki wykonywane ręcznie na zamówienie).',
  'Piszesz po polsku, rzeczowo i ciepło, bez marketingowego patosu. Opisujesz tylko to, co widać na zdjęciach',
  'i co jest napisane w poście. Niczego nie zgadujesz: parametru, którego nie ma w poście, nie podajesz.',
  'Odpowiedź oddajesz wyłącznie przez narzędzie danych strukturalnych, zgodnie ze schematem.',
].join(' ')

export function loadExamples(source: string = AC_PATH): AcSpec[] {
  const all = JSON.parse(readFileSync(source, 'utf8')) as AcSpec[]
  const picked = EXAMPLE_NAMES.map((name) => all.find((spec) => spec.name === name)).filter(
    (spec): spec is AcSpec => Boolean(spec) && !lintAc(spec as AcSpec).length,
  )
  return picked.length ? picked : all.slice(0, 3)
}

const postTexts = (card: DraftCard) => postsOf(card).map((post) => cleanPostText(post.text))

/** Tekst polecenia (zdjęcia idą przed nim jako osobne bloki obrazów). */
export function buildPrompt(
  card: DraftCard,
  examples: AcSpec[],
  opts: { photos: number; problems?: string[] } = { photos: 0 },
): string {
  const fromPosts = paramsFromPosts(card)
  const posts = postsOf(card)
  const lines = [
    `Powyżej ${opts.photos} ${opts.photos === 1 ? 'zdjęcie' : 'zdjęć'} nowego pierścionka z naszej pracowni (kadry z posta na Facebooku).`,
    'Napisz do karty w katalogu krótki opis (lead) i opis, oraz podaj kamień, metal i masę kamienia.',
    '',
    '## Zasady tekstu (schemat AC – sprawdza je automat, tekst niezgodny zostanie odrzucony)',
    '- lead: jedno zdanie, 8–16 słów, o fasonie i wykonaniu. Nie zaczyna się od nazwy ani koloru kamienia (ani od',
    '  „diament”, „brylant”, „owalny”, „naturalny”). Bez imienia pierścionka.',
    '- opis: 2 albo 3 akapity rozdzielone pustą linią, razem 40–90 słów.',
    '  (1) fason i wykonanie: oprawa (łapki, halo, koszyk), szyna, ramiona, kształt i szlif kamienia, kolor złota – to,',
    '      co WIDAĆ na zdjęciach. Pierwsze słowo to nie kamień ani kolor (najlepiej „Pierścionek z …”).',
    '  (2) zaczyna się od „Kamień oprawiamy ręcznie w naszej pracowni.” (przy kilku kamieniach: „Kamienie oprawiamy',
    '      ręcznie w naszej pracowni.”), potem „Na zdjęciach w centrum jest …” – kamień z posta i jego barwa ze zdjęć.',
    '  (3) zawiera zdanie „Model wykonamy w wybranym rozmiarze, także z innym kamieniem.” (może wymienić kamienie).',
    '- Bez pierwszej osoby liczby pojedynczej, bez pytań, wykrzykników, emoji i zwrotów do czytelnika',
    '  („zapraszamy”, „kolejny”, „napisz”, „w komentarzu”). Półpauza z odstępami „ – ”, nie dywiz.',
    '- Masa z przecinkiem („0,41 ct”). Liczby: masę, próbę złota („585”, „14k”) podajesz TYLKO, jeśli są w poście',
    '  albo w tytule karty. Nie szacujesz masy ze zdjęcia.',
    '- Jeśli nazwy kamienia nie ma w poście ani w tytule karty, NIE nazywaj minerału w opisie (topaz, szafir,',
    '  tanzanit itd. na zdjęciu wyglądają podobnie). Napisz wtedy np. „Na zdjęciach w centrum jest kamień w głębokim',
    '  błękicie.” i dodaj uwagę.',
    '- Szlif (owal, radiant, szmaragdowy, gruszka) możesz nazwać, jeśli jest wyraźny na zdjęciach; dodaj wtedy uwagę',
    '  „szlif … odczytany ze zdjęć”.',
    '',
    '## Parametry (każdy: wartość i źródło)',
    '- kamien: nazwa kamienia centralnego, jak w katalogu („Moissanit”, „Turmalin”, „Szafir”, przy kilku: „Szmaragd,',
    '  Diament”). zrodlo „post”, gdy nazwa jest w poście lub tytule; „zdjecia”, gdy tylko zgadujesz ze zdjęcia;',
    '  „brak”, gdy nie wiesz (wartość pusta).',
    `- metal: jedna z wartości: ${METALS.map((m) => `„${m}”`).join(', ')}. zrodlo „post” albo „zdjecia” (kolor złota`,
    '  widać na zdjęciu); „brak”, gdy światło nie pozwala ocenić.',
    '- masa: np. „1 ct”, „0,41 ct” – tylko z posta albo tytułu (zrodlo „post”). Inaczej pusta i zrodlo „brak”.',
    '- uwagi: krótko, co Marcin ma sprawdzić przed publikacją (np. „próba złota nieznana”, „szlif radiant odczytany',
    '  ze zdjęć”). Najwyżej 6.',
    '',
    '## Przykłady dobrych tekstów z katalogu (inne pierścionki – nie kopiuj, tylko styl i budowa)',
  ]
  for (const example of examples) {
    lines.push('', `### ${example.name}`, `lead: ${example.lead}`, 'opis:', example.description)
  }
  lines.push(
    '',
    '## Ta karta',
    `- tytuł z przeglądu: „${cardTitle(card) || '–'}”`,
    `- teraz w karcie: kamień „${card.stone ?? ''}”, metal „${card.metal ?? ''}”, masa „${card.carats ?? ''}”`,
    `- automat odczytał z posta: kamień „${fromPosts.stone}”, metal „${fromPosts.metal}”, masa „${fromPosts.carats}”`,
    '',
    `### ${posts.length === 1 ? 'Post' : `Posty (${posts.length})`}`,
  )
  for (const [index, text] of postTexts(card).entries()) {
    lines.push('', `${posts[index]?.date ?? ''}:`, text.trim() || '(bez tekstu)')
  }
  if (opts.problems?.length) {
    lines.push(
      '',
      '## Poprzednia wersja została odrzucona przez automat – popraw dokładnie te punkty',
      ...opts.problems.map((problem) => `- ${problem}`),
    )
  }
  return `${lines.join('\n')}\n`
}

/** Odcisk wejścia: te same posty, zdjęcia i wersja polecenia = zapamiętana odpowiedź, bez drugiego wywołania. */
export function inputHash(
  card: DraftCard,
  mediaIds: Array<number | string>,
  model: string,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        v: PROMPT_VERSION,
        model,
        key: facebookKey(card),
        posts: postsOf(card).map((post) => [post.postId, post.text]),
        mediaIds,
      }),
    )
    .digest('hex')
    .slice(0, 16)
}

const STONE_NAMES =
  /(?<![\p{L}])(diament\p{L}*|brylant\p{L}*|rubin\p{L}*|szafir\p{L}*|szmaragd\p{L}*|topaz\p{L}*|tanzanit\p{L}*|ametyst\p{L}*|turmalin\p{L}*|morganit\p{L}*|cytryn\p{L}*|oliwin\p{L}*|perydot\p{L}*|akwamaryn\p{L}*|moissanit\p{L}*|spinel\p{L}*|granat(?!ow)\p{L}*|opal\p{L}*|andaluzyt\p{L}*|kunzyt\p{L}*|agat\p{L}*)/giu

const digits = (value: string) => value.replace(/\s+/g, '').replace('.', ',').toLowerCase()

/** Liczby, które w tekście są parametrem pierścionka (masa, próba złota, karaty złota). */
function numericClaims(text: string): string[] {
  const claims: string[] = []
  for (const m of text.matchAll(/(?<![\d,.])(\d+(?:[,.]\d+)?)\s*(?:ct|kt|karat\p{L}*)/giu))
    claims.push(digits(m[1]))
  for (const m of text.matchAll(/prób\p{L}*\s+(\d{3})/giu)) claims.push(m[1])
  for (const m of text.matchAll(/(?<![\p{L}\d])(\d{1,2})\s?k(?![\p{L}])/giu))
    claims.push(`${m[1]}k`)
  return claims
}

/** Czy liczba z tekstu modelu występuje w poście albo w tytule karty? */
function inSources(claim: string, sources: string): boolean {
  const hay = digits(sources)
  if (/k$/.test(claim))
    return new RegExp(`(?<!\\d)${claim.slice(0, -1)}\\s?k(?!\\p{L})`, 'iu').test(sources)
  return new RegExp(`(?<![\\d,])${claim.replace(',', '[,.]')}(?![\\d])`, 'u').test(hay)
}

const isParam = (value: unknown): value is ModelParam =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ModelParam).wartosc === 'string' &&
  ['post', 'zdjecia', 'brak'].includes((value as ModelParam).zrodlo)

export type Checked = {
  /** Pozycja w formacie pliku opisów (wchodzi do planu jak pozycja z `opisy-szkice.json`). */
  spec: OpisSzkicu
  /** Błędy tekstu: odpowiedź do poprawki (druga próba) albo, za drugim razem, tekst nie jest wpisywany. */
  problems: string[]
}

/**
 * Zapora na odpowiedź modelu. `name` to imię, które karta dostanie (lead nie może go zawierać). Parametry niepewne
 * nie wchodzą do pozycji: zostają puste, a powód idzie do `uwagi`.
 */
export function checkModelOutput(raw: unknown, card: DraftCard, name: string): Checked {
  const problems: string[] = []
  const out = raw as Partial<ModelOutput> | null
  const spec: OpisSzkicu = { klucz: facebookKey(card) || undefined, id: card.id, zrodlo: 'model' }
  if (
    !out ||
    typeof out !== 'object' ||
    typeof out.lead !== 'string' ||
    typeof out.description !== 'string' ||
    !isParam(out.kamien) ||
    !isParam(out.metal) ||
    !isParam(out.masa) ||
    !Array.isArray(out.uwagi)
  ) {
    return {
      spec: { ...spec, uwagi: ['model zwrócił dane w złym formacie'] },
      problems: ['odpowiedź nie pasuje do schematu'],
    }
  }
  const uwagi = out.uwagi
    .filter((u): u is string => typeof u === 'string' && Boolean(u.trim()))
    .slice(0, 6)
  const checks: Partial<Record<ParamField, string>> = {}
  const sources = [cardTitle(card), card.name ?? '', ...postTexts(card)].join('\n')
  const fromPosts = paramsFromPosts(card)
  const lead = out.lead.trim()
  const description = out.description.replace(/\r\n/g, '\n').trim()

  // --- parametry ---
  const stone = out.kamien.wartosc.trim()
  let stoneKnown = Boolean(fromPosts.stone)
  if (stone && out.kamien.zrodlo === 'post') {
    const named = [...stone.matchAll(STONE_NAMES)].map((m) => m[1].toLowerCase().slice(0, 5))
    const backed = named.length > 0 && named.every((stem) => sources.toLowerCase().includes(stem))
    if (backed) {
      spec.stone = stone
      stoneKnown = true
      if (fromPosts.stone && fromPosts.stone.toLowerCase() !== stone.toLowerCase())
        checks.stone = `model: „${stone}”, automat z posta: „${fromPosts.stone}” – sprawdź`
    } else {
      uwagi.push(`kamień „${stone}” – nie znalazłam go w poście, zostaje pusty (wpisz w panelu)`)
    }
  } else if (stone && out.kamien.zrodlo === 'zdjecia') {
    uwagi.push(
      `kamień: na zdjęciach wygląda na „${stone}”, ale post go nie nazywa – wpisz w panelu`,
    )
  }

  const metal = out.metal.wartosc.trim()
  if (metal && out.metal.zrodlo !== 'brak') {
    if ((METALS as readonly string[]).includes(metal)) {
      spec.metal = metal
      if (out.metal.zrodlo === 'zdjecia') checks.metal = 'kolor złota odczytany ze zdjęć – sprawdź'
    } else {
      uwagi.push(`metal „${metal}” spoza listy katalogu – zostaje pusty`)
    }
  }

  const carats = out.masa.wartosc.trim()
  if (carats && out.masa.zrodlo !== 'brak') {
    const m = carats.match(/^(\d+(?:[,.]\d+)?)\s*ct$/iu)
    if (m && out.masa.zrodlo === 'post' && inSources(digits(m[1]), sources)) {
      spec.carats = `${digits(m[1])} ct`
    } else {
      uwagi.push(`masa „${carats}” nie wynika z posta – zostaje pusta`)
    }
  }

  // --- tekst ---
  const lint = lintAc({ id: card.id, name: name || '\u0000', lead, description })
  problems.push(...lint.map((issue) => issue.problem))
  for (const [label, text] of [
    ['lead', lead],
    ['opis', description],
  ] as const) {
    for (const claim of numericClaims(text)) {
      if (!inSources(claim, sources))
        problems.push(
          `${label}: liczba „${claim}” (masa albo próba złota) nie występuje w poście – usuń ją`,
        )
    }
  }
  if (!stoneKnown) {
    const named = [...`${lead}\n${description}`.matchAll(STONE_NAMES)].map((m) => m[1])
    if (named.length)
      problems.push(
        `post nie nazywa kamienia, a tekst nazywa minerał („${[...new Set(named)].join('”, „')}”) – opisz tylko kolor`,
      )
  }
  if (
    STONE_OPENING.test(lead.split(/\s+/u)[0] ?? '') &&
    !problems.some((p) => p.startsWith('lead zaczyna'))
  )
    problems.push('lead zaczyna się od kamienia albo koloru')

  spec.lead = lead
  spec.description = description
  if (Object.keys(checks).length) spec.doSprawdzenia = checks
  spec.uwagi = [...new Set(uwagi)]
  return { spec, problems: [...new Set(problems)] }
}
