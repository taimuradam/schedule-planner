// Lets the planner open without internet. The page itself is fetched fresh
// whenever there's a connection, so updates still arrive, and the last copy
// is used offline. Built files have unique names, so those come from the cache.

const CACHE = 'planner'
const ASSET = /^\/assets\//

/** The page plus every built file it links to. */
async function cachePage(cache, response) {
  const html = await response.clone().text()
  const files = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1])
  await cache.put('/', response)
  await Promise.all(files.map((f) => cache.add(f).catch(() => undefined)))
  // Drop built files from older versions of the app.
  for (const request of await cache.keys()) {
    const path = new URL(request.url).pathname
    if (ASSET.test(path) && !files.includes(path)) await cache.delete(request)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => cachePage(cache, await fetch('/', { cache: 'no-cache' }))),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cachePage(cache, response.clone()))
          return response
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // Everything else (built files, icons, the manifest) comes from the cache
  // when it's there, and is refreshed in the background for next time.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // Module scripts are requested with an Origin header the cached copies
      // weren't, so ignore Vary or they'd never match.
      const cached = await cache.match(request, { ignoreVary: true })
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone())
          return response
        })
        .catch(() => cached)
      return cached ?? fresh
    }),
  )
})
