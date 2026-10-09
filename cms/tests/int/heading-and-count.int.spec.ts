import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CmsHeading from '../../src/components/CmsHeading'
import { formatProductCount } from '../../src/lib/project-count'

describe('Polish project count', () => {
  it.each([
    [0, 'projektów'],
    [1, 'projekt'],
    [2, 'projekty'],
    [4, 'projekty'],
    [5, 'projektów'],
    [11, 'projektów'],
    [12, 'projektów'],
    [14, 'projektów'],
    [21, 'projektów'],
    [22, 'projekty'],
    [25, 'projektów'],
    [112, 'projektów'],
  ])('%s %s', (count, noun) => expect(formatProductCount(Number(count))).toBe(`${count} ${noun}`))
})
describe('CMS heading', () => {
  it('renders emphasis while escaping HTML', () => {
    const html = renderToStaticMarkup(
      createElement(CmsHeading, { text: '<script>x</script> *tekst* & *drugi*' }),
    )
    expect(html).toBe('&lt;script&gt;x&lt;/script&gt; <em>tekst</em> &amp; <em>drugi</em>')
  })
  it('preserves unmatched markers', () => {
    expect(renderToStaticMarkup(createElement(CmsHeading, { text: 'tekst *niedomknięty' }))).toBe(
      'tekst *niedomknięty',
    )
  })
})
