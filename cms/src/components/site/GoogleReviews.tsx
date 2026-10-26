import { formatAverage, GOOGLE_REVIEWS, pluralReviews, reviewsReady, type GoogleReview, type ReviewsConfig } from '@/lib/reviews'
import { showPlaceholders } from '@/lib/placeholders'
import DoUzupelnienia from './DoUzupelnienia'
import SectionIntro from './SectionIntro'

type GoogleReviewsProps = {
  title?: string
  /** Domyślnie konfiguracja z `src/lib/reviews.ts`; parametr dla testów. */
  config?: ReviewsConfig
  /** Dodatkowy styl sekcji (odstępy zależą od miejsca na stronie). */
  className?: string
}

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`Ocena ${rating} na 5`} className="stars" role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg aria-hidden="true" className={n <= rating ? 'star on' : 'star'} height="16" key={n} viewBox="0 0 20 20" width="16">
          <path d="M10 1.8l2.4 5.2 5.7.6-4.3 3.8 1.2 5.6L10 14.2 5 17l1.2-5.6L1.9 7.6l5.7-.6z" />
        </svg>
      ))}
    </span>
  )
}

function Review({ review }: { review: GoogleReview }) {
  return (
    <li className="review">
      <Stars rating={review.rating} />
      <blockquote>{review.text}</blockquote>
      <p className="review-by">
        <span>{review.author}</span>
        <span className="muted">
          {review.url ? (
            <a href={review.url} rel="noreferrer noopener" target="_blank">
              {review.date}
            </a>
          ) : (
            review.date
          )}
        </span>
      </p>
    </li>
  )
}

/**
 * Opinie z Google (zlecenie I, pkt 5): podsumowanie wizytówki (średnia i liczba opinii, zawsze razem z cytatami)
 * i 3–4 wybrane opinie z `src/lib/reviews.ts`. Pusta albo niepełna konfiguracja: podgląd pokazuje placeholder,
 * produkcja nie renderuje sekcji (nigdy cytatów bez oceny).
 */
export default function GoogleReviews({ title = 'Opinie z Google', config = GOOGLE_REVIEWS, className }: GoogleReviewsProps) {
  const ready = reviewsReady(config)
  if (!ready) {
    return (
      <DoUzupelnienia as="div">
        <section className={['wrap', 'sec-tight', 'stack', className].filter(Boolean).join(' ')} style={{ gap: 28 }}>
          <SectionIntro title={title} />
          <p className="review-empty">
            {config.reviews.length > 0
              ? 'Opinie są w konfiguracji, ale brakuje średniej i liczby opinii. Sekcja nie pokaże się na produkcji bez nich.'
              : 'Tu będą 3–4 opinie z Google – wybiera Marcin. Obok nich średnia ocena i liczba wszystkich opinii.'}
          </p>
        </section>
      </DoUzupelnienia>
    )
  }

  const { summary, reviews, sourceNote } = config
  return (
    <section className={['wrap', 'sec-tight', 'stack', className].filter(Boolean).join(' ')} style={{ gap: 36 }}>
      <SectionIntro
        action={
          <a className="tl" href={summary!.url} rel="noreferrer noopener" target="_blank">
            Zobacz wszystkie w Google
          </a>
        }
        intro={
          <span className="review-sum">
            <strong>{formatAverage(summary!.average)}</strong>
            <Stars rating={Math.round(summary!.average)} />
            <span>
              {summary!.count} {pluralReviews(summary!.count)} w Google
            </span>
          </span>
        }
        title={title}
      />
      <ul className="review-list" data-reveal="">
        {reviews.map((r) => (
          <Review key={`${r.author}-${r.date}`} review={r} />
        ))}
      </ul>
      {sourceNote ? (
        <p className="small">{sourceNote}</p>
      ) : showPlaceholders() ? (
        <p className="small">
          <DoUzupelnienia>[Zdanie o tym, skąd pochodzą opinie: do potwierdzenia]</DoUzupelnienia>
        </p>
      ) : null}
    </section>
  )
}
