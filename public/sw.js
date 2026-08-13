const CACHE_PREFIX = 'scp-reading-atlas-'
const CACHE = `${CACHE_PREFIX}v4`
const LEGACY_CACHES = new Set(['scp-v1'])
const SCOPE_URL = new URL(self.registration.scope)
const BASE_PATH = SCOPE_URL.pathname.replace(/\/$/, '')
const scopeAsset = path => new URL(path.replace(/^\//, ''), SCOPE_URL).href

function manifestAssets(manifest) {
  const paths = new Set()

  for (const entry of Object.values(manifest)) {
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.file === 'string') paths.add(entry.file)
    for (const key of ['css', 'assets']) {
      if (!Array.isArray(entry[key])) continue
      for (const path of entry[key]) {
        if (typeof path === 'string') paths.add(path)
      }
    }
  }

  return [...paths].map(scopeAsset)
}

async function fetchForPrecache(url, cacheMode = 'default') {
  const response = await fetch(url, { cache: cacheMode })
  if (!response.ok) {
    throw new Error(`Precache request failed (${response.status}): ${url}`)
  }
  return response
}

async function precacheBuild() {
  const manifestUrl = scopeAsset('asset-manifest.json')
  const manifestResponse = await fetchForPrecache(manifestUrl, 'no-store')
  const manifest = await manifestResponse.clone().json()
  const urls = new Set([
    SCOPE_URL.href,
    scopeAsset('index.html'),
    manifestUrl,
    scopeAsset('manifest.json'),
    scopeAsset('icon.svg'),
    scopeAsset('icon-maskable.svg'),
    ...manifestAssets(manifest),
  ])
  const cache = await caches.open(CACHE)

  // Fetch every required response before committing it to the cache. A failed
  // asset rejects installation, keeping an older complete worker active rather
  // than activating a partially-offline release.
  const responses = await Promise.all(
    [...urls].map(async url => [
      url,
      url === manifestUrl ? manifestResponse : await fetchForPrecache(url),
    ])
  )
  await Promise.all(responses.map(([url, response]) => cache.put(url, response)))
}

self.addEventListener('install', event => {
  event.waitUntil(precacheBuild().then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => (
            (key.startsWith(CACHE_PREFIX) && key !== CACHE)
            || LEGACY_CACHES.has(key)
          ))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

function isInAppScope(url) {
  if (url.origin !== SCOPE_URL.origin) return false
  if (!BASE_PATH) return true
  return url.pathname === BASE_PATH || url.pathname.startsWith(`${BASE_PATH}/`)
}

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET' || !isInAppScope(new URL(request.url))) return

  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(async response => {
          if (response.ok) {
            const cache = await caches.open(CACHE)
            await cache.put(request, response.clone())
          }
          return response
        })
        .catch(async () => (
          await caches.match(request)
          ?? await caches.match(scopeAsset('index.html'))
          ?? await caches.match(SCOPE_URL.href)
          ?? new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        ))
    )
    return
  }

  event.respondWith(
    caches.match(request).then(async cached => {
      if (cached) return cached

      try {
        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(CACHE)
          await cache.put(request, response.clone())
        }
        return response
      } catch {
        return new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }
    })
  )
})
