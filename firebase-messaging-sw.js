/* BALAD PRIVATE SCHOOLS — Firebase Cloud Messaging service worker
 * This file is NEW. It does not replace or edit any existing BALAD service worker.
 * Paste the SAME separate BALAD notification Firebase Web App config below.
 */

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

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || "BALAD Private Schools";
  const options = {
    body: notification.body || "You have a new BALAD notification.",
    icon: "/icons/balad-logo-192.png",
    badge: "/icons/balad-logo-192.png",
    data: { link: notification.click_action || "/index.html" }
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification?.data?.link || "/index.html";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
      return undefined;
    })
  );
});
