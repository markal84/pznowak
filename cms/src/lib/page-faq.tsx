import DoUzupelnienia from '@/components/site/DoUzupelnienia'
import type { FaqItem } from '@/components/site/Faq'
import type { PageFaqItem } from '@/content/page-texts'
import { showPlaceholders } from '@/lib/placeholders'

/**
 * Pytania z panelu (Teksty stron) w postaci dla `<Faq>` i danych FAQPage. Pytanie „tylko na podglądzie” znika na
 * produkcji; znacznik „do uzupełnienia” jest dopisany po odpowiedzi tylko na podglądzie, a takie pytanie nie trafia
 * do danych strukturalnych (odpowiedź nie jest jeszcze ostateczna).
 */
export function pageFaqItems(items: readonly PageFaqItem[]): FaqItem[] {
  const preview = showPlaceholders()
  return items
    .filter((item) => !item.previewOnly || preview)
    .map(({ question, answer, previewNote }) =>
      previewNote && preview
        ? {
            q: question,
            a: (
              <>
                {answer} <DoUzupelnienia>{previewNote}</DoUzupelnienia>
              </>
            ),
          }
        : { q: question, a: answer },
    )
}
