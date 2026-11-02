'use client'

import { useRowLabel } from '@payloadcms/ui'

import { SWATCHES } from '@/lib/stone-variants'

type Row = { stone?: string | null; swatch?: string | null; isVisualization?: boolean | null }

/** Nagłówek wiersza wariantu w panelu: „Szmaragd i diamenty · zielony · wizualizacja” zamiast „Wariant 02”. */
export function StoneVariantRowLabel() {
  const { data, rowNumber } = useRowLabel<Row>()
  const swatch = SWATCHES.find(({ id }) => id === data?.swatch)
  const parts = [
    data?.stone?.trim() || `Wariant ${String((rowNumber ?? 0) + 1).padStart(2, '0')}`,
    swatch?.label.toLowerCase(),
    data?.isVisualization === false ? 'zdjęcie' : 'wizualizacja',
  ].filter(Boolean)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {swatch ? (
        <span
          aria-hidden="true"
          style={{ width: 12, height: 12, borderRadius: '50%', background: swatch.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)' }}
        />
      ) : null}
      {parts.join(' · ')}
    </span>
  )
}
