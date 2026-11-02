'use client'

import Link from 'next/link'
import { createContext, useContext, useState, type ReactNode } from 'react'

import { findVariant, inquiryHref, swatchHex, type StoneVariant, type SwatchId } from '@/lib/stone-variants'

/**
 * „Zamów z innym kamieniem” (zlecenie V). Wybór kamienia jest wspólny dla kilku miejsc karty (galeria, parametr
 * „Kamień główny”, przycisk „Zapytaj”), które leżą w różnych kolumnach strony renderowanej na serwerze, dlatego
 * stan siedzi w kontekście. Pierwszy stan przychodzi z `?kamien=` (serwer), więc link działa także bez JavaScriptu.
 */

type StoneVariantState = {
  variants: StoneVariant[]
  selected: StoneVariant | null
  select: (slug: string | null) => void
}

const StoneVariantContext = createContext<StoneVariantState | null>(null)

/** Wybrany wariant; `null` = oryginał albo karta bez wariantów (komponent poza dostawcą). */
export function useSelectedStoneVariant(): StoneVariant | null {
  return useContext(StoneVariantContext)?.selected ?? null
}

/** Adres strony z `?kamien=<slug>` (albo bez niego dla oryginału); pozostałe parametry zostają. */
function urlWithStone(slug: string | null): string {
  const url = new URL(window.location.href)
  if (slug) url.searchParams.set('kamien', slug)
  else url.searchParams.delete('kamien')
  return `${url.pathname}${url.search}${url.hash}`
}

export function StoneVariantProvider({
  variants,
  initialSlug,
  children,
}: {
  variants: StoneVariant[]
  initialSlug: string | null
  children: ReactNode
}) {
  const [slug, setSlug] = useState<string | null>(findVariant(variants, initialSlug)?.slug ?? null)
  const selected = findVariant(variants, slug)

  const select = (next: string | null) => {
    const variant = findVariant(variants, next)
    setSlug(variant?.slug ?? null)
    // replaceState: link do udostępnienia bez przeładowania; przycisk „wstecz” nie przechodzi po kolejnych kółkach.
    window.history.replaceState(window.history.state, '', urlWithStone(variant?.slug ?? null))
  }

  return <StoneVariantContext.Provider value={{ variants, selected, select }}>{children}</StoneVariantContext.Provider>
}

/** Wartość parametru „Kamień główny”: oryginał z karty albo „<kamień> (na zamówienie)”. */
export function VariantStoneFact({ children }: { children: ReactNode }) {
  const selected = useSelectedStoneVariant()
  if (!selected) return <>{children}</>
  return <>{`${selected.stone} (na zamówienie)`}</>
}

/** „Zapytaj o ten pierścionek”: formularz dostaje nazwę projektu i wybrany kamień. */
export function VariantInquiryLink({ projectName, className, children }: { projectName: string; className?: string; children: ReactNode }) {
  const selected = useSelectedStoneVariant()
  return (
    <Link className={className} href={inquiryHref(projectName, selected?.stone)}>
      {children}
    </Link>
  )
}

/** Rząd kółek: pierwsze to oryginał, dalej warianty z panelu. Pokazuje się tylko, gdy karta ma warianty. */
export function StoneVariantPicker({ originalStone, originalSwatch }: { originalStone: string; originalSwatch: SwatchId }) {
  const state = useContext(StoneVariantContext)
  if (!state || state.variants.length === 0) return null
  const { variants, selected, select } = state
  const options: { slug: string | null; name: string; label: string; swatch: SwatchId }[] = [
    {
      slug: null,
      name: 'Oryginał',
      label: originalStone ? `Oryginał: ${originalStone}` : 'Oryginał',
      swatch: originalSwatch,
    },
    ...variants.map((variant) => ({
      slug: variant.slug,
      name: variant.stone,
      label: `${variant.stone}${variant.isVisualization ? ' (wizualizacja)' : ''}`,
      swatch: variant.swatch,
    })),
  ]

  return (
    <section aria-labelledby="inne-kamienie" className="stone-variants">
      <h2 className="stone-variants-title" id="inne-kamienie">
        Zamów z innym kamieniem
      </h2>
      <div aria-label="Kamień" className="stone-options" role="group">
        {options.map((option) => {
          const pressed = (selected?.slug ?? null) === option.slug
          return (
            <button
              aria-label={option.label}
              aria-pressed={pressed}
              className="stone-option"
              key={option.slug ?? 'oryginal'}
              onClick={() => select(option.slug)}
              type="button"
            >
              <span aria-hidden="true" className="stone-swatch" style={{ background: swatchHex(option.swatch) }} />
              <span aria-hidden="true" className="stone-name">
                {option.name}
              </span>
            </button>
          )
        })}
      </div>
      <p className="stone-variants-note">
        Wizualizacje pokazują kolor kamienia; gotowy pierścionek może różnić się detalami. Dostępność kamienia potwierdza
        pracownia.
      </p>
    </section>
  )
}
