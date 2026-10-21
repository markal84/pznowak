'use client'

import { useEffect } from 'react'

/** Znacznik dla testów e2e: strona jest gotowa na interakcję dopiero po hydracji Reacta. */
export default function HydrationFlag() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true'
  }, [])
  return null
}
