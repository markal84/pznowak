'use client'

import Link from 'next/link'
import { useEffect, useSyncExternalStore } from 'react'
import { catalogReturnHref, markCatalogReturn } from '@/lib/catalog-return'

const noSubscribe = () => () => {}

/** Okruszek „Pierścionki” na karcie: prowadzi na stronę listy (i filtry), z której przyszedłeś, do tego samego rzędu. */
export default function CatalogCrumb({ slug }: { slug: string }) {
  // Na serwerze zwykły adres listy; po hydracji adres z zapisu w sessionStorage.
  const href = useSyncExternalStore(
    noSubscribe,
    () => catalogReturnHref(slug),
    () => '/pierscionki',
  )
  useEffect(() => {
    // „Wstecz” przeglądarki też ma wrócić do rzędu klikniętego pierścionka.
    window.addEventListener('popstate', markCatalogReturn)
    return () => window.removeEventListener('popstate', markCatalogReturn)
  }, [])
  return (
    <Link href={href} onClick={markCatalogReturn}>
      Pierścionki
    </Link>
  )
}
