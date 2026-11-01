import type { CSSProperties, ReactNode } from 'react'
import { showPlaceholders } from '@/lib/placeholders'

type DoUzupelnieniaProps = {
  /** Znacznik widoczny na podglądzie, np. „[TERMIN, np. 4–6 tygodni]” albo całe zdanie z takim znacznikiem. */
  children: ReactNode
  /** Wersja produkcyjna: neutralny tekst albo `null` (pominięcie fragmentu, zdania, wiersza lub sekcji). */
  fallback?: ReactNode
  /** `div` dla bloków i całych sekcji, `span` (domyślnie) dla fragmentów zdania. */
  as?: 'span' | 'div'
  /** Styl ramki na podglądzie, np. gdy ramka jest elementem flex (na produkcji ramki nie ma). */
  style?: CSSProperties
}

/**
 * Jeden mechanizm dla wszystkich miejsc „do uzupełnienia” (zlecenie I, pkt 7): na podglądzie wyróżniony znacznik,
 * na produkcji `fallback` (domyślnie nic). Szczegóły i lista miejsc: `src/lib/placeholders.ts`.
 */
export default function DoUzupelnienia({ children, fallback = null, as: Tag = 'span', style }: DoUzupelnieniaProps) {
  if (!showPlaceholders()) return <>{fallback}</>
  return (
    <Tag className={Tag === 'div' ? 'todo todo-block' : 'todo'} data-todo="" style={style}>
      {children}
    </Tag>
  )
}
