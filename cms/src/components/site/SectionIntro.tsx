import type { ReactNode } from 'react'

type SectionIntroProps = {
  title: ReactNode
  /** Krótki wstęp pod tytułem, tylko gdy coś wnosi. */
  intro?: ReactNode
  /** Przycisk albo link pod wstępem. */
  action?: ReactNode
  id?: string
  /** h1 dla nagłówka podstrony; skala zostaje jak w `.h1`. */
  as?: 'h1' | 'h2'
  size?: 'md'
  className?: string
}

/**
 * Nagłówek sekcji: tytuł, pod nim opcjonalny krótki wstęp i akcja. Jedna kolumna, wąska miara.
 * Zastępuje wiersze „tytuł z lewej, akapit z prawej” (design-fundament, pkt 2).
 */
export default function SectionIntro({ title, intro, action, id, as: Heading = 'h2', size, className }: SectionIntroProps) {
  const headingClass = Heading === 'h1' ? 'h1' : ['h2', size === 'md' ? 'h2-md' : ''].filter(Boolean).join(' ')
  return (
    <div className={['sec-intro', className].filter(Boolean).join(' ')}>
      <Heading className={headingClass} id={id}>
        {title}
      </Heading>
      {intro ? <p className={Heading === 'h1' ? 'lead' : 'text'}>{intro}</p> : null}
      {action ? <div className="sec-intro-action row gap-14-28">{action}</div> : null}
    </div>
  )
}
