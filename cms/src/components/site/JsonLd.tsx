import { serializeJsonLd } from '@/lib/structured-data'

/** Dane strukturalne dla wyszukiwarek; nic nie jest widoczne na stronie. */
export default function JsonLd({ data }: { data: unknown }) {
  return <script dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} type="application/ld+json" />
}
