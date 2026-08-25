/* 考研上岸工作台 Service Worker —— 缓存应用外壳，支持离线打开 */
const CACHE = 'ky-workbench-v1'
const CORE = [
  '/kaoyan-workbench/',
  '/kaoyan-workbench/index.html',
  '/kaoyan-workbench/manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {})
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// 网络优先，失败回退缓存；导航请求回退到首页（SPA）
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (!url.origin.startsWith(self.location.origin)) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/kaoyan-workbench/index.html', copy))
          return res
        })
        .catch(() => caches.match('/kaoyan-workbench/index.html'))
    )
    return
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy))
        return res
      })
      .catch(() => caches.match(req))
  )
})