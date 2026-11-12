import type { Payload, PayloadRequest } from 'payload'

export type SortOrderItem = { id: number | string; sortOrder?: null | number }
export type SortOrderChange = { id: number | string; from: number; to: number }

const valueOf = (item: SortOrderItem) => (typeof item.sortOrder === 'number' ? item.sortOrder : 0)

/**
 * Przeniesienie pierścionka `movedId` na miejsce `target` tak, jak widać to na liście: staje tuż przed kartą, która
 * teraz ma numer `target` (za wszystkimi z mniejszym numerem), a potem cała lista dostaje numery 0, 1, 2 … po kolei.
 * Dzięki temu nie ma powtórzeń ani luk, także po starym miejscu. Przy przenoszeniu w górę listy karta dostaje dokładnie
 * `target`; przy przenoszeniu w dół o 1 mniej, bo luka po niej się domyka (z 7 na 12 za kartę z numerem 11 → 11).
 * Zwraca nowy numer przenoszonej karty i zmiany pozostałych (tylko te, których wartość się zmienia).
 */
export function planMove(
  items: SortOrderItem[],
  movedId: number | string,
  target: number,
): { movedTo: number; changes: SortOrderChange[] } {
  const others = items
    .filter((item) => String(item.id) !== String(movedId))
    .sort((a, b) => valueOf(a) - valueOf(b) || Number(a.id) - Number(b.id))
  const before = others.filter((item) => valueOf(item) < target).length
  const ordered: (SortOrderItem | null)[] = [...others.slice(0, before), null, ...others.slice(before)]
  const changes: SortOrderChange[] = []
  let movedTo = before
  ordered.forEach((item, index) => {
    if (item === null) movedTo = index
    else if (valueOf(item) !== index) changes.push({ id: item.id, from: valueOf(item), to: index })
  })
  return { movedTo, changes }
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
 * Hook `afterChange` kolekcji Pierścionki: gdy zmienia się „Kolejność”, przenosi kartę (`planMove`) i numeruje resztę
 * po kolei. Zapis przez `writeSortOrder`, więc nie wywołuje pętli ani nie publikuje cudzych szkiców. Zmienia też
 * `doc.sortOrder`, żeby formularz po zapisie pokazał numer, który karta naprawdę dostała.
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
  // Ten sam numer co wcześniej: przesuwamy tylko wtedy, gdy inna karta ma go także (np. po zmianie sprzed tej funkcji).
  const unchanged = Boolean(previousDoc) && previousDoc?.sortOrder === doc.sortOrder
  const taken = found.docs.some((item) => String(item.id) !== String(doc.id) && item.sortOrder === doc.sortOrder)
  if (unchanged && !taken) return
  const { movedTo, changes } = planMove(found.docs, doc.id, doc.sortOrder)
  for (const change of changes) await writeSortOrder(payload, change.id, change.to, req)
  if (movedTo !== doc.sortOrder) {
    await writeSortOrder(payload, doc.id, movedTo, req)
    doc.sortOrder = movedTo
  }
}
