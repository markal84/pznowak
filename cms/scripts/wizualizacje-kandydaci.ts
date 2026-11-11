/**
 * Arkusz do oceny ręcznej (bez Codexa): dla każdego nieprzyjętego obrazu wybranych fasonów (bez białego diamentu)
 * do 2 najlepszych prób po score Terry – spośród wszystkich prób, także poprawek – które przeszły kontrolę automatyczną.
 * Próba bez poprawki, odrzucona głównie za kolor (`fixQualifies` bez progu score), dostaje obok wersję po łagodnej
 * poprawce, liczoną lokalnie i nieocenianą (`proby/<job>-<próba>-lagodna-kompozycja.png`, do `--przyjmij`).
 *
 *   npm run warianty:kandydaci -- --dane /Volumes/crucial/projects/pznowak-cms/data
 *   opcje: --fasony iole,merope,… (domyślnie lista z zlecenia), --data RRRR-MM-DD
 *
 * Wynik: `seed/warianty/kandydaci-<data>.html` i obrazy webp w `seed/warianty/kandydaci/`. Przyjęcie wybranych:
 * `npm run warianty:wizualizacje -- --przyjmij <job>:<próba>[,…]`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

import { WARIANTY_DIR } from './warianty-v-logic'
import { attemptToken, type Check, firstExisting, jobs, loadConfig, REPO_ROOT, variantName } from './wizualizacje-w-logic'
import { MASK_WIDTH, pasteCutout } from './wizualizacje-wycinek-obraz'
import { cropBox, fixQualifies, stoneFixOptions } from './wizualizacje-wycinek-logic'

const arg = (name: string) => {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const DEFAULT_DESIGNS = 'iole,merope,phoebe,iris,ione,thalia,amphitrite,eos,chryse,chloris,delos,harmonia'
const designs = (arg('--fasony') ?? DEFAULT_DESIGNS).split(',').filter(Boolean)
const dataDir = path.resolve(arg('--dane') ?? path.join(REPO_ROOT, 'data'))
const workDir = path.join(dataDir, 'warianty-w')
const date = arg('--data') ?? new Date().toISOString().slice(0, 10)
const outDir = path.join(WARIANTY_DIR, 'kandydaci')
const sheetPath = path.join(WARIANTY_DIR, `kandydaci-${date}.html`)

type Attempt = {
  n: number
  file: string
  technique?: 'wycinek' | 'poprawka'
  cutout?: { ok: boolean }
  placement?: { alignment?: { scale: number; dx: number; dy: number } } | null
  check: Check | null
  invalid?: boolean
  source?: { file: string }
}
type State = { jobs: Record<string, { attempts: Attempt[]; accepted: string | null; earlier?: Attempt[] }> }
const state: State = JSON.parse(readFileSync(path.join(workDir, 'stan.json'), 'utf8'))
const config = loadConfig()

// obrazy kandydatów od nowa; prototypy (`celaeno-…-prototyp-*`) robi osobny skrypt – zostają
mkdirSync(outDir, { recursive: true })
for (const file of readdirSync(outDir)) if (!file.includes('-prototyp-')) rmSync(path.join(outDir, file), { force: true })

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** Kwadrat zbliżenia: obszar, gdzie kompozycja różni się od oryginału, z marginesem 60 %, co najmniej 256 px. */
async function closeBox(source: string, merged: string) {
  const meta = await sharp(source).metadata()
  const [W, H] = [meta.width!, meta.height!]
  const a = await sharp(source).removeAlpha().raw().toBuffer()
  const b = await sharp(merged).resize(W, H, { fit: 'fill' }).removeAlpha().raw().toBuffer()
  let [x0, y0, x1, y1] = [W, H, -1, -1]
  for (let i = 0; i < W * H; i++) {
    if (Math.abs(a[i * 3] - b[i * 3]) + Math.abs(a[i * 3 + 1] - b[i * 3 + 1]) + Math.abs(a[i * 3 + 2] - b[i * 3 + 2]) < 24) continue
    const x = i % W
    const y = (i - x) / W
    ;[x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)]
  }
  if (x1 < 0) return { left: 0, top: 0, width: Math.min(W, H), height: Math.min(W, H) }
  const side = Math.min(W, H, Math.max(256, Math.round(Math.max(x1 - x0, y1 - y0) * 1.6)))
  const left = Math.min(W - side, Math.max(0, Math.round((x0 + x1) / 2 - side / 2)))
  const top = Math.min(H - side, Math.max(0, Math.round((y0 + y1) / 2 - side / 2)))
  return { left, top, width: side, height: side }
}

const written = new Map<string, string>()
async function webp(input: string, name: string, box?: { left: number; top: number; width: number; height: number }) {
  const key = `${input}|${JSON.stringify(box ?? null)}`
  if (written.has(key)) return written.get(key)!
  const out = path.join(outDir, `${name}.webp`)
  let img = sharp(input)
  img = box ? img.extract(box).resize(440, 440) : img.resize({ width: 760, withoutEnlargement: true })
  await img.webp({ quality: box ? 80 : 76 }).toFile(out)
  const rel = `kandydaci/${name}.webp`
  written.set(key, rel)
  return rel
}

type Card = { token: string; label: string; score: number | null; reason: string; original: string; close: string; full: string; local?: boolean }
type Row = { id: string; name: string; cards: Card[]; note?: string }
const rows: Row[] = []
let localFixes = 0

for (const job of jobs(config, designs)) {
  if (job.stone.kontrola?.bialy || job.stone.key.includes('bialy')) continue
  const entry = state.jobs[job.id]
  if (entry?.accepted) continue
  const source = firstExisting(dataDir, job.zrodlo)
  const row: Row = { id: job.id, name: `${job.design.name} – ${variantName(job)}${job.photo > 1 ? `, zdjęcie ${job.photo}` : ''}`, cards: [] }
  rows.push(row)
  if (!source) {
    row.note = 'brak zdjęcia źródłowego'
    continue
  }
  const history = entry ? [...(entry.earlier ?? []), ...entry.attempts] : []
  const best = history
    .filter((a) => a.check && !a.invalid && (a.cutout?.ok ?? true) && existsSync(path.join(workDir, a.file)))
    .sort((a, b) => b.check!.score - a.check!.score)
    .slice(0, 2)
  if (!best.length) {
    row.note = history.length ? `brak kandydata: wszystkie próby (${history.length}) odpadły na kontroli automatycznej` : 'brak prób'
    continue
  }
  for (const attempt of best) {
    const token = attemptToken(job.id, attempt.file)!
    const merged = path.join(workDir, attempt.file)
    const box = await closeBox(source, merged)
    const card: Card = {
      token,
      label: attempt.technique === 'poprawka' ? `próba ${token} (poprawka)` : `próba ${token}`,
      score: attempt.check!.score,
      reason: attempt.check!.reason_pl,
      original: await webp(source, `${job.id}-${token}-oryginal`, box),
      close: await webp(merged, `${job.id}-${token}-zblizenie`, box),
      full: await webp(merged, `${job.id}-${token}-calosc`),
    }
    row.cards.push(card)
    // łagodna poprawka lokalna dla próby bez poprawki, odrzuconej głównie za kolor
    if (attempt.technique !== 'wycinek' || !job.hint || !fixQualifies({ ...attempt.check!, score: 100 }).ok) continue
    const raw = merged.replace(/-kompozycja\.png$/, '.png')
    const maskFile = path.join(workDir, 'wycinek', `${job.photoKey}-maska.png`)
    if (!existsSync(raw) || !existsSync(maskFile)) continue
    const mask = new Uint8Array(await sharp(maskFile).extractChannel(0).raw().toBuffer())
    const meta = await sharp(source).metadata()
    const cut = cropBox(mask, MASK_WIDTH, meta.width!, meta.height!)
    const output = raw.replace(/\.png$/, '-lagodna-kompozycja.png')
    const pasted = await pasteCutout(
      { source, generated: raw, box: cut, mask, maskWidth: MASK_WIDTH, output, closeOriginal: path.join(workDir, 'wycinek', `${job.photoKey}-zblizenie-lagodna.png`), closeResult: raw.replace(/\.png$/, '-lagodna-zblizenie.png') },
      job.hint.odcien,
      job.stone.kontrola,
      stoneFixOptions(job.stone.key, job.hint.odcien, 1),
    )
    const before = attempt.placement?.alignment
    const now = pasted.alignment
    // kadr wycinka zmienił się od tej próby (np. nowy „obszar”) – wersja lokalna byłaby przesunięta
    if (!pasted.verdict.ok || (before && (Math.abs(before.scale - now.scale) > 0.005 || Math.abs(before.dx - now.dx) > 2 || Math.abs(before.dy - now.dy) > 2))) {
      rmSync(output, { force: true })
      continue
    }
    localFixes++
    row.cards.push({
      token: `${token}-lagodna`,
      label: `próba ${token} po łagodnej poprawce (lokalnie, bez oceny)`,
      score: null,
      reason: `Wersja próby ${token} po łagodnej poprawce koloru przy krawędzi (lokalnie, Terra jej nie oceniała). Zarzut źródła: ${fixQualifies({ ...attempt.check!, score: 100 }).why_pl}`,
      original: card.original,
      close: await webp(output, `${job.id}-${token}-lagodna-zblizenie`, box),
      full: await webp(output, `${job.id}-${token}-lagodna-calosc`),
      local: true,
    })
  }
}

const cardHtml = (row: Row, c: Card) => `<article class="card${c.local ? ' local' : ''}">
  <header><code>${esc(row.id)}:${esc(c.token)}</code><span class="score">${c.score === null ? 'bez oceny' : `score ${c.score}`}</span></header>
  <div class="pair"><figure><img loading="lazy" src="${esc(c.original)}" alt="oryginał – zbliżenie"><figcaption>oryginał</figcaption></figure>
  <figure><img loading="lazy" src="${esc(c.close)}" alt="${esc(c.label)} – zbliżenie"><figcaption>${esc(c.label)}</figcaption></figure></div>
  <figure class="full"><img loading="lazy" src="${esc(c.full)}" alt="${esc(c.label)} – cała kompozycja"><figcaption>cała kompozycja</figcaption></figure>
  <p>${esc(c.reason)}</p>
</article>`
const sections = rows
  .map(
    (row) => `<section><h2>${esc(row.name)} <small>${esc(row.id)}</small></h2>${
      row.note ? `<p class="note">${esc(row.note)}</p>` : `<div class="cards">${row.cards.map((c) => cardHtml(row, c)).join('\n')}</div>`
    }</section>`,
  )
  .join('\n')
const candidates = rows.reduce((sum, row) => sum + row.cards.length, 0)
// prototyp Celaeno (przemalowanie lokalne drobnych diamentów, `wizualizacje-celaeno-prototyp.ts`), jeśli jest
const proto = (name: string) => `kandydaci/celaeno-szafir-prototyp-${name}.webp`
const prototype = existsSync(path.join(WARIANTY_DIR, proto('porownanie')))
  ? `<section class="proto"><h2>Prototyp: Celaeno – szafir granatowy <small>przemalowanie lokalne, bez generatora, zdjęcie 1</small></h2>
<p class="lead">Drobne diamenty pavé przemalowane w Lab (odcień i nasycenie ze wzorców szafiru granatowego, jasność L' = 5 + 0.32·L,
najjaśniejsze błyski zostają jaśniejsze). Maska: kamienie bezbarwne w czterech pasach wzdłuż rzędów, złoto wykluczone. To podgląd do oceny metody – nie do przyjęcia.</p>
<div class="cards">
<article class="card local"><header><code>celaeno-szafir-granatowy (prototyp)</code><span class="score">bez oceny</span></header>
<figure><img loading="lazy" src="${proto('porownanie')}" alt="Celaeno – oryginał i prototyp z szafirami"><figcaption>oryginał | prototyp</figcaption></figure>
<figure class="full"><img loading="lazy" src="${proto('zblizenie')}" alt="Celaeno – zbliżenie rzędów pavé przed i po"><figcaption>zbliżenie trzech rzędów pavé: oryginał | prototyp</figcaption></figure></article>
<article class="card local"><header><code>maska</code><span class="score">czerwone = przemalowane</span></header>
<figure><img loading="lazy" src="${proto('maska')}" alt="Celaeno – maska kamieni na zdjęciu"><figcaption>czerwone: maska kamieni, żółte: granice pasów rzędów pavé</figcaption></figure>
<figure class="full"><img loading="lazy" src="${proto('wynik')}" alt="Celaeno – prototyp, całe zdjęcie"><figcaption>cały kadr po przemalowaniu</figcaption></figure></article>
</div></section>`
  : ''
const html = `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kandydaci wizualizacji ${esc(date)}</title>
<style>
body{margin:0;padding:24px 16px;font:15px/1.5 system-ui,sans-serif;background:#faf8f4;color:#2a2722}
h1{font-size:22px;margin:0 0 8px}.lead{max-width:75ch;margin:0 0 8px}.lead code{background:#fff;border:1px solid #e7e2d8;padding:1px 5px;border-radius:4px}
h2{font-size:18px;margin:36px 0 10px}h2 small{font-weight:400;color:#8a857b;font-size:13px;margin-left:6px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr));gap:14px}
.card{background:#fff;border:1px solid #e7e2d8;border-radius:8px;padding:10px}.card.local{border-style:dashed;border-color:#b9a77a}
.card header{display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-bottom:8px}
.card code{font-size:13px;word-break:break-all;user-select:all}.score{font-weight:600;white-space:nowrap}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:6px}figure{margin:0}img{display:block;width:100%;height:auto;border-radius:4px}
figcaption{font-size:12px;color:#6b665d;padding:2px 0}.full{margin-top:6px}.card p{font-size:13px;margin:8px 0 0;color:#3d3a34}
.note{color:#8a857b}
</style></head><body>
<h1>Kandydaci wizualizacji do oceny ręcznej</h1>
<p class="lead"><b>Zapisz mi nazwy, które przyjmujesz</b>, np. <code>iole-szmaragd-stonowany:w6</code>. Każda karta to jedna próba:
zbliżenie oryginału obok wyniku, pod spodem cała kompozycja, na dole ocena Terry. Karty z przerywaną ramką to wersje po łagodnej
poprawce koloru zrobione lokalnie – Terra ich nie oceniała.</p>
<p class="lead">${esc(date)} · obrazów: ${rows.length} · kandydatów: ${candidates} (w tym lokalnych poprawek: ${localFixes}) · obrazy bez kandydata: ${rows.filter((r) => r.note).length}.
Przyjęcie: <code>npm run warianty:wizualizacje -- --przyjmij &lt;nazwa&gt;[,&lt;nazwa&gt;…]</code></p>
${prototype}
${sections}
</body></html>
`
writeFileSync(sheetPath, html)
console.log(`Arkusz: ${path.relative(REPO_ROOT, sheetPath)} · obrazów ${rows.length} · kandydatów ${candidates} (lokalnych poprawek ${localFixes}) · bez kandydata ${rows.filter((r) => r.note).length}`)
