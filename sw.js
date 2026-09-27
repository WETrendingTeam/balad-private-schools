/* BALAD PRIVATE SCHOOLS — PWA + Firebase Messaging service worker */
const CACHE_NAME = "balad-pwa-v1";
const OFFLINE_URL = "/index.html";

const APP_SHELL = [
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* Keep normal website pages fresh: network first, cache as fallback. */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached =>
          cached || (event.request.mode === "navigate" ? caches.match(OFFLINE_URL) : Response.error())
        )
      )
  );
});

/* Firebase Cloud Messaging support.
   The existing BALAD notification config is supplied by the notification page. */
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js");

/*
 * Keep this config in sync with balad-notifications/balad-notification-config.js.
 * Until that separate BALAD notification Firebase project is configured,
 * background messaging simply won't be active.
 */
try {
  firebase.initializeApp({
    apiKey: "PASTE_BALAD_FIREBASE_API_KEY",
    authDomain: "PASTE_BALAD_PROJECT_ID.firebaseapp.com",
    projectId: "PASTE_BALAD_PROJECT_ID",
    storageBucket: "PASTE_BALAD_STORAGE_BUCKET",
    messagingSenderId: "PASTE_BALAD_MESSAGING_SENDER_ID",
    appId: "PASTE_BALAD_APP_ID"
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    const title = notification.title || "BALAD Private Schools";
    const options = {
      body: notification.body || "You have a new BALAD notification.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { link: notification.click_action || "/index.html" }
    };
    self.registration.showNotification(title, options);
  });
} catch (error) {
  // PWA remains functional even before the separate notification Firebase project is configured.
  console.warn("BALAD background messaging is not configured yet.", error);
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification?.data?.link || "/index.html";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client && client.url !== target) {
            client.navigate(target);
          }
          return client.focus();
        }
      }
      return clients.openWindow ? clients.openWindow(target) : undefined;
    })
  );
});
