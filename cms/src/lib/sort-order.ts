import type { Payload, PayloadRequest } from 'payload'

export type SortOrderItem = { id: number | string; sortOrder?: null | number }
export type SortOrderChange = { id: number | string; from: number; to: number }

const valueOf = (item: SortOrderItem) => (typeof item.sortOrder === 'number' ? item.sortOrder : 0)

/**
 * Pierścionek `movedId` dostaje wartość `target`. Pozostałe od `target` w górę przesuwają się o tyle, ile trzeba, żeby
 * wartości były unikalne (9, 9, 9 → 9, 10, 11), a luka po poprzednim miejscu pierścionka sama się domyka, bo przesunięcie
 * kończy się na pierwszej wolnej liczbie. Przy równych wartościach zostaje dotychczasowa kolejność (po `id`).
 * Zwraca tylko te karty, których wartość się zmienia.
 */
export function planInsert(items: SortOrderItem[], movedId: number | string, target: number): SortOrderChange[] {
  const others = items
    .filter((item) => item.id !== movedId)
    .sort((a, b) => valueOf(a) - valueOf(b) || Number(a.id) - Number(b.id))
  const changes: SortOrderChange[] = []
  let taken = target
  for (const item of others) {
    const value = valueOf(item)
    if (value < target) continue
    if (value > taken) break
    taken += 1
    changes.push({ id: item.id, from: value, to: taken })
  }
  return changes
}

/** Numeracja 0, 1, 2 … po kolei (do jednorazowego uporządkowania); remisy rozstrzyga `id`. */
export function planNormalize(items: SortOrderItem[]): SortOrderChange[] {
  return [...items]
    .sort((a, b) => valueOf(a) - valueOf(b) || Number(a.id) - Number(b.id))
    .flatMap((item, index) => (valueOf(item) === index ? [] : [{ id: item.id, from: valueOf(item), to: index }]))
}

/**
 * Zapisuje „Kolejność” jednej karty bezpośrednio w bazie (bez hooków, nowych wersji i zmiany statusu): w tabeli kart
 * i w jej najnowszej wersji, opublikowanej albo szkicu. Lista w panelu przy włączonych szkicach czyta najnowsze wersje,
 * a formularz edycji też startuje z najnowszej wersji, więc bez tego panel pokazywałby (i przy zapisie przywracał) stare liczby.
 */
export async function writeSortOrder(payload: Payload, id: number | string, value: number, req?: PayloadRequest): Promise<void> {
  await payload.db.updateOne({ collection: 'products', id, data: { sortOrder: value }, req, returning: false })
  const latest = await payload.db.findVersions({
    collection: 'products',
    limit: 0,
    pagination: false,
    req,
    where: { and: [{ parent: { equals: id } }, { latest: { equals: true } }] },
  })
  for (const version of latest.docs) {
    if ((version.version as { sortOrder?: null | number })?.sortOrder === value) continue
    await payload.db.updateVersion({
      collection: 'products',
      id: version.id,
      versionData: { version: { sortOrder: value } } as never,
      req,
      returning: false,
    })
  }
}

/**
 * Hook `afterChange` kolekcji Pierścionki: gdy zmienia się „Kolejność”, odsuwa pozostałe karty, żeby wartość była unikalna.
 * Zapis przez `writeSortOrder`, więc nie wywołuje pętli ani nie publikuje cudzych szkiców.
 */
export async function shiftOtherProducts({
  doc,
  previousDoc,
  req,
}: {
  doc: { id: number | string; sortOrder?: null | number }
  previousDoc?: null | { sortOrder?: null | number }
  req: PayloadRequest
}): Promise<void> {
  if (req.context?.skipSortOrderShift) return
  if (typeof doc.sortOrder !== 'number') return
  if (previousDoc && previousDoc.sortOrder === doc.sortOrder) return

  const { payload } = req
  const found = await payload.find({
    collection: 'products',
    depth: 0,
    draft: false,
    pagination: false,
    overrideAccess: true,
    select: { sortOrder: true },
    req,
  })
  for (const change of planInsert(found.docs, doc.id, doc.sortOrder)) {
    await writeSortOrder(payload, change.id, change.to, req)
  }
}
