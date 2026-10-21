import type { UIFieldServerComponent } from 'payload'

import { formatBytes, TYPE_LABEL, type DetectedType } from '@/lib/attachments/rules'
import { listAttachments, type AttachmentRow, type AttachmentState } from '@/lib/attachments/store'

/**
 * Zdjęcia od klienta w widoku zgłoszenia. Obrazy idą przez `/api/zgloszenia/zalaczniki/[id]` (sprawdzenie sesji
 * panelu, prywatny magazyn), nigdy przez adres magazynu. Pokazujemy też pliki odrzucone i niedostarczone,
 * żeby pracownia wiedziała, czego brakuje.
 */

const STATE_NOTE: Record<Exclude<AttachmentState, 'stored'>, string> = {
  pending: 'Czeka na przesłanie',
  rejected: 'Odrzucony',
  skipped: 'Klient nie zdołał go wysłać',
  missing: 'Nie dotarł',
  expired: 'Usunięty po okresie przechowywania',
}

const REJECT_NOTE: Record<string, string> = {
  unsupported_type: 'to nie było zdjęcie w obsługiwanym formacie',
  too_large_dimensions: 'zbyt duże wymiary',
  corrupt: 'plik uszkodzony albo nieczytelny',
  too_large: 'plik większy niż zapowiedziany',
}

const hasRole = (user: unknown) => {
  const roles = (user as { roles?: string[] | null } | null)?.roles ?? []
  return roles.includes('admin') || roles.includes('editor')
}

function describe(row: AttachmentRow): string {
  const parts = [`Plik ${row.slot}`]
  if (row.originalName) parts.push(`„${row.originalName}”`)
  if (row.detectedType && row.detectedType in TYPE_LABEL)
    parts.push(`z ${TYPE_LABEL[row.detectedType as DetectedType]}`)
  if (row.width && row.height) parts.push(`${row.width}×${row.height}`)
  if (row.bytes) parts.push(formatBytes(row.bytes))
  return parts.join(' · ')
}

export const AttachmentsGallery: UIFieldServerComponent = async ({ id, payload, req }) => {
  if (!id || !hasRole(req.user)) return null
  let rows: AttachmentRow[]
  try {
    rows = await listAttachments(payload, Number(id))
  } catch {
    return <p>Nie udało się wczytać zdjęć.</p>
  }
  if (!rows.length) return null

  return (
    <div className="field-type" style={{ marginBottom: 'var(--base)' }}>
      <span className="field-label">Zdjęcia od klienta</span>
      <ul
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
          listStyle: 'none',
          margin: '8px 0 0',
          padding: 0,
        }}
      >
        {rows.map((row) => {
          const url = `/api/zgloszenia/zalaczniki/${row.id}`
          return (
            <li key={row.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {row.state === 'stored' ? (
                <a href={url} rel="noopener noreferrer" target="_blank" title="Otwórz w pełnym rozmiarze">
                  {/* eslint-disable-next-line @next/next/no-img-element -- obraz z chronionego endpointu, bez optymalizacji */}
                  <img
                    alt={`Zdjęcie ${row.slot} od klienta`}
                    loading="lazy"
                    src={`${url}?rozmiar=miniatura`}
                    style={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      objectFit: 'cover',
                      background: 'var(--theme-elevation-100)',
                      display: 'block',
                    }}
                  />
                </a>
              ) : (
                <div
                  style={{
                    aspectRatio: '1 / 1',
                    display: 'grid',
                    placeItems: 'center',
                    padding: 12,
                    textAlign: 'center',
                    background: 'var(--theme-elevation-50)',
                    border: '1px dashed var(--theme-elevation-250)',
                  }}
                >
                  {STATE_NOTE[row.state]}
                  {row.state === 'rejected' && row.rejectReason
                    ? `: ${REJECT_NOTE[row.rejectReason] ?? row.rejectReason}`
                    : ''}
                </div>
              )}
              <span style={{ fontSize: 13, lineHeight: 1.4, wordBreak: 'break-word' }}>
                {describe(row)}
              </span>
            </li>
          )
        })}
      </ul>
      <p style={{ fontSize: 13, opacity: 0.75, marginTop: 8 }}>
        Zdjęcia służą tylko do wyceny. Pliki zapisujemy od nowa (bez danych o miejscu i aparacie), oryginalna nazwa
        to tylko podpis.
      </p>
    </div>
  )
}
