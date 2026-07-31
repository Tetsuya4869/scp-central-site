const CACHE = 'scp-v1'
const BASE = '/scp-central-site'

// キャッシュするアセット（ビルド後のファイル名はハッシュ付きなのでパターンで判断）
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll([BASE + '/', BASE + '/index.html']))
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const { request } = e
  // POST などは無視
  if (request.method !== 'GET') return

  // HTML リクエスト: ネットワーク優先、失敗時キャッシュ
  if (request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(
      fetch(request)
        .then(r => { caches.open(CACHE).then(c => c.put(request, r.clone())); return r })
        .catch(() => caches.match(request).then(r => r ?? caches.match(BASE + '/index.html')))
    )
    return
  }

  // JS/CSS/JSON アセット: キャッシュ優先、なければネットワーク取得 & キャッシュ保存
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached
      return fetch(request).then(r => {
        if (r.ok) caches.open(CACHE).then(c => c.put(request, r.clone()))
        return r
      })
    })
  )
})
