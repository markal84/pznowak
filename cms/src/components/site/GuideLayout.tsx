import type { ReactNode } from 'react'
import Link from 'next/link'
import GuideCards from '@/components/site/GuideCards'
import JsonLd from '@/components/site/JsonLd'
import { GUIDES_PATH, guideDateLabel, guidePath, type Guide } from '@/lib/guides'
import { SITE } from '@/lib/site'
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/structured-data'

export type GuideSection = { id: string; label: string }

type GuideLayoutProps = {
  guide: Guide
  /** Wstęp pod tytułem: jedno, dwa zdania z odpowiedzią na pytanie z tytułu. */
  lead: ReactNode
  /** Spis treści: `id` nagłówków H2 w treści. */
  sections: readonly GuideSection[]
  /** Pytania z poradnika do danych strukturalnych (te same zdania co w treści). */
  faq?: readonly { q: string; text: string }[]
  /** Obraz do danych strukturalnych (ścieżka albo adres); domyślnie obraz serwisu. */
  image?: string
  children: ReactNode
}

/**
 * Wspólny układ poradnika: okruszki, tytuł, wstęp, spis treści (na komputerze przyklejony z boku), treść, wezwanie
 * do rozmowy i pozostałe poradniki. Dane strukturalne: Article, BreadcrumbList i, gdy są pytania, FAQPage.
 */
export default function GuideLayout({ guide, lead, sections, faq, image, children }: GuideLayoutProps) {
  const path = guidePath(guide.slug)
  const faqData = faq ? faqJsonLd(faq) : null
  return (
    <>
      <JsonLd
        data={articleJsonLd({
          title: guide.title,
          description: guide.description,
          path,
          published: guide.published,
          updated: guide.updated,
          image,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Poradniki', path: GUIDES_PATH },
          { name: guide.short, path },
        ])}
      />
      {faqData ? <JsonLd data={faqData} /> : null}

      <nav aria-label="Ścieżka" className="wrap crumbs">
        <ol>
          <li>
            <Link href={GUIDES_PATH}>Poradniki</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{guide.short}</li>
        </ol>
      </nav>

      <article className="wrap guide">
        <header className="guide-head">
          <p className="eyebrow">Poradnik pracowni · {guide.topic}</p>
          <h1 className="h1 guide-title">{guide.title}</h1>
          <p className="lead guide-lead">{lead}</p>
          <p className="guide-meta">
            <span>Czytanie: ok. {guide.minutes} min</span>
            <span>
              Aktualizacja: <time dateTime={guide.updated}>{guideDateLabel(guide.updated)}</time>
            </span>
            <span>Pracownia Złotnicza Michał Nowak, Busko-Zdrój</span>
          </p>
        </header>

        <div className="guide-cols">
          <nav aria-label="Spis treści" className="guide-toc">
            <span className="guide-toc-label">W tym poradniku</span>
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.label}</a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="guide-body">{children}</div>
        </div>
      </article>

      <section className="dark">
        <div className="wrap guide-cta">
          <div className="stack" style={{ gap: 16, flex: '1 1 480px', minWidth: 0 }}>
            <h2 className="h2 h2-md">Wolisz zapytać złotnika?</h2>
            <p className="text" style={{ maxWidth: '34em' }}>
              Napisz albo zadzwoń. Odpowiemy na pytania o rozmiar, kamień i cenę, zanim cokolwiek zamówisz.
            </p>
          </div>
          <div className="row gap-14-28">
            <Link className="btn btn-light" href="/kontakt?temat=nowy">
              Napisz do pracowni
            </Link>
            <a className="tl tl-light" href={SITE.phoneHref}>
              Zadzwoń: {SITE.phoneShort}
            </a>
          </div>
        </div>
      </section>

      <section className="wrap sec-tight stack" style={{ gap: 36 }}>
        <h2 className="h2 h2-md">Czytaj dalej</h2>
        <GuideCards exclude={guide.slug} />
      </section>
    </>
  )
}
