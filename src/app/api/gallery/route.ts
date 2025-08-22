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

    // Basic diagnostics to server logs
    const ct = res.headers.get('Content-Type') || ''
    if (!res.ok) {
      console.error(`[api/gallery] Upstream error ${res.status} ${res.statusText} for ${url}`)
      console.error(`[api/gallery] Body (first 300 chars):`, text.slice(0, 300))
    } else if (!ct.includes('application/json')) {
      console.warn(`[api/gallery] Non-JSON upstream response (Content-Type=${ct}). Body (first 300 chars):`, text.slice(0, 300))
    }

    const headers = new Headers()
    // Forward total pages header if present
    const totalPages = res.headers.get('X-WP-TotalPages')
    if (totalPages) headers.set('X-WP-TotalPages', totalPages)
    headers.set('Content-Type', ct || 'application/json')
    return new Response(text, { status: res.status, statusText: res.statusText, headers })
  } catch (e) {
    console.error(`[api/gallery] Upstream fetch failed for ${url}:`, e)
    return new Response(JSON.stringify({ error: 'Upstream fetch failed' }), { status: 502 })
  }
}
