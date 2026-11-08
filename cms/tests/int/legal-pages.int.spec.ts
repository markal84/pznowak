import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ConsentLabel from '@/components/site/ConsentLabel'
import { POLITYKA_PRYWATNOSCI, REGULAMIN } from '@/content/legal'
import { parseLegal, type LegalBlock } from '@/lib/legal-markdown'
import { CONSENT_TEXT } from '@/lib/submissions/options'
import { consentText } from '@/lib/submissions/consent'

const headings = (blocks: LegalBlock[]) => blocks.flatMap((b) => (b.kind === 'h2' ? [b.text] : []))

describe('regulamin i polityka prywatności', () => {
  it('polityka: tytuł, 12 paragrafów i lista z numeracją', () => {
    const doc = parseLegal(POLITYKA_PRYWATNOSCI)
    expect(doc.title).toBe('Polityka prywatności')
    const h2 = headings(doc.blocks)
    expect(h2).toHaveLength(12)
    expect(h2[0]).toBe('§ 1. Informacje ogólne')
    expect(h2[11]).toBe('§ 12. Zmiany polityki prywatności')
    const firstList = doc.blocks.find((b) => b.kind === 'ol')
    expect(firstList && firstList.kind === 'ol' && firstList.items[0].text).toMatch(/^Niniejsza Polityka prywatności/)
  })

  it('regulamin: 12 paragrafów, a punkty wcięte trafiają pod swój punkt nadrzędny', () => {
    const doc = parseLegal(REGULAMIN)
    expect(doc.title).toBe('Regulamin serwisu internetowego')
    expect(headings(doc.blocks)).toHaveLength(12)
    const lists = doc.blocks.flatMap((b) => (b.kind === 'ol' || b.kind === 'ul' ? [b] : []))
    const contact = lists.flatMap((l) => l.items).find((item) => item.text === 'Kontakt z Usługodawcą:')
    expect(contact?.children.map((c) => c.text)).toEqual(['E-mail: kontakt@pznowak.pl', 'Telefon: +48 501 321 347'])
  })

  it('treść dokumentów zawiera dane z pliku i datę obowiązywania', () => {
    expect(POLITYKA_PRYWATNOSCI.join('\n')).toContain('AE:PL-20448-91937-GVVTB-23')
    expect(REGULAMIN.join('\n')).toContain('Data obowiązywania: 11.11.2026')
  })

  it('zgoda w formularzu: „Regulamin” i „Polityka prywatności” są linkami, reszta zostaje tekstem', () => {
    const html = renderToStaticMarkup(createElement(ConsentLabel, { text: CONSENT_TEXT.kontakt }))
    expect(html).toContain('href="/regulamin"')
    expect(html).toContain('href="/polityka-prywatnosci"')
    expect(html).toContain('Zgadzam się na kontakt w sprawie mojej wiadomości.')
    expect(html).not.toContain('[wkrótce]')
  })

  it('zapisywana treść zgody jest ta sama, co pokazywana (bez znaczników „wkrótce”)', () => {
    expect(consentText('kreator')).toBe(CONSENT_TEXT.kreator)
    expect(consentText('kontakt')).toBe(CONSENT_TEXT.kontakt)
    expect(consentText('kontakt')).toMatch(/Akceptuję Regulamin i Politykę prywatności\.$/)
  })
})
