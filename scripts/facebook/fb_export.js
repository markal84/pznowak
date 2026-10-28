/*
 * fb_export.js - eksport postów fanpage'a FB z zalogowanej przeglądarki (wklejany w konsolę).
 *
 * Odtworzony z sesji Claude Code „Pierścionki do katalogu pznowak" z 25.10.2026 (model Opus 5.5 pisał
 * te polecenia na bieżąco, plik nigdy nie istniał). Instrukcja dla człowieka: scripts/facebook/FB_EXPORT.md.
 *
 * UWAGA 1: LINKI CDN FACEBOOKA WYGASAJĄ w ciągu godzin/dni. Media (download_media.py, download_hd.py)
 * pobieraj ZARAZ po eksporcie, w tym samym kroku.
 * UWAGA 2: skrypt nikt nie testował na żywym Facebooku od czasu odtworzenia. Zależy od wyglądu danych FB
 * (nazwy pól poniżej pochodzą z sesji 25.10; FB może je zmienić). Jeśli coś przestanie działać, przerwij.
 * UWAGA 3: skrypt nie zawiera żadnych tokenów ani cookies; działa na sesji, w której jesteś zalogowany.
 *
 * Co robi:
 *   Krok 1 (na osi czasu strony): przechwytuje odpowiedzi GraphQL, powoli przewija oś czasu, składa rekordy
 *     postów i zapisuje plik pznowak-fb-posts.json (format 1:1 jak data/facebook/posts.json).
 *   Krok 2 (tylko jeśli trzeba, patrz niżej): odwiedza po kolei strony filmów (/reel/ID/) i niepełnych albumów,
 *     zbiera adresy najlepszych wersji i zapisuje pznowak-fb-hd.json (format 1:1 jak hd-sources.json).
 *     Skrypt pamięta kolejkę w sessionStorage tej karty; po każdej nawigacji WKLEJASZ TEN SAM SKRYPT PONOWNIE
 *     (strzałka w górę + Enter w konsoli).
 *
 * Użycie: ustaw SINCE poniżej (albo zostaw '' = cała historia), otwórz stronę fanpage'a
 *   https://www.facebook.com/profile.php?id=61568506251939 , wklej cały plik w konsolę (F12 > Console).
 */
(() => {
  'use strict';

  // ===== USTAWIENIA =====
  const SINCE = '';                  // 'RRRR-MM-DD' = tylko posty od tej daty (tryb przyrostowy); '' = wszystko
  const PAGE_ID = '61568506251939';  // fanpage Michał Nowak Pracownia Złotnicza
  const SCROLL_DELAY_MS = 4000;      // sesja 25.10 używała 2500; wolniej = mniej zapytań i mniejsze ryzyko blokady
  const MAX_SCROLLS = 300;           // jak w sesji
  const STABLE_LIMIT = 6;            // tyle przewinięć bez nowych odpowiedzi = koniec osi czasu (jak w sesji)
  const STEP_DELAY_MS = 6000;        // pauza przed przejściem do następnej strony w kroku 2
  const SINCE_OLDER_STOP = 3;        // przy SINCE: stop po tylu postach starszych niż data (omija przypięte)

  const root = typeof window !== 'undefined' ? window : globalThis;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (...a) => console.log('[fb_export]', ...a);

  // ===== Parsowanie danych GraphQL (kod z sesji 25.10, window.__parse) =====

  // Odpowiedź GraphQL to kilka linii JSON (czasem z prefiksem "for (;;);"); osadzone dane to <script type="application/json">.
  function parseRootsFromTexts(texts) {
    const roots = [];
    for (const t of texts) {
      for (const line of String(t).split('\n')) {
        const s = line.trim();
        if (!s) continue;
        try { roots.push(JSON.parse(s.replace(/^for \(;;\);/, ''))); } catch { /* linia nie jest JSON-em */ }
      }
    }
    return roots;
  }

  function collectMedia(o, p, depth = 0) {
    if (!o || typeof o !== 'object' || depth > 60) return;
    if (Array.isArray(o)) { o.forEach((x) => collectMedia(x, p, depth + 1)); return; }
    if (o.__typename === 'Photo' && o.id) {
      const prev = p.photos.get(o.id) || {};
      const cand = [o.viewer_image, o.image, o.photo_image, o.large_share_image, o.full_image].filter((x) => x && x.uri);
      cand.sort((a, b) => (b.width || 0) - (a.width || 0));
      if (cand[0] && (!prev.uri || (cand[0].width || 0) > (prev.w || 0))) {
        p.photos.set(o.id, { id: o.id, uri: cand[0].uri, w: cand[0].width, h: cand[0].height });
      } else if (!p.photos.has(o.id)) {
        p.photos.set(o.id, { id: o.id });
      }
    }
    if (o.__typename === 'Video' && o.id) {
      const prev = p.videos.get(o.id) || { id: o.id };
      const hd = o.browser_native_hd_url || o.playable_url_quality_hd || prev.hd;
      const sd = o.browser_native_sd_url || o.playable_url || prev.sd;
      const thumb = (o.preferred_thumbnail && o.preferred_thumbnail.image && o.preferred_thumbnail.image.uri)
        || (o.thumbnailImage && o.thumbnailImage.uri) || prev.thumb;
      let dash = prev.dash;
      if (o.videoDeliveryResponseFragment || o.videoDeliveryLegacyFields) {
        const f = o.videoDeliveryLegacyFields || {};
        dash = dash || f.browser_native_hd_url || f.browser_native_sd_url;
      }
      p.videos.set(o.id, { id: o.id, hd, sd, thumb, dash });
    }
    for (const k in o) collectMedia(o[k], p, depth + 1);
  }

  function findMsg(o, depth = 0) {
    if (!o || typeof o !== 'object' || depth > 40) return '';
    if (o.message && typeof o.message.text === 'string' && o.message.text) return o.message.text;
    for (const k in o) { const r = findMsg(o[k], depth + 1); if (r) return r; }
    return '';
  }

  // Zwraca surowe posty (Map post_id -> rekord) znalezione w drzewach JSON.
  function parsePosts(roots) {
    const posts = new Map();
    const get = (id) => {
      if (!posts.has(id)) posts.set(id, { post_id: id, time: null, text: '', url: '', photos: new Map(), videos: new Map() });
      return posts.get(id);
    };
    const walk = (o, depth = 0) => {
      if (!o || typeof o !== 'object' || depth > 80) return;
      if (Array.isArray(o)) { o.forEach((x) => walk(x, depth + 1)); return; }
      if (typeof o.post_id === 'string' && /^\d+$/.test(o.post_id)) {
        const p = get(o.post_id);
        if (o.creation_time) p.time = o.creation_time;
        if (!p.text) p.text = findMsg(o);
        if (o.url && !p.url) p.url = o.url;
        if (o.wwwURL && !p.url) p.url = o.wwwURL;
        collectMedia(o.attachments || o, p);
      }
      for (const k in o) walk(o[k], depth + 1);
    };
    roots.forEach((r) => walk(r));
    return [...posts.values()].map((p) => ({ ...p, photos: [...p.photos.values()], videos: [...p.videos.values()] }));
  }

  // Filmy: video id -> lista progresywnych adresów {url, q} (q = 'SD' / 'HD'); window.__vmap z sesji.
  function buildVideoMap(roots) {
    const vmap = new Map();
    const walk = (o, d = 0) => {
      if (!o || typeof o !== 'object' || d > 90) return;
      if (Array.isArray(o)) { o.forEach((x) => walk(x, d + 1)); return; }
      const f = o.videoDeliveryResponseFragment && o.videoDeliveryResponseFragment.videoDeliveryResponseResult;
      if (f && o.id) {
        const prog = (f.progressive_urls || []).filter((p) => p.progressive_url)
          .map((p) => ({ url: p.progressive_url, q: p.metadata && p.metadata.quality }));
        const prev = vmap.get(o.id) || [];
        vmap.set(o.id, prev.length >= prog.length ? prev : prog);
      }
      for (const k in o) walk(o[k], d + 1);
    };
    roots.forEach((r) => walk(r));
    return vmap;
  }

  // Największa liczba zdjęć albumu zgłaszana przez FB (all_subattachments.count) dla każdego posta.
  function buildAlbumCounts(roots) {
    const albumCount = new Map();
    const maxCount = (o, d = 0) => {
      let m = 0;
      if (!o || typeof o !== 'object' || d > 60) return 0;
      if (o.all_subattachments && o.all_subattachments.count) m = o.all_subattachments.count;
      for (const k in o) m = Math.max(m, maxCount(o[k], d + 1));
      return m;
    };
    const walk = (o, d = 0) => {
      if (!o || typeof o !== 'object' || d > 90) return;
      if (Array.isArray(o)) { o.forEach((x) => walk(x, d + 1)); return; }
      if (typeof o.post_id === 'string' && o.attachments) {
        const c = maxCount(o.attachments);
        if (c > (albumCount.get(o.post_id) || 0)) albumCount.set(o.post_id, c);
      }
      for (const k in o) walk(o[k], d + 1);
    };
    roots.forEach((r) => walk(r));
    return albumCount;
  }

  // Składa końcowe rekordy w formacie posts.json (tylko posty ze zdjęciami lub filmami).
  // Kolejność kluczy jak w istniejącym pliku: post_id, time, date, url, text, albumCount, photos, videos.
  function buildPostRecords(rawPosts, vmap, albumCount) {
    return rawPosts.filter((p) => p.photos.length || p.videos.length).map((p) => {
      const videos = p.videos.map((v) => {
        const prog = vmap.get(v.id) || [];
        const hd = prog.find((x) => x.q === 'HD') || prog[0];
        return { id: v.id, url: (hd && hd.url) || null, quality: (hd && hd.q) || null, thumb: v.thumb || null };
      });
      return {
        post_id: p.post_id,
        time: p.time,
        date: p.time ? new Date(p.time * 1000).toISOString() : null,
        url: p.url,
        text: p.text,
        albumCount: albumCount.get(p.post_id) || p.photos.length,
        photos: p.photos,
        videos,
      };
    });
  }

  // Tryb przyrostowy: zostają posty od daty SINCE oraz posty bez daty (znane z pierwszego eksportu - FB nie zawsze
  // podaje creation_time; scalanie po post_id w merge_export.py i tak je zdubluje bezpiecznie).
  function filterSince(records, sinceIso) {
    if (!sinceIso) return records;
    const t = Date.parse(sinceIso + 'T00:00:00Z') / 1000;
    if (Number.isNaN(t)) throw new Error('SINCE musi mieć format RRRR-MM-DD, jest: ' + sinceIso);
    return records.filter((p) => p.time === null || p.time >= t);
  }

  // ===== Manifesty DASH (kod z sesji: window.__dash i window.__EX) =====

  function parseManifestXml(xml, DOMParserCtor) {
    const doc = new DOMParserCtor().parseFromString(xml, 'application/xml');
    const reps = [];
    for (const as of doc.querySelectorAll('AdaptationSet')) {
      const ct = as.getAttribute('contentType') || '';
      for (const r of as.querySelectorAll('Representation')) {
        const mime = r.getAttribute('mimeType') || as.getAttribute('mimeType') || '';
        const base = r.querySelector('BaseURL');
        reps.push({
          kind: ct || (mime.startsWith('audio') ? 'audio' : 'video'),
          codecs: r.getAttribute('codecs'),
          bw: +r.getAttribute('bandwidth'),
          w: +r.getAttribute('width') || 0,
          h: +r.getAttribute('height') || 0,
          label: r.getAttribute('FBQualityLabel'),
          url: base ? base.textContent : null,
        });
      }
    }
    return reps;
  }

  // Wybór: największa krótsza krawędź, potem największy bitrate (jak w sesji).
  const byQuality = (a, b) => (Math.min(b.w, b.h) - Math.min(a.w, a.h)) || (b.bw - a.bw);
  const pickBestVideo = (reps) => reps.filter((r) => r.kind === 'video' && r.url).sort(byQuality)[0] || null;
  const pickBestAudio = (reps) => reps.filter((r) => r.kind === 'audio' && r.url).sort((a, b) => b.bw - a.bw)[0] || null;

  // Wpisy hd-sources.json -> "dash": {id, best, bestAvc, audio, prog}. Manifest bywa już na osi czasu (ok. 56% filmów w sesji).
  function buildDash(roots, DOMParserCtor) {
    const vids = new Map();
    const walk = (o, d = 0) => {
      if (!o || typeof o !== 'object' || d > 90) return;
      if (Array.isArray(o)) { o.forEach((x) => walk(x, d + 1)); return; }
      const f = o.videoDeliveryResponseFragment && o.videoDeliveryResponseFragment.videoDeliveryResponseResult;
      if (f && o.id) {
        const reps = (f.dash_manifests || []).flatMap((m) => (m.manifest_xml ? parseManifestXml(m.manifest_xml, DOMParserCtor) : []));
        const prog = (f.progressive_urls || []).filter((p) => p.progressive_url)
          .map((p) => ({ url: p.progressive_url, q: p.metadata && p.metadata.quality }));
        const prev = vids.get(o.id);
        if (!prev || reps.length > prev.reps.length) vids.set(o.id, { id: o.id, reps, prog });
      }
      for (const k in o) walk(o[k], d + 1);
    };
    roots.forEach((r) => walk(r));
    return [...vids.values()].map((v) => {
      const video = v.reps.filter((r) => r.kind === 'video' && r.url);
      const bestAvc = video.filter((r) => (r.codecs || '').startsWith('avc')).sort(byQuality)[0] || null;
      return { id: v.id, best: pickBestVideo(v.reps), bestAvc, audio: pickBestAudio(v.reps), prog: v.prog };
    });
  }

  // ===== Pomocnicze (przeglądarka) =====

  function offerDownload(filename, obj) {
    // Sesja 25.10: automatyczny click() po długiej operacji bywa blokowany, więc dajemy widoczny czerwony link do kliknięcia.
    const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/octet-stream' });
    let a = document.getElementById('__fbx_dl_' + filename);
    if (!a) { a = document.createElement('a'); a.id = '__fbx_dl_' + filename; document.body.appendChild(a); }
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.textContent = 'POBIERZ ' + filename;
    const n = document.querySelectorAll('[id^="__fbx_dl_"]').length;
    Object.assign(a.style, {
      position: 'fixed', top: (40 + n * 70) + 'px', left: '20px', zIndex: 2147483647,
      background: '#e00', color: '#fff', padding: '16px', fontSize: '18px',
    });
    log('Kliknij czerwony link „POBIERZ ' + filename + '" w lewym górnym rogu strony (rozmiar ' + blob.size + ' B).');
  }

  const ss = {
    get: (k, def) => { try { const v = sessionStorage.getItem(k); return v === null ? def : JSON.parse(v); } catch { return def; } },
    set: (k, v) => sessionStorage.setItem(k, JSON.stringify(v)),
    del: (k) => sessionStorage.removeItem(k),
  };

  const pageScripts = (doc) => [...doc.querySelectorAll('script[type="application/json"]')].map((s) => s.textContent);

  // ===== KROK 1: oś czasu =====

  async function runTimeline() {
    const sinceEpoch = SINCE ? Date.parse(SINCE + 'T00:00:00Z') / 1000 : null;
    if (SINCE && Number.isNaN(sinceEpoch)) throw new Error('SINCE musi mieć format RRRR-MM-DD');

    // Przechwytywanie odpowiedzi GraphQL z XHR (FB doładowuje kolejne posty podczas przewijania).
    root.__cap = root.__cap || [];
    if (!root.__hooked) {
      root.__hooked = true;
      const oOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (m, u) { this.__u = u; return oOpen.apply(this, arguments); };
      const oSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.send = function () {
        if (String(this.__u).includes('graphql')) {
          this.addEventListener('load', () => { try { root.__cap.push(this.responseText); } catch { /* ignoruj */ } });
        }
        return oSend.apply(this, arguments);
      };
    }
    // Dane osadzone w stronie (pierwsza partia postów).
    root.__init = pageScripts(document).filter((t) => t.includes('videoDeliveryResponseFragment') || t.includes('post_id'));
    log('Start. Osadzone bloki danych:', root.__init.length, SINCE ? '| od ' + SINCE : '| cała historia');

    let parsedUpTo = 0;
    let roots = parseRootsFromTexts(root.__init);
    const ingest = () => { roots = roots.concat(parseRootsFromTexts(root.__cap.slice(parsedUpTo))); parsedUpTo = root.__cap.length; };

    // TODO (nieodtworzone z sesji 25.10): sesja przewijała bez żadnego warunku daty (do końca osi czasu).
    // Wczesne zatrzymanie przy SINCE to nowa heurystyka: stop, gdy widać SINCE_OLDER_STOP postów starszych niż data.
    // Przypięty stary post na górze nie zatrzyma przewijania, bo wymagamy kilku starszych postów.
    let last = -1; let stable = 0;
    for (let i = 0; i < MAX_SCROLLS && stable < STABLE_LIMIT; i++) {
      root.scrollTo(0, document.body.scrollHeight);
      await sleep(SCROLL_DELAY_MS);
      const n = root.__cap.length;
      if (n === last) stable++; else stable = 0;
      last = n;
      if (i % 5 === 0) log('przewinięcie', i, '| odpowiedzi:', n);
      if (sinceEpoch !== null && i % 3 === 2) {
        ingest();
        const older = parsePosts(roots).filter((p) => p.time && p.time < sinceEpoch).length;
        if (older >= SINCE_OLDER_STOP) { log('Doszliśmy do postów starszych niż ' + SINCE + ' - koniec przewijania.'); break; }
      }
    }
    ingest();

    const raw = parsePosts(roots);
    const vmap = buildVideoMap(roots);
    const albumCount = buildAlbumCounts(roots);
    const posts = filterSince(buildPostRecords(raw, vmap, albumCount), SINCE);
    const exportedAt = new Date().toISOString();
    const out = { exportedAt, page: PAGE_ID, posts };

    const dashAll = buildDash(roots, root.DOMParser);
    const wanted = new Set(posts.flatMap((p) => p.videos.map((v) => v.id)));
    const dash = dashAll.filter((v) => wanted.has(v.id));

    // Co jeszcze trzeba dozbierać w kroku 2: filmy bez manifestu na osi czasu i albumy, w których mamy mniej zdjęć niż FB deklaruje.
    const missingVideos = dash.filter((v) => !v.best).map((v) => v.id);
    const videosWithoutAnyData = [...wanted].filter((id) => !dash.some((v) => v.id === id));
    const incompleteAlbums = posts.filter((p) => p.albumCount > p.photos.length).map((p) => p.post_id);
    const queue = [
      ...missingVideos.map((id) => ({ t: 'reel', id })),
      ...videosWithoutAnyData.map((id) => ({ t: 'reel', id })), // np. film bez wpisu na osi czasu (w sesji: moissanit)
      ...incompleteAlbums.map((post) => ({ t: 'set', post })),
    ];

    ss.set('__fbx_hd', { exportedAt, dash, hd: {}, photos: {}, albums: {} });
    ss.set('__fbx_queue', queue);

    const times = posts.map((p) => p.time).filter(Boolean).sort();
    log('Posty ze zdjęciami/filmami:', posts.length,
      '| najstarszy:', times[0] ? new Date(times[0] * 1000).toISOString() : '-',
      '| najnowszy:', times.length ? new Date(times[times.length - 1] * 1000).toISOString() : '-');
    log('Zdjęcia:', posts.reduce((a, p) => a + p.photos.length, 0), '| filmy:', wanted.size,
      '| filmy bez adresu HD:', posts.flatMap((p) => p.videos).filter((v) => !v.url).length);
    log('Do kroku 2:', queue.length, 'stron (filmy:', missingVideos.length + videosWithoutAnyData.length, ', niepełne albumy:', incompleteAlbums.length, ')');

    offerDownload('pznowak-fb-posts.json', out);
    if (queue.length) {
      log('KROK 2: otwórz', nextUrl(queue[0]), 'i wklej ten skrypt ponownie (albo wpisz fbExport.next()). Kliknij najpierw czerwony link!');
    } else {
      log('Krok 2 niepotrzebny. Pobierz też hd-sources: fbExport.finish()');
    }
    root.fbExport = { next: () => { location.assign(nextUrl(queue[0])); }, finish };
  }

  // ===== KROK 2: strony filmów i albumów =====

  function nextUrl(item) {
    if (item.t === 'reel') return 'https://www.facebook.com/reel/' + item.id + '/';
    if (item.t === 'set') return 'https://www.facebook.com/media/set/?set=pcb.' + item.post + '&type=3';
    return 'https://www.facebook.com/photo/?fbid=' + item.id;
  }

  // Rekord filmu ze strony /reel/ID/ (window.__EX z sesji). Zapisuje w hd[id]: {w,h,best,audio,prog,hls}.
  function extractReel(id) {
    const roots = [];
    for (const s of pageScripts(document)) { try { roots.push(JSON.parse(s)); } catch { /* ignoruj */ } }
    let rec = null;
    const walk = (o) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) { o.forEach(walk); return; }
      const f = o.videoDeliveryResponseFragment && o.videoDeliveryResponseFragment.videoDeliveryResponseResult;
      if (f && o.id === id) {
        const reps = (f.dash_manifests || []).flatMap((m) => (m.manifest_xml ? parseManifestXml(m.manifest_xml, root.DOMParser) : []));
        rec = {
          w: o.width,
          h: o.height,
          best: pickBestVideo(reps),
          audio: pickBestAudio(reps),
          prog: (f.progressive_urls || []).filter((p) => p.progressive_url).map((p) => ({ q: p.metadata && p.metadata.quality, url: p.progressive_url })),
          hls: (f.hls_playlist_urls || []).map((h) => h.hls_playlist_url || h.url || JSON.stringify(h)).filter(Boolean),
        };
      }
      for (const k in o) walk(o[k]);
    };
    roots.forEach(walk);
    return rec;
  }

  // Zdjęcie ze strony /photo/?fbid=ID (window.__PX z sesji): największy obraz; zapasowo <img> z DOM.
  function extractPhoto(fbid) {
    let best = null;
    const walk = (o) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (o.id === fbid) {
        for (const k of ['image', 'viewer_image', 'photo_image']) {
          const im = o[k];
          if (im && im.uri && (!best || (im.width || 0) > (best.width || 0))) best = { uri: im.uri, width: im.width, height: im.height };
        }
      }
      for (const k in o) walk(o[k]);
    };
    for (const s of pageScripts(document)) { try { walk(JSON.parse(s)); } catch { /* ignoruj */ } }
    if (!best) {
      const img = document.querySelector('img[data-visualcompletion="media-vc-image"]');
      if (img) best = { uri: img.src, width: img.naturalWidth, height: img.naturalHeight, dom: true };
    }
    return best;
  }

  // Strona albumu /media/set/?set=pcb.POST : identyfikatory zdjęć z linków fbid=.
  async function extractSetLinks() {
    await sleep(3000);
    for (let i = 0; i < 5; i++) { root.scrollTo(0, document.body.scrollHeight); await sleep(1500); }
    return [...new Set([...document.querySelectorAll('a[href*="fbid="]')]
      .map((a) => (a.href.match(/fbid=(\d+)/) || [])[1]).filter(Boolean))];
  }

  function finish() {
    const hd = ss.get('__fbx_hd', null);
    if (!hd) { log('Brak danych kroku 2 w tej karcie (sessionStorage). Zacznij od osi czasu.'); return; }
    offerDownload('pznowak-fb-hd.json', hd);
    log('hd-sources gotowe: dash', hd.dash.length, '| hd', Object.keys(hd.hd).length, '| photos', Object.keys(hd.photos).length,
      '| albums', Object.keys(hd.albums).length);
  }

  async function runStep() {
    const queue = ss.get('__fbx_queue', []);
    const hd = ss.get('__fbx_hd', null);
    if (!hd || !queue.length) { log('Kolejka pusta.'); finish(); return; }

    await sleep(2500); // strona musi dołożyć dane do <script>
    const u = new URL(location.href);
    const reel = u.pathname.match(/^\/reel\/(\d+)/);
    const fbid = u.pathname.startsWith('/photo') ? u.searchParams.get('fbid') : null;
    const set = u.pathname.startsWith('/media/set') ? (u.searchParams.get('set') || '').replace(/^pcb\./, '') : null;

    let idx = -1;
    if (reel) {
      idx = queue.findIndex((q) => q.t === 'reel' && q.id === reel[1]);
      if (idx >= 0) { hd.hd[reel[1]] = extractReel(reel[1]); log('film', reel[1], hd.hd[reel[1]] ? 'ok' : 'brak danych'); }
    } else if (fbid) {
      idx = queue.findIndex((q) => q.t === 'photo' && q.id === fbid);
      if (idx >= 0) { hd.photos[fbid] = extractPhoto(fbid); log('zdjęcie', fbid, hd.photos[fbid] ? hd.photos[fbid].width + 'x' + hd.photos[fbid].height : 'brak'); }
    } else if (set) {
      idx = queue.findIndex((q) => q.t === 'set' && q.post === set);
      if (idx >= 0) {
        const links = await extractSetLinks();
        hd.albums[set] = links;
        queue.push(...links.map((id) => ({ t: 'photo', id, post: set })));
        log('album', set, 'zdjęć:', links.length);
      }
    }
    if (idx < 0) {
      log('Ta strona nie pasuje do kolejki. Następna w kolejce:', nextUrl(queue[0]));
      root.fbExport = { next: () => location.assign(nextUrl(queue[0])), finish };
      return;
    }
    queue.splice(idx, 1);
    ss.set('__fbx_hd', hd);
    ss.set('__fbx_queue', queue);

    if (!queue.length) { log('Kolejka skończona.'); finish(); return; }
    log('Zostało stron:', queue.length, '- za chwilę przejście na następną; potem wklej skrypt ponownie.');
    await sleep(STEP_DELAY_MS);
    location.assign(nextUrl(queue[0]));
  }

  async function main() {
    const p = location.pathname;
    const onTimeline = /^\/(profile\.php|people\/)/.test(p) && (location.search.includes(PAGE_ID) || p.includes(PAGE_ID));
    const hasQueue = (ss.get('__fbx_queue', []) || []).length > 0;
    if (onTimeline) return runTimeline();
    if (hasQueue) return runStep();
    log('Otwórz oś czasu fanpage\'a: https://www.facebook.com/profile.php?id=' + PAGE_ID + ' i wklej skrypt tam.');
    return undefined;
  }

  // W przeglądarce skrypt uruchamia się sam po wklejeniu; w Node (test) tylko eksportuje funkcje.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      parseRootsFromTexts, parsePosts, buildVideoMap, buildAlbumCounts, buildPostRecords, filterSince,
      parseManifestXml, pickBestVideo, pickBestAudio, buildDash,
    };
  } else {
    main().catch((e) => console.error('[fb_export] BŁĄD:', e));
  }
})();

/*
 * TODO (nieodtworzone z sesji 25.10) - lista zbiorcza:
 *  - Jak Chrome zapisał plik (w sesji: Pulpit ~/Desktop lub Pobrane, zależnie od ustawień przeglądarki) - nie wynika z kodu;
 *    instrukcja w FB_EXPORT.md każe po prostu przenieść plik do data/facebook/.
 *  - Zamykanie okna logowania/ciasteczek na FB zrobiono w sesji ręcznie (klik myszą), tu też trzeba ręcznie.
 *  - Film bez żadnego wpisu na osi czasu (w sesji: moissanit 2045599429641464) dostawał ręczną łatkę w download_hd.py
 *    (video_post.setdefault). Tu jest ogólnie obsłużony przez kolejkę kroku 2, ale post_id trzeba znać z posts.json.
 *  - Przyczyna, dla której 55 z 256 wykrytych rekordów nie miało daty (time=null), nie jest znana; w posts.json zostało 2 takie.
 *  - Krok 2 w sesji szedł automatycznie (narzędzie przeglądarkowe nawigowało i uruchamiało kod na każdej stronie);
 *    w konsoli nawigacja kasuje skrypt, więc wklejasz go ponownie po każdej stronie (stąd tryb przyrostowy: mało stron).
 *  - Pole bestAvc w hd-sources.json było w sesji zawsze null (żaden film nie miał kodeka avc); zostawione dla zgodności formatu.
 *  - Próba pobrania manifestów przez fetch(manifest_url) w sesji nie dała wyników (0 adresów) - nie jest tu użyta.
 */
