const cacheName = "home-rhythm-shell-v1.2.1";
const shellFiles = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./notifications.js",
  "./schedule.js",
  "./seeds.js",
  "./google-calendar.js",
  "./firebase-repository.js",
  "./manifest.webmanifest",
  "./icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) =>
      cache.addAll(shellFiles.map((url) => new Request(url, { cache: "reload" }))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Home Rhythm", {
      body: data.body || "Your household update is ready.",
      tag: data.tag || "home-rhythm-daily",
      icon: new URL("./icon.svg", self.location).href,
      badge: new URL("./icon.svg", self.location).href,
      data: { url: new URL("./#tasks", self.location).href },
      renotify: false,
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL("./#tasks", self.location).href;
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        const scope = new URL("./", self.location).href;
        const existing = windows.find((w) => w.url.startsWith(scope));
        if (existing) {
          await existing.navigate(url);
          return existing.focus();
        }
        return clients.openWindow(url);
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== cacheName)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request, { cache: "no-cache" })
      .then((response) => {
        const copy = response.clone();
        if (response.ok)
          caches.open(cacheName).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return request.mode === "navigate"
            ? caches.match("./index.html")
            : Response.error();
        }),
      ),
  );
});
