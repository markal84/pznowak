'use client'

import { useId, useState } from 'react'
import { formatNumberPl, ringSize, type RingSizeInput } from '@/lib/ring-size'

const MODES: { id: RingSizeInput; label: string; unit: string; hint: string; placeholder: string; step: string }[] = [
  {
    id: 'srednica',
    label: 'Średnica wewnętrzna pierścionka',
    unit: 'mm',
    hint: 'Zmierz linijką albo suwmiarką wnętrze pierścionka w najszerszym miejscu, od krawędzi do krawędzi.',
    placeholder: 'np. 16,5',
    step: '0.1',
  },
  {
    id: 'obwod',
    label: 'Obwód palca',
    unit: 'mm',
    hint: 'Owiń palec paskiem papieru w miejscu, gdzie ma leżeć pierścionek, zaznacz styk i zmierz długość paska.',
    placeholder: 'np. 52',
    step: '0.5',
  },
  {
    id: 'us',
    label: 'Rozmiar amerykański (US)',
    unit: 'US',
    hint: 'Rozmiar z zagranicznego sklepu albo z wewnętrznej strony pierścionka kupionego w USA.',
    placeholder: 'np. 6,5',
    step: '0.25',
  },
]

const parse = (text: string) => Number.parseFloat(text.replace(',', '.').trim())

/**
 * Kalkulator rozmiaru pierścionka: z jednej zmierzonej wielkości liczy rozmiar polski, obwód, średnicę i rozmiar
 * amerykański (wzory w src/lib/ring-size.ts). Działa w przeglądarce, niczego nie wysyła.
 */
export default function RingSizeTool() {
  const id = useId()
  const [mode, setMode] = useState<RingSizeInput>('srednica')
  const [text, setText] = useState('')
  const current = MODES.find((m) => m.id === mode) ?? MODES[0]
  const value = parse(text)
  const result = text.trim() ? ringSize(mode, value) : null
  const invalid = text.trim() !== '' && result === null

  return (
    <div className="size-tool">
      <div aria-label="Co chcesz przeliczyć" className="size-tool-modes" role="group">
        {MODES.map((m) => (
          <button
            aria-pressed={mode === m.id}
            className="chip"
            key={m.id}
            onClick={() => {
              setMode(m.id)
              setText('')
            }}
            type="button"
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="size-tool-field">
        <label htmlFor={`${id}-value`}>{current.label}</label>
        <div className="size-tool-input">
          <input
            aria-describedby={`${id}-hint`}
            aria-invalid={invalid || undefined}
            id={`${id}-value`}
            inputMode="decimal"
            onChange={(event) => setText(event.target.value)}
            placeholder={current.placeholder}
            step={current.step}
            type="text"
            value={text}
          />
          <span aria-hidden="true">{current.unit}</span>
        </div>
        <p className="small" id={`${id}-hint`}>
          {current.hint}
        </p>
      </div>
      <div aria-live="polite" className="size-tool-result">
        {result ? (
          <>
            <p className="size-tool-main">
              <span>Rozmiar polski</span>
              <strong>{result.between ? `${result.between[0]}–${result.between[1]}` : result.pl}</strong>
            </p>
            <dl>
              <div>
                <dt>Obwód wewnętrzny</dt>
                <dd>{formatNumberPl(result.circumferenceMm)} mm</dd>
              </div>
              <div>
                <dt>Średnica wewnętrzna</dt>
                <dd>{formatNumberPl(result.diameterMm)} mm</dd>
              </div>
              <div>
                <dt>Rozmiar europejski</dt>
                <dd>{result.eu}</dd>
              </div>
              <div>
                <dt>Rozmiar amerykański</dt>
                <dd>ok. {formatNumberPl(result.us, 2)}</dd>
              </div>
            </dl>
            {result.between ? (
              <p className="small">
                Wynik wypada między rozmiarem {result.between[0]} a {result.between[1]}. Przy wąskiej obrączce zwykle lepiej
                sprawdza się mniejszy, przy szerokiej większy. Złotnik potwierdzi to przy zamówieniu.
              </p>
            ) : null}
          </>
        ) : (
          <p className="small">
            {invalid
              ? 'Ta wartość wychodzi poza tabelę rozmiarów (obwód 45–75 mm). Sprawdź, czy wpisujesz milimetry.'
              : 'Wpisz zmierzoną wartość, a pokażemy rozmiar.'}
          </p>
        )}
      </div>
    </div>
  )
}
