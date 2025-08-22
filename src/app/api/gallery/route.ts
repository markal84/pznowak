import { NextRequest } from 'next/server'

// Proxy gallery requests to WordPress to avoid browser CORS and hide WP origin
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams
  const perPage = search.get('per_page') ?? '9'
  const page = search.get('page') ?? '1'

  const wpV2 = (process.env.NEXT_PUBLIC_WP_API_URL || '').replace(/\/$/, '')
  if (!wpV2) {
    return new Response(JSON.stringify({ error: 'WP API url not configured' }), { status: 500 })
  }

  const url = `${wpV2}/gallery?_embed&per_page=${encodeURIComponent(perPage)}&page=${encodeURIComponent(page)}`
  try {
    const res = await fetch(url, { next: { revalidate: 30 } })
    const text = await res.text()
    const headers = new Headers()
    // Forward total pages header if present
    const totalPages = res.headers.get('X-WP-TotalPages')
    if (totalPages) headers.set('X-WP-TotalPages', totalPages)
    headers.set('Content-Type', res.headers.get('Content-Type') || 'application/json')
    return new Response(text, { status: res.status, statusText: res.statusText, headers })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Upstream fetch failed' }), { status: 502 })
  }
}

