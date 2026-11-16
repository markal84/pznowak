import type { ReactNode } from 'react'

type SectionIntroProps = {
  title: ReactNode
  /** Nadtytuł sekcji: jedno, dwa słowa nad tytułem (wersaliki ze złotą kreską). Mówi, o czym jest sekcja, zanim przeczytasz tytuł. */
  eyebrow?: ReactNode
  /** Krótki wstęp pod tytułem, tylko gdy coś wnosi. */
  intro?: ReactNode
  /** Przycisk albo link: na telefonie pod wstępem, na komputerze po prawej, w linii z dołem nagłówka. */
  action?: ReactNode
  id?: string
  /** h1 dla nagłówka podstrony; skala zostaje jak w `.h1`. */
  as?: 'h1' | 'h2'
  size?: 'md'
  className?: string
}

/**
 * Nagłówek sekcji: nadtytuł, tytuł, pod nim opcjonalny krótki wstęp i akcja. Tekst w jednej kolumnie, wąska miara
 * (design-fundament, pkt 2). Akcja na komputerze staje po prawej stronie i domyka szerokość sekcji.
 */
export default function SectionIntro({ title, eyebrow, intro, action, id, as: Heading = 'h2', size, className }: SectionIntroProps) {
  const headingClass = Heading === 'h1' ? 'h1' : ['h2', size === 'md' ? 'h2-md' : ''].filter(Boolean).join(' ')
  const main = (
    <>
      {eyebrow ? <p className="eyebrow sec-eyebrow">{eyebrow}</p> : null}
      <Heading className={headingClass} id={id}>
        {title}
      </Heading>
      {intro ? <p className={Heading === 'h1' ? 'lead' : 'text'}>{intro}</p> : null}
    </>
  )
  if (!action) return <div className={['sec-intro', className].filter(Boolean).join(' ')}>{main}</div>
  return (
    <div className={['sec-intro', 'sec-intro-split', className].filter(Boolean).join(' ')}>
      <div className="sec-intro-main">{main}</div>
      <div className="sec-intro-action row gap-14-28">{action}</div>
    </div>
  )
}
