/**
 * Imiona nowych pierścionków z Facebooka (zlecenie S) i czysta logika zmiany nazw (bez bazy), żeby dało się ją sprawdzić testem.
 * Używa tego `scripts/staging-nazwy-s.ts` (tylko staging) oraz `tests/int/nazwy-s.int.spec.ts`.
 */

export type NameSpec = {
  /** id karty na stagingu (szkice z importu z FB) */
  id: number
  /** Obecna nazwa z importu; karta jest ruszana tylko wtedy, gdy nazwa się zgadza (ktoś mógł już zmienić ją w panelu). */
  oldName: string
  newName: string
  slug: string
}

/** Zatwierdzone przez Marcina (01.11.2026). Imiona z mitologii greckiej jak reszta katalogu. */
export const NAME_SPECS: NameSpec[] = [
  { id: 37, oldName: 'Brylant w szlifie szmaragdowym 0,41 ct', newName: 'Leucothea', slug: 'leucothea' },
  { id: 38, oldName: 'Niebieski diament 0,21 ct w stylu art déco', newName: 'Amphitrite', slug: 'amphitrite' },
  { id: 39, oldName: 'Oliwin w szlifie emerald', newName: 'Chloris', slug: 'chloris' },
  { id: 40, oldName: 'Malinowy turmalin w oprawie halo', newName: 'Erythea', slug: 'erythea' },
  { id: 41, oldName: 'Różowy turmalin w oprawie halo', newName: 'Rhodope', slug: 'rhodope' },
  { id: 42, oldName: 'Ametyst owalny z diamentami', newName: 'Ianthe', slug: 'ianthe' },
  { id: 43, oldName: 'Ametyst w szlifie oktagon z diamentami', newName: 'Iole', slug: 'iole' },
  { id: 44, oldName: 'Agat w owalu z diamentami', newName: 'Rhea', slug: 'rhea' },
  { id: 45, oldName: 'Morganit z diamentami na szynie pavé', newName: 'Eos', slug: 'eos' },
  { id: 46, oldName: 'ETERNITY: kamienie kolorowe i brylanty', newName: 'Aion', slug: 'aion' },
  { id: 47, oldName: 'Pierścionek zaręczynowy klienta (wyspa)', newName: 'Calypso', slug: 'calypso' },
]

/** Moissanity (karty 33 i 34 z zadania L) nie mają jeszcze kart na stagingu; dostają imiona przy imporcie (`scripts/facebook/nazwy-kanon.json`). */
export const MOISSANITE_NAMES = { '2 ct': 'Aethra', '1 ct': 'Hesperia' } as const

/** Dotychczasowa nazwa opisowa jako pierwsze zdanie opisu: bez słowa „klienta”, z kropką na końcu. */
export function descriptiveSentence(oldName: string): string {
  const cleaned = oldName.replace(/\s+klienta\b/iu, '').replace(/\s{2,}/gu, ' ').trim()
  return /[.!?…]$/u.test(cleaned) ? cleaned : `${cleaned}.`
}

/** Dopisuje opisową nazwę na początku opisu, o ile opis jej jeszcze nie zawiera. Reszta tekstu bez zmian. */
export function withDescriptiveName(description: string | null | undefined, oldName: string): string {
  const sentence = descriptiveSentence(oldName)
  const current = (description ?? '').trim()
  const plain = sentence.replace(/[.!?…]$/u, '').toLowerCase()
  if (current.toLowerCase().includes(plain)) return current
  return current ? `${sentence}\n\n${current}` : sentence
}

export type CardState = {
  id: number
  name: string
  slug: string
  description?: string | null
  status?: string | null
  archived?: boolean | null
}

export type RenamePlan =
  | { action: 'zmien'; data: { name: string; slug: string; description: string }; note: string }
  | { action: 'juz'; note: string }
  | { action: 'pomin'; note: string }

/**
 * Decyzja dla jednej karty. `slugOwners`: adres → id karty, która go zajmuje (wszystkie karty na stagingu).
 * Idempotentne: karta z nową nazwą i adresem jest „juz” (nic nie robimy, także gdy po pierwszej próbie została szkicem).
 */
export function planRename(card: CardState | undefined, spec: NameSpec, slugOwners: ReadonlyMap<string, number>): RenamePlan {
  if (!card) return { action: 'pomin', note: `nie ma karty o id ${spec.id} na stagingu` }
  if (card.name === spec.newName) {
    const state = card.status === 'published' ? 'opublikowana' : 'szkic'
    return { action: 'juz', note: `już nazwana „${spec.newName}” (${state}), bez zmian` }
  }
  if (card.name !== spec.oldName) {
    return { action: 'pomin', note: `nazwa „${card.name}” nie zgadza się z „${spec.oldName}” (zmieniona w panelu?), zostawiam` }
  }
  if (card.archived) return { action: 'pomin', note: 'karta zarchiwizowana, zostawiam' }
  const owner = slugOwners.get(spec.slug)
  if (owner !== undefined && owner !== card.id) {
    return { action: 'pomin', note: `adres „${spec.slug}” zajmuje już karta id ${owner}` }
  }
  return {
    action: 'zmien',
    data: { name: spec.newName, slug: spec.slug, description: withDescriptiveName(card.description, spec.oldName) },
    note: `„${card.name}” → „${spec.newName}” (/pierscionki/${spec.slug})`,
  }
}
