import Link from 'next/link'
import { guidePath, type Guide } from '@/lib/guides'

/**
 * Kafelki poradników: lista na /poradniki, sekcja na stronie głównej i „Czytaj dalej” pod poradnikiem.
 * `exclude` pomija bieżący poradnik; `heading` ustawia poziom nagłówka kafelka pod nagłówek sekcji.
 * Listę (`getGuides()`, opublikowane poradniki z panelu) pobiera strona, żeby komponent został synchroniczny.
 */
export default function GuideCards({
  guides,
  exclude,
  heading: Heading = 'h3',
}: {
  guides: readonly Guide[]
  exclude?: string
  heading?: 'h2' | 'h3'
}) {
  const list = guides.filter((g) => g.slug !== exclude)
  return (
    <ul className="guide-cards" data-reveal="">
      {list.map((g) => (
        <li key={g.slug}>
          <Link className="guide-card" href={guidePath(g.slug)}>
            <span className="guide-card-topic">{g.topic}</span>
            <Heading className="guide-card-title">{g.short}</Heading>
            <span className="guide-card-text">{g.description}</span>
            <span className="guide-card-more">
              Czytaj poradnik <span aria-hidden="true">→</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
