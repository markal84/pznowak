// Źródła postów: posty strony FB (/posts), rolki (/video_reels) i Instagram (/{ig-user-id}/media).
// Każde źródło zwraca elementy w jednym kształcie (normalizeX), żeby dalsza część skryptu ich nie rozróżniała.

export const POST_FIELDS =
  'id,message,created_time,permalink_url,full_picture,status_type,attachments{media_type,type,media,url,target,title,description,subattachments}'
export const REEL_FIELDS = 'id,description,title,created_time,permalink_url,source,picture,length'
export const IG_FIELDS = 'id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,children{id,media_type,media_url,thumbnail_url}'

/** Daty z Graph API mają strefę w postaci +0000; zamieniamy na ISO, które każdy parser rozumie. */
export function isoDate(value) {
  if (!value) return null
  const d = new Date(String(value).replace(/([+-]\d\d)(\d\d)$/, '$1:$2'))
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function absFb(url) {
  if (!url) return null
  return url.startsWith('/') ? `https://www.facebook.com${url}` : url
}

/** Jedno zdjęcie albo film z załącznika posta FB (bez podzałączników). */
export function mediaFromAttachment(a) {
  const type = String(a.media_type || a.type || '').toLowerCase()
  const id = a.target?.id ? String(a.target.id) : null
  const image = a.media?.image?.src || null
  if (type.includes('video') || a.media?.source) {
    return { type: 'video', id, url: a.media?.source || null, thumb: image }
  }
  if (image) return { type: 'photo', id: type.includes('photo') ? id : null, url: image }
  return null
}

export function normalizeFbPost(p) {
  const media = []
  for (const a of p.attachments?.data || []) {
    const subs = a.subattachments?.data
    if (subs?.length) {
      for (const s of subs) {
        const m = mediaFromAttachment(s)
        if (m) media.push(m)
      }
    } else {
      const m = mediaFromAttachment(a)
      if (m) media.push(m)
    }
  }
  if (!media.length && p.full_picture) media.push({ type: 'photo', id: null, url: p.full_picture })
  return {
    key: `fb:${p.id}`,
    platform: 'facebook',
    kind: 'post',
    id: String(p.id),
    createdTime: isoDate(p.created_time),
    text: p.message || '',
    title: '',
    permalink: absFb(p.permalink_url),
    media,
    raw: p,
  }
}

export function normalizeReel(v) {
  return {
    key: `fb-reel:${v.id}`,
    platform: 'facebook',
    kind: 'reel',
    id: String(v.id),
    createdTime: isoDate(v.created_time),
    text: v.description || '',
    title: v.title || '',
    permalink: absFb(v.permalink_url) || `https://www.facebook.com/reel/${v.id}`,
    media: [{ type: 'video', id: String(v.id), url: v.source || null, thumb: v.picture || null }],
    raw: v,
  }
}

function igMedia(m) {
  const type = String(m.media_type || '').toUpperCase()
  if (type === 'VIDEO') return { type: 'video', id: String(m.id), url: m.media_url || null, thumb: m.thumbnail_url || null }
  return { type: 'photo', id: String(m.id), url: m.media_url || null }
}

export function normalizeIg(m) {
  const children = m.children?.data
  return {
    key: `ig:${m.id}`,
    platform: 'instagram',
    kind: 'post',
    id: String(m.id),
    createdTime: isoDate(m.timestamp),
    text: m.caption || '',
    title: '',
    permalink: m.permalink || null,
    media: children?.length ? children.map(igMedia) : [igMedia(m)],
    raw: m,
  }
}

const hasMoreSubattachments = (post) => (post.attachments?.data || []).some((a) => a.subattachments?.paging?.next)

/** Albumy z ponad ~25 zdjęciami: dociąga kolejne strony podzałączników. */
async function completeSubattachments(post, graph) {
  for (const a of post.attachments?.data || []) {
    let next = a.subattachments?.paging?.next
    let guard = 0
    while (next && guard++ < 20) {
      const body = await graph.get(next)
      a.subattachments.data.push(...(body.data || []))
      next = body.paging?.next
    }
  }
  return post
}

/**
 * Lista elementów źródła od daty `since` (Date). Zwraca { items, capped }.
 * Wyniki idą od najnowszych; kończymy, gdy cała strona wyników jest starsza niż since.
 */
export async function listSource(source, { fb, ig, cfg, igUserId }, since) {
  const sinceUnix = Math.floor(since.getTime() / 1000)
  const items = []
  const collect = (normalize) => async (rows) => {
    let older = 0
    for (const row of rows) {
      const item = normalize(row)
      if (!item.createdTime || new Date(item.createdTime) < since) {
        older++
        continue
      }
      items.push(item)
    }
    return !(rows.length && older === rows.length)
  }

  if (source === 'posts') {
    const r = await fb.paginate(`${cfg.pageId}/posts`, { fields: POST_FIELDS, since: sinceUnix, limit: 25 }, {
      maxPages: cfg.maxPages,
      onPage: collect(normalizeFbPost),
    })
    for (let i = 0; i < items.length; i++) {
      if (hasMoreSubattachments(items[i].raw)) items[i] = normalizeFbPost(await completeSubattachments(items[i].raw, fb))
    }
    return { items, capped: r.capped }
  }
  if (source === 'video_reels') {
    const r = await fb.paginate(`${cfg.pageId}/video_reels`, { fields: REEL_FIELDS, since: sinceUnix, limit: 25 }, {
      maxPages: cfg.maxPages,
      onPage: collect(normalizeReel),
    })
    return { items, capped: r.capped }
  }
  if (source === 'instagram') {
    const r = await ig.paginate(`${igUserId}/media`, { fields: IG_FIELDS, since: sinceUnix, limit: 25 }, {
      maxPages: cfg.maxPages,
      onPage: collect(normalizeIg),
    })
    return { items, capped: r.capped }
  }
  throw new Error(`nieznane źródło ${source}`)
}

/** Jeden element na nowo (np. ponowienie pobierania, gdy wygasły linki do plików). */
export async function fetchOne(ref, { fb, ig }) {
  if (ref.key.startsWith('fb:')) {
    const p = await fb.get(ref.id, { fields: POST_FIELDS })
    return normalizeFbPost(await completeSubattachments(p, fb))
  }
  if (ref.key.startsWith('fb-reel:')) return normalizeReel(await fb.get(ref.id, { fields: REEL_FIELDS }))
  if (ref.key.startsWith('ig:')) return normalizeIg(await ig.get(ref.id, { fields: IG_FIELDS }))
  throw new Error(`nieznany klucz ${ref.key}`)
}

/** Największa wersja zdjęcia FB (media.image.src w załączniku bywa pomniejszony do 720 px). */
export async function bestPhotoUrl(fb, photoId) {
  const body = await fb.get(photoId, { fields: 'images' })
  const best = (body.images || []).slice().sort((a, b) => (b.width || 0) - (a.width || 0))[0]
  return best?.source || null
}

export async function videoSourceUrl(fb, videoId) {
  const body = await fb.get(videoId, { fields: 'source' })
  return body.source || null
}

/** IG user id podpiętego do strony (pole instagram_business_account). */
export async function discoverIgUserId(graph, pageId) {
  const body = await graph.get(pageId, { fields: 'instagram_business_account' })
  return body.instagram_business_account?.id || null
}
