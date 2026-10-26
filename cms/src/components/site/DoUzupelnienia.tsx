import type { ReactNode } from 'react'
import { showPlaceholders } from '@/lib/placeholders'

type DoUzupelnieniaProps = {
  /** Znacznik widoczny na podglądzie, np. „[TERMIN, np. 4–6 tygodni]” albo całe zdanie z takim znacznikiem. */
  children: ReactNode
  /** Wersja produkcyjna: neutralny tekst albo `null` (pominięcie fragmentu, zdania, wiersza lub sekcji). */
  fallback?: ReactNode
  /** `div` dla bloków i całych sekcji, `span` (domyślnie) dla fragmentów zdania. */
  as?: 'span' | 'div'
}

/**
 * Jeden mechanizm dla wszystkich miejsc „do uzupełnienia” (zlecenie I, pkt 7): na podglądzie wyróżniony znacznik,
 * na produkcji `fallback` (domyślnie nic). Szczegóły i lista miejsc: `src/lib/placeholders.ts`.
 */
export default function DoUzupelnienia({ children, fallback = null, as: Tag = 'span' }: DoUzupelnieniaProps) {
  if (!showPlaceholders()) return <>{fallback}</>
  return (
    <Tag className={Tag === 'div' ? 'todo todo-block' : 'todo'} data-todo="">
      {children}
    </Tag>
  )
}
