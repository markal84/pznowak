// Test offline fb_export.js: syntetyczna (zanonimizowana) odpowiedź w kształcie z sesji 25.10.2026.
// Uruchomienie: node --test scripts/facebook/fb_export.test.cjs
// Jeśli istnieje data/facebook/posts.json, dodatkowo porównuje zestaw kluczy z prawdziwym plikiem.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const fx = require('./fb_export.js');

const POST_KEYS = ['post_id', 'time', 'date', 'url', 'text', 'albumCount', 'photos', 'videos'];
const PHOTO_KEYS = ['id', 'uri', 'w', 'h'];
const VIDEO_KEYS = ['id', 'url', 'quality', 'thumb'];

// Dwa wiersze odpowiedzi GraphQL (jak w kodzie z sesji: kilka linii JSON, pierwsza z prefiksem for (;;);).
const post1 = {
  data: { node: { post_id: '111', creation_time: 1790000000, url: 'https://example.invalid/post/111',
    message: { text: 'Pierścionek testowy' },
    attachments: [{ media: { __typename: 'Photo', id: 'p1',
      viewer_image: { uri: 'https://example.invalid/small.jpg', width: 600, height: 400 },
      image: { uri: 'https://example.invalid/big.jpg', width: 2048, height: 1366 } },
    all_subattachments: { count: 3, nodes: [{ media: { __typename: 'Photo', id: 'p2', image: { uri: 'https://example.invalid/p2.jpg', width: 1600, height: 1066 } } }] } }] } },
};
const post2 = {
  data: { node: { post_id: '222', creation_time: 1791000000, wwwURL: 'https://example.invalid/reel/v1/', message: { text: 'Film' },
    attachments: [{ media: { __typename: 'Video', id: 'v1', thumbnailImage: { uri: 'https://example.invalid/t.jpg' },
      videoDeliveryResponseFragment: { videoDeliveryResponseResult: {
        progressive_urls: [{ progressive_url: 'https://example.invalid/sd.mp4', metadata: { quality: 'SD' } }, { progressive_url: 'https://example.invalid/hd.mp4', metadata: { quality: 'HD' } }],
        dash_manifests: [] } } } }] } },
};
const texts = ['for (;;);' + JSON.stringify(post1) + '\n' + JSON.stringify(post2)];

test('składanie rekordów ma format posts.json', () => {
  const roots = fx.parseRootsFromTexts(texts);
  const recs = fx.buildPostRecords(fx.parsePosts(roots), fx.buildVideoMap(roots), fx.buildAlbumCounts(roots));
  assert.strictEqual(recs.length, 2);
  const a = recs.find((r) => r.post_id === '111');
  const b = recs.find((r) => r.post_id === '222');
  assert.deepStrictEqual(Object.keys(a), POST_KEYS);
  assert.deepStrictEqual(Object.keys(a.photos[0]), PHOTO_KEYS);
  assert.strictEqual(a.photos.find((p) => p.id === 'p1').uri, 'https://example.invalid/big.jpg'); // wybór największego
  assert.strictEqual(a.albumCount, 3);
  assert.strictEqual(a.date, '2026-09-21T14:13:20.000Z');
  assert.strictEqual(a.text, 'Pierścionek testowy');
  assert.deepStrictEqual(Object.keys(b.videos[0]), VIDEO_KEYS);
  assert.strictEqual(b.videos[0].url, 'https://example.invalid/hd.mp4');
  assert.strictEqual(b.videos[0].quality, 'HD');
  assert.strictEqual(b.url, 'https://example.invalid/reel/v1/');
});

test('tryb przyrostowy zostawia posty od daty i bez daty', () => {
  const recs = [{ time: 100 }, { time: 2000000000 }, { time: null }];
  assert.strictEqual(fx.filterSince(recs, '').length, 3);
  assert.deepStrictEqual(fx.filterSince(recs, '2030-01-01').map((r) => r.time), [2000000000, null]);
  assert.throws(() => fx.filterSince(recs, 'wczoraj'));
});

test('wybór najlepszego wideo i audio', () => {
  const reps = [
    { kind: 'video', codecs: 'vp09', bw: 1, w: 576, h: 1024, url: 'a' },
    { kind: 'video', codecs: 'vp09', bw: 2, w: 1080, h: 1920, url: 'b' },
    { kind: 'audio', codecs: 'mp4a', bw: 5, w: 0, h: 0, url: 'c' },
    { kind: 'audio', codecs: 'mp4a', bw: 9, w: 0, h: 0, url: 'd' },
  ];
  assert.strictEqual(fx.pickBestVideo(reps).url, 'b');
  assert.strictEqual(fx.pickBestAudio(reps).url, 'd');
  assert.strictEqual(fx.pickBestVideo([]), null);
});

test('zestaw kluczy zgadza się z prawdziwym posts.json (jeśli jest lokalnie)', (t) => {
  const f = path.join(__dirname, '..', '..', 'data', 'facebook', 'posts.json');
  if (!fs.existsSync(f)) return t.skip('brak data/facebook/posts.json');
  const real = JSON.parse(fs.readFileSync(f, 'utf8')).posts[0];
  assert.deepStrictEqual(Object.keys(real), POST_KEYS);
});
