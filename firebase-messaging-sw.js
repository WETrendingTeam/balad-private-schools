/* BALAD PRIVATE SCHOOLS — unified PWA + Firebase Messaging service worker */
const CACHE_NAME = "balad-pwa-v3";
const HERO_ASSETS = [
  "/images/balad-hero-slide-1.png",
  "/images/Graduation%281%29.JPG",
  "/images/Competition%20%281%29.JPG",
  "/images/Inter%20house%20sport%20%281%29.JPG",
  "/images/school-building1.jpg"
];
const CORE_ASSETS = ["/", "/index.html", "/manifest.json", "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png", "/favicon.png", ...HERO_ASSETS];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(CORE_ASSETS.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request).then(cached => cached || caches.match("/index.html")))
    );
    return;
  }

  if (HERO_ASSETS.some(path => url.pathname === new URL(path, self.location.origin).pathname)) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }))
    );
  }
});

// Firebase Messaging support. Wrapped so a missing/unfinished Firebase config
// cannot break the PWA cache/navigation service worker.
try {
  importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js");
  firebase.initializeApp({
    apiKey: "PASTE_BALAD_FIREBASE_API_KEY",
    authDomain: "PASTE_BALAD_PROJECT_ID.firebaseapp.com",
    projectId: "PASTE_BALAD_PROJECT_ID",
    storageBucket: "PASTE_BALAD_STORAGE_BUCKET",
    messagingSenderId: "PASTE_BALAD_MESSAGING_SENDER_ID",
    appId: "PASTE_BALAD_APP_ID"
  });
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(payload => {
    const notification = payload.notification || {};
    const title = notification.title || "BALAD Private Schools";
    self.registration.showNotification(title, {
      body: notification.body || "You have a new BALAD notification.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { link: notification.click_action || "/index.html" }
    });
  });
} catch (error) {
  // Notification Firebase is configured separately; PWA still works without it.
}

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification?.data?.link || "/index.html";
  event.waitUntil(clients.matchAll({type:"window", includeUncontrolled:true}).then(list => {
    for (const client of list) {
      if ("navigate" in client) { client.navigate(target); return client.focus(); }
    }
    return clients.openWindow ? clients.openWindow(target) : undefined;
  }));
});
