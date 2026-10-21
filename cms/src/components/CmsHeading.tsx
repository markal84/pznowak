import { Fragment } from 'react'

// React escapes every text node; no CMS text is interpreted as HTML.
export default function CmsHeading({ text }: { text: string }) {
  return text
    .split(/(\*[^*\n]+\*|\n)/g)
    .map((part, index) => (
      <Fragment key={index}>
        {part === '\n' ? (
          <br />
        ) : part.startsWith('*') && part.endsWith('*') && part.length > 2 ? (
          <em>{part.slice(1, -1)}</em>
        ) : (
          part
        )}
      </Fragment>
    ))
}
