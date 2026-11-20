import Link from 'next/link'

import { announcementVisible, getPageTexts } from '@/lib/page-texts'

/**
 * Pasek z komunikatem nad menu, np. „Zamówienia na święta przyjmujemy do 10 grudnia”. Treść, link i datę końca
 * ustawia się w panelu (Teksty stron → Pasek z komunikatem). Pusty tekst albo minięta data = paska nie ma.
 */
export default async function AnnouncementBar() {
  const { announcement } = await getPageTexts()
  if (!announcementVisible(announcement)) return null
  const href = announcement.linkUrl
  return (
    <aside aria-label="Komunikat pracowni" className="announce" data-miejsce="pasek-komunikatu">
      <p className="announce-in">
        <span>{announcement.text}</span>
        {href ? (
          href.startsWith('/') && !href.startsWith('//') ? (
            <Link className="announce-link" href={href}>
              {announcement.linkLabel}
            </Link>
          ) : (
            <a className="announce-link" href={href}>
              {announcement.linkLabel}
            </a>
          )
        ) : null}
      </p>
    </aside>
  )
}
