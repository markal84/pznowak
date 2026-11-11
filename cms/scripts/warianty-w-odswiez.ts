/**
 * Odświeża `seed/warianty/warianty-w.json` z zapisanego stanu generowania (`data/warianty-w/stan.json`), bez wołania Codexa.
 * Wariant trafia na listę, gdy przyjęto zdjęcie karty (reguła Kamy); wpisy już wpięte w `warianty.json` są pomijane.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { loadSpecs } from './warianty-v-logic'
import { jobs as allJobs, loadConfig, PROPOSALS_PATH, proposals, REPO_ROOT } from './wizualizacje-w-logic'

const statePath = path.join(REPO_ROOT, 'data', 'warianty-w', 'stan.json')
if (!existsSync(statePath)) throw new Error(`Brak ${statePath}`)
const state = JSON.parse(readFileSync(statePath, 'utf8')) as { jobs: Record<string, { accepted: unknown } | undefined> }
const config = loadConfig()
const accepted = new Set(allJobs(config).filter((job) => state.jobs[job.id]?.accepted).map((job) => job.id))
const published = new Set(loadSpecs().flatMap((spec) => spec.variants.flatMap((variant) => variant.files)))
const waiting = proposals(config, accepted)
  .map((entry) => ({ ...entry, variants: entry.variants.filter((variant) => !variant.files.every((file) => published.has(file))) }))
  .filter((entry) => entry.variants.length > 0)
if (waiting.length) writeFileSync(PROPOSALS_PATH, `${JSON.stringify(waiting, null, 2)}\n`)
else rmSync(PROPOSALS_PATH, { force: true })
console.log(`warianty-w.json: ${waiting.reduce((sum, entry) => sum + entry.variants.length, 0)} wariantów czeka na wpięcie (${waiting.length} kart).`)
