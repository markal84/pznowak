import Link from 'next/link'

/**
 * Frazy w treści zgody, które prowadzą do dokumentów (w odmianie, jak w `lib/submissions/options.ts`).
 * Zmiana tekstu zgody wymaga zmiany tej listy.
 */
const LEGAL_LINKS = new Map([
  ['Regulamin', '/regulamin'],
  ['Politykę prywatności', '/polityka-prywatnosci'],
])

/**
 * Tekst zgody z linkami do regulaminu i polityki prywatności. Link otwiera się w nowej karcie,
 * żeby klient nie stracił wpisanego formularza.
 */
export default function ConsentLabel({ text }: { text: string }) {
  const parts = text.split(new RegExp(`(${[...LEGAL_LINKS.keys()].join('|')})`))
  return (
    <>
      {parts.map((part, i) =>
        LEGAL_LINKS.has(part) ? (
          <Link href={LEGAL_LINKS.get(part) ?? '/'} key={i} rel="noopener" target="_blank">
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}
