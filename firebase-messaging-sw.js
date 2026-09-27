/* BALAD PRIVATE SCHOOLS — combined PWA + Firebase Cloud Messaging service worker */
const CACHE_NAME = "balad-pwa-v2";
const OFFLINE_URL = "/index.html";
const APP_SHELL = ["/index.html","/manifest.json","/icon-192.png","/icon-512.png","/apple-touch-icon.png","/favicon.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("balad-pwa-") && k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response && response.ok) event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone())));
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || (event.request.mode === "navigate" ? caches.match(OFFLINE_URL) : Response.error()))));
});
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js");
try {
  firebase.initializeApp({apiKey:"PASTE_BALAD_FIREBASE_API_KEY",authDomain:"PASTE_BALAD_PROJECT_ID.firebaseapp.com",projectId:"PASTE_BALAD_PROJECT_ID",storageBucket:"PASTE_BALAD_STORAGE_BUCKET",messagingSenderId:"PASTE_BALAD_MESSAGING_SENDER_ID",appId:"PASTE_BALAD_APP_ID"});
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage(payload => {
    const n = payload.notification || {};
    self.registration.showNotification(n.title || "BALAD Private Schools", {body:n.body || "You have a new BALAD notification.",icon:"/icon-192.png",badge:"/icon-192.png",data:{link:n.click_action || "/index.html"}});
  });
} catch (error) { console.warn("BALAD Firebase messaging is not configured yet.", error); }
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification?.data?.link || "/index.html";
  event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list => { for (const client of list) { if ("focus" in client) { if ("navigate" in client && client.url !== target) client.navigate(target); return client.focus(); } } return clients.openWindow ? clients.openWindow(target) : undefined; }));
});
