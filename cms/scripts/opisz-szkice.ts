/**
 * Krok „opisz nowe szkice” – puszczany po `npm run import:fb -- --apply`. Uzupełnia w szkicach pierścionków puste pola:
 * imię (plik opisów → kanon → wolne imię z mitologii), krótki opis i opis (schemat AC, tekst z pliku opisów),
 * kamień, metal i masę kamienia. Pisze WYŁĄCZNIE do pustych pól (albo z tekstem wstawionym przez import), nigdy nie
 * nadpisuje ręcznych poprawek i nic nie publikuje; drugi przebieg nic nie zmienia.
 *
 *   npm run opisz:szkice                      na sucho: podgląd (karta, pole, wartość, źródło, „do sprawdzenia”)
 *   npm run opisz:szkice -- --apply           zapis do szkiców przez REST, kontem „Automat” (klucz API = tylko szkice)
 *   npm run opisz:szkice -- --model           teksty szkiców bez opisu pisze model (claude -p, Opus, bez narzędzi)
 *                                             ze zdjęć i posta; zapora schematu AC, limity kosztu i czasu
 *                                             (scripts/opisz-model.ts); wynik w data/facebook/opisy-model/
 *   npm run opisz:szkice -- --model --apply   to samo i zapis (tak robi przycisk „Zastosuj eksport” na tablicy)
 *   npm run opisz:szkice -- --zadanie         jak na sucho + plik data/facebook/opisy-szkice-zadanie.md z postami
 *                                             i zdjęciami szkiców bez opisu (ręczna droga przez plik opisów)
 *
 * Opcje: --tylko=61,62 (tylko te karty), --opisy <plik> (domyślnie seed/opisy/opisy-szkice.json),
 * --url <adres strony> (domyślnie PZNOWAK_CMS_URL albo https://pznowak.pl),
 * --z-pliku <karty.json> (szkice z pliku zamiast z CMS, tylko na sucho: test bez klucza; imiona opublikowanych kart
 * i tak czyta z publicznego API).
 *
 * Klucz konta Automat (nigdy w repo): zmienna PZNOWAK_AUTOMAT_KEY albo plik ze zmiennej PZNOWAK_AUTOMAT_KEY_FILE,
 * domyślnie ~/.config/pznowak-cms/automat.key (chmod 600). Bez Local API i bez hasła do bazy: reguła
 * `src/lib/api-key-draft-only.ts` wymusza na tym kluczu zapis szkicu, więc skrypt nie może niczego opublikować.
 */
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { cleanPostText } from '../src/lib/fb-import'
import {
  MERGED_RING_VARIANTS,
  REMOVED_RING_REPLACEMENTS,
  RENAMED_RING_SLUGS,
} from '../src/lib/legacy-redirects'
import {
  defaultModelOptions,
  describeWithModel,
  loadModelSpecs,
  type ModelReport,
} from './opisz-model'
import {
  BRAK_TEKSTU,
  FIELD_LABELS,
  OPISY_SZKICE_PATH,
  cardTitle,
  facebookKey,
  loadKanon,
  loadOpisy,
  loadPula,
  paramsFromPosts,
  patchData,
  planDrafts,
  postsOf,
  stillOpen,
  takenFrom,
  type DraftCard,
  type DraftPlan,
} from './opisz-szkice-logic'

const args = process.argv.slice(2)
const option = (name: string) => {
  const inline = args.find((arg) => arg.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const apply = args.includes('--apply')
const brief = args.includes('--zadanie')
const useModel = args.includes('--model')
const fromFile = option('--z-pliku')
const only = new Set(
  (option('--tylko') ?? '')
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0),
)
const opisyPath = path.resolve(option('--opisy') ?? OPISY_SZKICE_PATH)
const site = (option('--url') ?? process.env.PZNOWAK_CMS_URL ?? 'https://pznowak.pl').replace(
  /\/+$/,
  '',
)
const repoRoot = fileURLToPath(new URL('../../', import.meta.url))
const outDir = path.join(repoRoot, 'data/facebook')
const modelDir = path.join(outDir, 'opisy-model')

if (apply && fromFile) throw new Error('--z-pliku działa tylko na sucho (bez --apply)')

const KEY_FILE =
  process.env.PZNOWAK_AUTOMAT_KEY_FILE ?? path.join(os.homedir(), '.config/pznowak-cms/automat.key')

async function readKey(): Promise<string> {
  if (process.env.PZNOWAK_AUTOMAT_KEY?.trim()) return process.env.PZNOWAK_AUTOMAT_KEY.trim()
  try {
    const info = await stat(KEY_FILE)
    if (info.mode & 0o077)
      console.log(`! ${KEY_FILE} czytelny dla innych – ustaw: chmod 600 "${KEY_FILE}"`)
    return (await readFile(KEY_FILE, 'utf8')).trim()
  } catch {
    return ''
  }
}

const key = await readKey()
if (!key && !fromFile) {
  console.log(
    `Brak klucza konta Automat. Zapisz go w ${KEY_FILE} (chmod 600) albo w zmiennej PZNOWAK_AUTOMAT_KEY.`,
  )
  console.log('Test bez klucza: npm run opisz:szkice -- --z-pliku <karty.json>')
  process.exit(1)
}
if (apply && !key) throw new Error('Zapis wymaga klucza konta Automat')

const headers = (withKey: boolean): Record<string, string> => ({
  Accept: 'application/json',
  'User-Agent': 'pznowak-opisz-szkice/1',
  ...(withKey && key ? { Authorization: `users API-Key ${key}` } : {}),
})

async function api<T>(
  pathAndQuery: string,
  init: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const auth = init.auth ?? true
  const response = await fetch(`${site}/api/${pathAndQuery}`, {
    method: init.method ?? 'GET',
    headers: { ...headers(auth), ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  const text = await response.text()
  if (!response.ok) {
    let detail = text.slice(0, 300)
    try {
      const parsed = JSON.parse(text) as { errors?: Array<{ message?: string }> }
      detail = parsed.errors?.map((e) => e.message).join('; ') || detail
    } catch {
      // zostaje surowy początek odpowiedzi
    }
    throw new Error(
      `${init.method ?? 'GET'} /api/${pathAndQuery.split('?')[0]}: HTTP ${response.status} ${detail}`,
    )
  }
  return JSON.parse(text) as T
}

type ListResponse = { docs: DraftCard[] }
const LIST = 'products?depth=0&limit=1000&pagination=false'

async function loadCards(): Promise<{ all: DraftCard[]; drafts: DraftCard[]; note: string }> {
  // Opublikowane wersje (publicznie) – imiona, które klient widzi na stronie.
  let published: DraftCard[] = []
  try {
    published = (await api<ListResponse>(LIST, { auth: Boolean(key) })).docs
  } catch (error) {
    if (!fromFile) throw error
    console.log(
      `! Nie czytam opublikowanych kart (${error instanceof Error ? error.message : error}); imiona sprawdzam tylko w pliku.`,
    )
  }
  if (fromFile) {
    const raw = JSON.parse(await readFile(path.resolve(fromFile), 'utf8')) as
      DraftCard[] | ListResponse
    const fileCards = Array.isArray(raw) ? raw : raw.docs
    const ids = new Set(fileCards.map((card) => card.id))
    return {
      all: [...published.filter((card) => !ids.has(card.id)), ...fileCards],
      drafts: fileCards.filter((card) => card._status === 'draft'),
      note: `szkice z pliku ${fromFile}, imiona opublikowanych z ${site} (${published.length})`,
    }
  }
  // Najnowsze wersje wszystkich kart, ze szkicami i archiwum (konto Automat = Redaktor, widzi też `source`).
  const latest = (await api<ListResponse>(`${LIST}&draft=true`)).docs
  return {
    all: [...latest, ...published],
    drafts: latest.filter((card) => card._status === 'draft'),
    note: `${site}, konto Automat`,
  }
}

const reservedSlugs = [
  ...Object.keys(MERGED_RING_VARIANTS),
  ...Object.keys(REMOVED_RING_REPLACEMENTS),
  ...Object.keys(RENAMED_RING_SLUGS),
  ...Object.values(RENAMED_RING_SLUGS),
]

const indent = (text: string, pad = '      ') =>
  text
    .replace(/\n\s*\n/g, '\n¶\n')
    .split('\n')
    .map((line) => `${pad}${line}`)
    .join('\n')

function printPlan(plan: DraftPlan, card: DraftCard) {
  const key = facebookKey(card)
  console.log(`\n${plan.label}${key ? `  (klucz ${key})` : ''}`)
  if (plan.skip) {
    console.log(`  = pomijam: ${plan.skip}`)
    return
  }
  if (!plan.changes.length) console.log('  = nic do wpisania')
  for (const change of plan.changes) {
    const flag = change.check ? `  [do sprawdzenia: ${change.check}]` : ''
    if (change.field === 'lead' || change.field === 'description') {
      console.log(`  + ${FIELD_LABELS[change.field]} ← ${change.source}${flag}`)
      console.log(indent(change.value))
    } else {
      console.log(`  + ${FIELD_LABELS[change.field]}: ${change.value} ← ${change.source}${flag}`)
    }
  }
  for (const note of plan.toCheck) console.log(`  ? do sprawdzenia przez Marcina: ${note}`)
}

const mediaUrl = (asset: NonNullable<DraftCard['media']>[number]['asset']) => {
  if (!asset || typeof asset === 'number' || !asset.url) return ''
  return /^https?:/.test(asset.url) ? asset.url : `${site}${asset.url}`
}

async function writeBrief(items: Array<{ plan: DraftPlan; card: DraftCard }>) {
  const lines = [
    '# Zadanie: opisy nowych szkiców (krok „opisz nowe szkice”)',
    '',
    `Wygenerowane ${new Date().toISOString()} przez \`npm run opisz:szkice -- --zadanie\`. Plik lokalny (poza gitem).`,
    '',
    'Dla każdej karty obejrzyj zdjęcia i post, potem dopisz pozycję do `cms/seed/opisy/opisy-szkice.json` i puść',
    '`npm run opisz:szkice` (podgląd) oraz `-- --apply`. Schemat AC (jak Xanthe i Aethra w tym pliku):',
    '- lead: jedno zdanie, 8–16 słów, o fasonie; nie zaczyna się od kamienia ani koloru, bez imienia karty;',
    '- opis: 2–3 akapity, 40–90 słów. (1) fason i wykonanie, (2) „Kamień oprawiamy ręcznie w naszej pracowni. Na',
    '  zdjęciach … jest …” – kamień ze zdjęć i posta, (3) „Model wykonamy w wybranym rozmiarze, także z …”;',
    '- bez pierwszej osoby, pytań, wykrzykników i emoji; masa z przecinkiem („0,41 ct”); półpauza „ – ”;',
    '- nie zgaduj: czego nie widać na zdjęciach ani w poście (próba złota, szlif, masa), tego nie pisz i dodaj do „uwagi”.',
    '',
    'Szablon pozycji:',
    '',
    '```json',
    '{ "klucz": "…", "name": "", "lead": "…", "description": "…", "stone": "", "metal": "", "carats": "", "uwagi": [] }',
    '```',
    '`name`, `stone`, `metal`, `carats` zostaw puste, jeśli nie są pewne (imię dobierze skrypt). Metal w zapisie katalogu:',
    '„Żółte”, „Białe”, „Różowe”, „Żółte z białym”.',
  ]
  for (const { plan, card } of items) {
    const params = paramsFromPosts(card)
    const planned = Object.fromEntries(plan.changes.map((c) => [c.field, c.value]))
    lines.push(
      '',
      `## #${card.id} ${planned.name ?? card.name ?? ''}`,
      '',
      `- klucz: \`${facebookKey(card) || '–'}\` (tytuł z przeglądu: „${cardTitle(card) || '–'}”)`,
      `- teraz w karcie: kamień „${card.stone ?? ''}”, metal „${card.metal ?? ''}”, masa „${card.carats ?? ''}”`,
      `- odczyt z posta: kamień „${params.stone}”, metal „${params.metal}”, masa „${params.carats}”`,
      '',
      '### Zdjęcia i filmy',
      '',
    )
    for (const item of card.media ?? []) {
      const url = mediaUrl(item.asset)
      const kind =
        typeof item.asset === 'object' && item.asset?.mimeType?.startsWith('video/')
          ? 'film'
          : 'zdjęcie'
      lines.push(
        `- ${kind}${item.isPrimary ? ' (główne)' : ''}: ${url || `media #${typeof item.asset === 'number' ? item.asset : '?'}`}`,
      )
    }
    lines.push('', '### Posty', '')
    for (const post of postsOf(card)) {
      lines.push(
        `- ${post.date}${post.url ? ` · ${post.url}` : ''}`,
        '',
        indent(cleanPostText(post.text), '  > '),
        '',
      )
    }
  }
  await mkdir(outDir, { recursive: true })
  const file = path.join(outDir, 'opisy-szkice-zadanie.md')
  await writeFile(file, `${lines.join('\n')}\n`)
  console.log(`\nZadanie zapisane: ${file}`)
}

// Pozycje z pliku opisów (człowiek) mają pierwszeństwo przed zapamiętanymi odpowiedziami modelu.
let specs = [...loadOpisy(opisyPath), ...(await loadModelSpecs(modelDir))]
const { all, drafts: allDrafts, note } = await loadCards()
// Szkice zbędne po zmianie decyzji w przeglądzie (np. post był „nową kartą”, a teraz jest wariantem Hesperii):
// export_selection.py wypisuje je w catalog-selection.json → orphanDrafts. Nie dostają imienia ani opisów; usuwa Marcin.
type Orphan = { id: number; name?: string; now?: string; post?: string; slug?: string }
const orphans: Orphan[] = await readFile(path.join(outDir, 'catalog-selection.json'), 'utf8')
  .then((text) => (JSON.parse(text) as { orphanDrafts?: Orphan[] }).orphanDrafts ?? [])
  .catch(() => [])
const orphanIds = new Map(orphans.map((o) => [o.id, o]))
for (const o of orphans) {
  if (allDrafts.some((card) => card.id === o.id))
    console.log(`= pomijam #${o.id} „${o.name || o.slug}”: post „${o.post}” idzie teraz do: ${o.now} – ten szkic usuń w panelu`)
}
const drafts = allDrafts.filter((card) => (!only.size || only.has(card.id)) && !orphanIds.has(card.id))
const kanon = loadKanon()
const pula = loadPula()
// Imiona i adresy opisywanych szkiców (jeszcze z importu) nie blokują same siebie; prawdziwe imiona są w takenFrom.
// planDrafts rezerwuje imiona w kontekście, więc każdy plan dostaje świeży kontekst.
const planAll = () => planDrafts(drafts, { specs, kanon, pula, ...takenFrom(all, reservedSlugs) })
let plans = planAll()
const byId = new Map(drafts.map((card) => [card.id, card]))

let modelReport: ModelReport[] = []
let modelCost = 0
if (useModel) {
  const needText = plans.filter(
    (plan) => !plan.skip && plan.toCheck.some((n) => n.includes(BRAK_TEKSTU)),
  )
  if (needText.length) {
    console.log(`Model pisze teksty: ${needText.length} szkic(e) bez opisu`)
    const items = []
    for (const plan of needText) {
      const card = fromFile
        ? (byId.get(plan.id) as DraftCard)
        : await api<DraftCard>(`products/${plan.id}?draft=true&depth=1`)
      const name = plan.changes.find((change) => change.field === 'name')?.value ?? card.name ?? ''
      items.push({ card, name })
    }
    const result = await describeWithModel(items, defaultModelOptions(modelDir, site))
    modelReport = result.report
    modelCost = result.costUsd
    for (const entry of modelReport)
      console.log(
        `  model #${entry.id}: ${entry.status} – ${entry.note}${entry.costUsd ? ` (${entry.costUsd.toFixed(2)} USD)` : ''}`,
      )
    console.log(`  koszt modelu w tym przebiegu: ${modelCost.toFixed(2)} USD`)
    const fresh = new Set(result.specs.map((spec) => spec.id))
    specs = [
      ...loadOpisy(opisyPath),
      ...result.specs,
      ...(await loadModelSpecs(modelDir)).filter((spec) => !fresh.has(spec.id)),
    ]
    plans = planAll()
  } else {
    console.log(
      'Model: wszystkie szkice mają już tekst (w karcie, w pliku opisów albo z poprzedniego przebiegu).',
    )
  }
}

console.log(
  `Opisz nowe szkice · ${note} · tryb: ${apply ? 'ZAPIS (tylko puste pola, tylko szkice)' : 'na sucho'}`,
)
console.log(
  `Plik opisów: ${path.relative(process.cwd(), opisyPath)} (${specs.length} poz.) · szkiców: ${drafts.length}`,
)
for (const plan of plans) printPlan(plan, byId.get(plan.id) as DraftCard)

const toWrite = plans.filter((plan) => !plan.skip && plan.changes.length)
const flagged = plans.filter((plan) => plan.toCheck.length || plan.changes.some((c) => c.check))
console.log(
  `\nRazem: ${toWrite.length} szkic(e) do uzupełnienia (${toWrite.reduce((n, p) => n + p.changes.length, 0)} pól), ` +
    `${flagged.length} z uwagami do sprawdzenia, ${plans.length - toWrite.length} bez zmian.`,
)

if (brief) {
  const needText = plans.filter((plan) => plan.toCheck.some((n) => n.includes(BRAK_TEKSTU)))
  const detailed: Array<{ plan: DraftPlan; card: DraftCard }> = []
  for (const plan of needText) {
    let card = byId.get(plan.id) as DraftCard
    if (!fromFile) card = await api<DraftCard>(`products/${plan.id}?draft=true&depth=1`)
    detailed.push({ plan, card })
  }
  if (detailed.length) await writeBrief(detailed)
  else console.log('\nZadanie: wszystkie szkice mają już tekst w pliku opisów albo w karcie.')
}

/** Podsumowanie dla tablicy przeglądu (okno „Zastosuj eksport”): co wpisano i co Marcin ma obejrzeć. */
async function writeSummary(written: number[], failed: number[]) {
  const summary = {
    at: new Date().toISOString(),
    site,
    apply,
    modelCostUsd: Number(modelCost.toFixed(4)),
    model: modelReport,
    cards: plans.map((plan) => ({
      id: plan.id,
      label: plan.label,
      name: plan.changes.find((c) => c.field === 'name')?.value ?? byId.get(plan.id)?.name ?? '',
      skip: plan.skip ?? null,
      fields: plan.changes.map((c) => ({
        field: FIELD_LABELS[c.field],
        source: c.source,
        check: c.check ?? null,
      })),
      toCheck: plan.toCheck,
      model: modelReport.find((entry) => entry.id === plan.id) ?? null,
      written: written.includes(plan.id),
      failed: failed.includes(plan.id),
    })),
  }
  await mkdir(outDir, { recursive: true })
  await writeFile(
    path.join(outDir, 'opisz-szkice-ostatni.json'),
    `${JSON.stringify(summary, null, 1)}\n`,
  )
}

if (!apply) {
  await writeSummary([], [])
  console.log('\nNa sucho: nic nie zapisano. Zapis: npm run opisz:szkice -- --apply')
  process.exit(0)
}

type RunEntry = {
  id: number
  before: Record<string, unknown>
  after: Record<string, string>
  dropped: string[]
}
const run: RunEntry[] = []
const failed: number[] = []
let errors = 0
for (const plan of toWrite) {
  try {
    // Świeży odczyt tuż przed zapisem: pole poprawione w panelu w międzyczasie zostaje nietknięte.
    const fresh = await api<DraftCard>(`products/${plan.id}?draft=true&depth=0`)
    if (fresh._status !== 'draft') {
      console.log(`! #${plan.id}: karta nie jest już szkicem – pomijam`)
      continue
    }
    const data = patchData(plan) as Record<string, string>
    const dropped = Object.keys(data).filter(
      (field) => !stillOpen(fresh, field as keyof typeof FIELD_LABELS),
    )
    if (dropped.includes('name')) dropped.push('slug')
    for (const field of dropped) delete data[field]
    if (!Object.keys(data).length) {
      console.log(`= #${plan.id}: wszystkie pola uzupełnione w międzyczasie – nic nie zapisuję`)
      continue
    }
    const before = Object.fromEntries(
      Object.keys(data).map((field) => [field, fresh[field as keyof DraftCard] ?? null]),
    )
    const saved = await api<{ doc: DraftCard }>(`products/${plan.id}?draft=true&depth=0`, {
      method: 'PATCH',
      body: data,
    })
    if (saved.doc?._status && saved.doc._status !== 'draft')
      console.log(`! #${plan.id}: odpowiedź ma status ${saved.doc._status} – sprawdź w panelu`)
    run.push({ id: plan.id, before, after: data, dropped: [...new Set(dropped)] })
    console.log(
      `~ #${plan.id}: zapisane (szkic): ${Object.keys(data)
        .map((f) => FIELD_LABELS[f as keyof typeof FIELD_LABELS])
        .join(
          ', ',
        )}${dropped.length ? ` · pominięte (zmienione w panelu): ${[...new Set(dropped)].join(', ')}` : ''}`,
    )
  } catch (error) {
    errors += 1
    failed.push(plan.id)
    console.log(
      `! #${plan.id}: zapis nie przeszedł: ${error instanceof Error ? error.message : error}`,
    )
  }
}
if (run.length) {
  await mkdir(outDir, { recursive: true })
  const logPath = path.join(
    outDir,
    `opisz-szkice-run-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  await writeFile(logPath, `${JSON.stringify({ site, run }, null, 1)}\n`)
  console.log(`Przebieg zapisany (stare i nowe wartości): ${logPath}`)
}
await writeSummary(
  run.map((entry) => entry.id),
  failed,
)
console.log('Publikacja zostaje po Twojej stronie: obejrzyj szkice w panelu i opublikuj ręcznie.')
process.exit(errors ? 1 : 0)
